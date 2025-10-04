import axios from 'axios';
import prisma from '../config/database';
import config from '../config';
import { CheckStatus } from '@prisma/client';
import { telegramService } from './telegram.service';
import { sslService } from './ssl.service';
import { ipService } from './ip.service';

class MonitoringService {
  async checkWebsite(url: string): Promise<{
    status: CheckStatus;
    responseTime: number | null;
    statusCode: number | null;
    errorMessage: string | null;
    sslValid: boolean | null;
    sslExpiresAt: Date | null;
    sslIssuer: string | null;
    sslDaysLeft: number | null;
  }> {
    const startTime = Date.now();

    try {
      // Проверяем SSL (параллельно с HTTP запросом для HTTPS)
      const sslCheckPromise = url.startsWith('https://') 
        ? sslService.checkSSL(url) 
        : Promise.resolve(null);

      const response = await axios.get(url, {
        timeout: config.monitoring.requestTimeoutMs,
        validateStatus: () => true, // Не бросать ошибку на любой статус
      });

      const responseTime = Date.now() - startTime;
      const statusCode = response.status;
      const sslInfo = await sslCheckPromise;

      // Считаем сайт онлайн если статус код 2xx или 3xx
      const isOnline = statusCode >= 200 && statusCode < 400;

      // Если есть SSL ошибка для HTTPS сайта, добавляем к сообщению об ошибке
      let errorMessage = isOnline ? null : `HTTP ${statusCode}`;
      if (sslInfo && !sslInfo.valid && sslInfo.error) {
        errorMessage = errorMessage 
          ? `${errorMessage}; SSL: ${sslInfo.error}` 
          : `SSL: ${sslInfo.error}`;
      }

      return {
        status: isOnline ? CheckStatus.ONLINE : CheckStatus.OFFLINE,
        responseTime,
        statusCode,
        errorMessage,
        sslValid: sslInfo?.valid || null,
        sslExpiresAt: sslInfo?.expiresAt || null,
        sslIssuer: sslInfo?.issuer || null,
        sslDaysLeft: sslInfo?.daysLeft || null,
      };
    } catch (error: any) {
      const responseTime = Date.now() - startTime;

      // Определяем тип ошибки
      const errorCode = error.code;
      let errorMessage = error.message || 'Неизвестная ошибка';

      // Timeout, connection refused, network errors = OFFLINE
      const offlineErrors = [
        'ECONNABORTED',    // Timeout
        'ECONNREFUSED',    // Connection refused
        'ECONNRESET',      // Connection reset
        'ETIMEDOUT',       // Connection timeout
        'ENETUNREACH',     // Network unreachable
        'EHOSTUNREACH',    // Host unreachable
      ];

      const isOffline = offlineErrors.includes(errorCode) || 
                        errorMessage.includes('timeout') ||
                        errorMessage.includes('ECONNABORTED');

      // Проверяем, является ли ошибка SSL-связанной
      const sslErrorCodes = [
        'CERT_HAS_EXPIRED',
        'DEPTH_ZERO_SELF_SIGNED_CERT',
        'SELF_SIGNED_CERT_IN_CHAIN',
        'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
        'UNABLE_TO_GET_ISSUER_CERT',
        'UNABLE_TO_GET_ISSUER_CERT_LOCALLY',
        'ERR_TLS_CERT_ALTNAME_INVALID',
      ];

      const isSSLError = sslErrorCodes.includes(errorCode) ||
                         errorMessage.toLowerCase().includes('certificate') ||
                         errorMessage.toLowerCase().includes('ssl') ||
                         errorMessage.toLowerCase().includes('tls');

      // Для SSL ошибок определяем конкретный текст
      let sslValid: boolean | null = null;
      let sslErrorText: string | null = null;

      if (url.startsWith('https://') && isSSLError) {
        sslValid = false;
        
        if (errorCode === 'CERT_HAS_EXPIRED' || errorMessage.includes('certificate has expired')) {
          sslErrorText = 'Сертификат истек';
        } else if (errorCode === 'DEPTH_ZERO_SELF_SIGNED_CERT' || errorCode === 'SELF_SIGNED_CERT_IN_CHAIN') {
          sslErrorText = 'Сертификат не доверенный';
        } else if (errorCode === 'ERR_TLS_CERT_ALTNAME_INVALID' || errorMessage.includes('Hostname/IP does not match')) {
          sslErrorText = 'Сертификат не соответствует домену';
        } else if (errorMessage.includes('certificate')) {
          sslErrorText = 'Проблема с сертификатом';
        } else {
          sslErrorText = 'SSL ошибка';
        }

        errorMessage = `SSL: ${sslErrorText}`;
      } else if (isOffline) {
        errorMessage = 'Сайт недоступен (timeout)';
      }

      return {
        status: isOffline ? CheckStatus.OFFLINE : CheckStatus.ERROR,
        responseTime,
        statusCode: null,
        errorMessage,
        sslValid,
        sslExpiresAt: null,
        sslIssuer: null,
        sslDaysLeft: null,
      };
    }
  }

  async checkAllActiveWebsites(): Promise<void> {
    console.log('🔍 Начало проверки всех активных сайтов...');

    const websites = await prisma.website.findMany({
      where: { isActive: true },
      include: {
        user: true,
        statusChecks: {
          orderBy: { checkedAt: 'desc' },
          take: 1,
        },
      },
    });

    for (const website of websites) {
      try {
        // Проверка интервала (пропускаем если еще рано)
        const lastCheck = website.statusChecks[0];
        if (lastCheck) {
          const minutesSinceLastCheck =
            (Date.now() - lastCheck.checkedAt.getTime()) / (1000 * 60);
          if (minutesSinceLastCheck < website.checkInterval) {
            continue;
          }
        }

        console.log(`Проверка: ${website.name} (${website.url})`);

        const result = await this.checkWebsite(website.url);

        // Сохранение результата
        await prisma.statusCheck.create({
          data: {
            websiteId: website.id,
            status: result.status,
            responseTime: result.responseTime,
            statusCode: result.statusCode,
            errorMessage: result.errorMessage,
            sslValid: result.sslValid,
            sslExpiresAt: result.sslExpiresAt,
            sslIssuer: result.sslIssuer,
            sslDaysLeft: result.sslDaysLeft,
          },
        });

        console.log(
          `✓ ${website.name}: ${result.status} (${result.responseTime}ms)`
        );

        // Проверка на изменение статуса и отправка уведомлений
        const previousStatus = lastCheck?.status;
        const currentStatus = result.status;

        if (previousStatus && previousStatus !== currentStatus) {
          await this.handleStatusChange(website, previousStatus, currentStatus);
        }
      } catch (error) {
        console.error(`Ошибка при проверке ${website.name}:`, error);
      }
    }

    console.log('✓ Проверка завершена\n');
  }

  private async handleStatusChange(
    website: any,
    previousStatus: CheckStatus,
    currentStatus: CheckStatus
  ): Promise<void> {
    // Отправка уведомления если статус изменился
    const isGoingDown =
      previousStatus === CheckStatus.ONLINE &&
      (currentStatus === CheckStatus.OFFLINE || currentStatus === CheckStatus.ERROR);
    const isGoingUp =
      (previousStatus === CheckStatus.OFFLINE || previousStatus === CheckStatus.ERROR) &&
      currentStatus === CheckStatus.ONLINE;

    if (isGoingDown && website.notifyOnDown && website.user.notificationsEnabled) {
      await telegramService.sendAlert(website, currentStatus, 'down');
    } else if (isGoingUp && website.notifyOnUp && website.user.notificationsEnabled) {
      await telegramService.sendAlert(website, currentStatus, 'up');
    }
  }

  async checkSingleWebsite(websiteId: string): Promise<void> {
    const website = await prisma.website.findUnique({
      where: { id: websiteId },
      include: {
        user: true,
        statusChecks: {
          orderBy: { checkedAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!website) {
      throw new Error('Сайт не найден');
    }

    const result = await this.checkWebsite(website.url);

    await prisma.statusCheck.create({
      data: {
        websiteId: website.id,
        status: result.status,
        responseTime: result.responseTime,
        statusCode: result.statusCode,
        errorMessage: result.errorMessage,
        sslValid: result.sslValid,
        sslExpiresAt: result.sslExpiresAt,
        sslIssuer: result.sslIssuer,
        sslDaysLeft: result.sslDaysLeft,
      },
    });

    const lastCheck = website.statusChecks[0];
    if (lastCheck && lastCheck.status !== result.status) {
      await this.handleStatusChange(website, lastCheck.status, result.status);
    }

    // Обновляем IP и хостинг информацию, если она отсутствует или старая (раз в день)
    const shouldUpdateIPInfo = !website.ipAddress || 
      (Date.now() - website.updatedAt.getTime()) > 24 * 60 * 60 * 1000;

    if (shouldUpdateIPInfo) {
      const ipInfo = await ipService.getIPAndHosting(website.url);
      if (ipInfo.ip) {
        await prisma.website.update({
          where: { id: websiteId },
          data: {
            ipAddress: ipInfo.ip,
            hosting: ipInfo.hosting,
          },
        });
      }
    }
  }
}

export const monitoringService = new MonitoringService();
