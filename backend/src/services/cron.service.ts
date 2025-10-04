import cron from 'node-cron';
import { monitoringService } from './monitoring.service';
import { domainService } from './domain.service';
import { telegramService } from './telegram.service';
import prisma from '../config/database';
import { DomainStatus } from '@prisma/client';

class CronService {
  private monitoringJob: cron.ScheduledTask | null = null;
  private domainCheckJob: cron.ScheduledTask | null = null;

  start(): void {
    // Проверка сайтов каждую минуту
    // (сервис сам решает какие сайты проверять на основе checkInterval)
    this.monitoringJob = cron.schedule('* * * * *', async () => {
      try {
        await monitoringService.checkAllActiveWebsites();
      } catch (error) {
        console.error('Ошибка в cron задаче мониторинга:', error);
      }
    });

    // Проверка доменов каждый час
    // (сервис сам решает какие домены проверять на основе checkInterval)
    this.domainCheckJob = cron.schedule('0 * * * *', async () => {
      try {
        await this.checkAllActiveDomains();
      } catch (error) {
        console.error('Ошибка в cron задаче проверки доменов:', error);
      }
    });

    console.log('✓ Cron задачи запущены');
    console.log(`  - Мониторинг сайтов: каждую минуту`);
    console.log(`  - Проверка доменов: каждый час`);
  }

  stop(): void {
    if (this.monitoringJob) {
      this.monitoringJob.stop();
    }
    if (this.domainCheckJob) {
      this.domainCheckJob.stop();
    }
    console.log('Cron задачи остановлены');
  }

  private async checkAllActiveDomains(): Promise<void> {
    console.log('🔍 Начало проверки всех активных доменов...');

    const domains = await prisma.domain.findMany({
      where: { isActive: true },
      include: {
        user: true,
        domainChecks: {
          orderBy: { checkedAt: 'desc' },
          take: 1,
        },
      },
    });

    for (const domain of domains) {
      try {
        // Проверка интервала (пропускаем если еще рано)
        const lastCheck = domain.domainChecks[0];
        if (lastCheck) {
          const minutesSinceLastCheck =
            (Date.now() - lastCheck.checkedAt.getTime()) / (1000 * 60);
          if (minutesSinceLastCheck < domain.checkInterval) {
            continue;
          }
        }

        console.log(`Проверка домена: ${domain.name} (${domain.domain})`);

        const result = await domainService.checkDomain(domain.domain);

        // Сохранение результата
        await prisma.domainCheck.create({
          data: {
            domainId: domain.id,
            status: result.status,
            expiresAt: result.expiresAt,
            registrar: result.registrar,
            nameServers: result.nameServers,
            daysLeft: result.daysLeft,
            errorMessage: result.errorMessage,
          },
        });

        console.log(
          `✓ ${domain.name}: ${result.status} (истекает через ${result.daysLeft || 'N/A'} дней)`
        );

        // Проверка на критические изменения и отправка уведомлений
        const previousStatus = lastCheck?.status;
        const currentStatus = result.status;

        if (previousStatus && previousStatus !== currentStatus) {
          await this.handleDomainStatusChange(domain, previousStatus, currentStatus, result.daysLeft);
        } else if (
          domain.notifyOnExpiry && 
          result.daysLeft !== null && 
          result.daysLeft <= 30 &&
          domain.user.notificationsEnabled &&
          domain.user.telegramChatId
        ) {
          // Отправляем напоминание о скором истечении каждые 7 дней
          const shouldNotify = !lastCheck || 
            (Date.now() - lastCheck.checkedAt.getTime()) > 7 * 24 * 60 * 60 * 1000;

          if (shouldNotify) {
            await telegramService.sendDomainAlert(
              domain,
              result.status,
              result.daysLeft,
              result.expiresAt
            );
          }
        }
      } catch (error) {
        console.error(`Ошибка при проверке домена ${domain.name}:`, error);
      }
    }

    console.log('✓ Проверка доменов завершена\n');
  }

  private async handleDomainStatusChange(
    domain: any,
    _previousStatus: DomainStatus,
    currentStatus: DomainStatus,
    daysLeft: number | null
  ): Promise<void> {
    if (!domain.notifyOnExpiry || !domain.user.notificationsEnabled || !domain.user.telegramChatId) {
      return;
    }

    // Отправка уведомления если статус изменился на критический
    const isCritical =
      currentStatus === DomainStatus.EXPIRING_SOON ||
      currentStatus === DomainStatus.EXPIRED;

    if (isCritical) {
      const expiresAt = daysLeft !== null 
        ? new Date(Date.now() + daysLeft * 24 * 60 * 60 * 1000)
        : null;

      await telegramService.sendDomainAlert(
        domain,
        currentStatus,
        daysLeft,
        expiresAt
      );
    }
  }
}

export const cronService = new CronService();
