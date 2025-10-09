import cron from 'node-cron';
import { monitoringService } from './monitoring.service';
import { domainService } from './domain.service';
import { telegramService } from './telegram.service';
import prisma from '../config/database';
import { DomainStatus } from '@prisma/client';

class CronService {
  private monitoringJob: cron.ScheduledTask | null = null;
  private domainCheckJob: cron.ScheduledTask | null = null;
  private dailyWebsiteReportJob: cron.ScheduledTask | null = null;
  private dailyDomainReportJob: cron.ScheduledTask | null = null;

  /**
   * Удаляет старые записи проверок домена, оставляя только последние 50
   */
  private async cleanOldDomainChecks(domainId: string): Promise<void> {
    const checks = await prisma.domainCheck.findMany({
      where: { domainId },
      orderBy: { checkedAt: 'desc' },
      select: { id: true },
    });

    // Если записей больше 50, удаляем старые
    if (checks.length > 50) {
      const idsToKeep = checks.slice(0, 50).map(c => c.id);
      await prisma.domainCheck.deleteMany({
        where: {
          domainId,
          id: { notIn: idsToKeep },
        },
      });
      console.log(`🗑️  Удалено ${checks.length - 50} старых записей для домена ${domainId}`);
    }
  }

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

    // Проверка доменов раз в день в 08:50 MSK (05:50 UTC) перед отправкой отчетов
    this.domainCheckJob = cron.schedule('50 5 * * *', async () => {
      try {
        await this.checkAllActiveDomains();
      } catch (error) {
        console.error('Ошибка в cron задаче проверки доменов:', error);
      }
    });

    // Ежедневный отчет по сайтам в 09:00 MSK (06:00 UTC)
    this.dailyWebsiteReportJob = cron.schedule('0 6 * * *', async () => {
      try {
        console.log('📊 Запуск ежедневной отправки отчетов по сайтам...');
        await this.sendDailyWebsiteReports();
      } catch (error) {
        console.error('Ошибка в cron задаче ежедневного отчета по сайтам:', error);
      }
    });

    // Ежедневный отчет по доменам в 09:00 MSK (06:00 UTC)
    this.dailyDomainReportJob = cron.schedule('0 6 * * *', async () => {
      try {
        console.log('🌐 Запуск ежедневной отправки отчетов по доменам...');
        await this.sendDailyDomainReports();
      } catch (error) {
        console.error('Ошибка в cron задаче ежедневного отчета по доменам:', error);
      }
    });

    console.log('✓ Cron задачи запущены');
    console.log(`  - Мониторинг сайтов: каждую минуту`);
    console.log(`  - Проверка доменов: каждый день в 08:50 MSK`);
    console.log(`  - Ежедневный отчет по сайтам: каждый день в 09:00 MSK`);
    console.log(`  - Ежедневный отчет по доменам: каждый день в 09:00 MSK`);
  }

  stop(): void {
    if (this.monitoringJob) {
      this.monitoringJob.stop();
    }
    if (this.domainCheckJob) {
      this.domainCheckJob.stop();
    }
    if (this.dailyWebsiteReportJob) {
      this.dailyWebsiteReportJob.stop();
    }
    if (this.dailyDomainReportJob) {
      this.dailyDomainReportJob.stop();
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

        // Очистка старых записей (оставляем только 50 последних)
        await this.cleanOldDomainChecks(domain.id);

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

  /**
   * Отправка ежедневных отчетов по сайтам всем пользователям
   */
  private async sendDailyWebsiteReports(): Promise<void> {
    const users = await prisma.user.findMany({
      where: {
        telegramChatId: { not: null },
        notificationsEnabled: true,
      },
      include: {
        websites: true,
      },
    });

    console.log(`📊 Найдено ${users.length} пользователей для отправки отчетов по сайтам`);

    let successCount = 0;
    let errorCount = 0;

    for (const user of users) {
      // Пропускаем пользователей без сайтов
      if (user.websites.length === 0) {
        console.log(`⏭️  Пользователь ${user.email} пропущен (нет сайтов)`);
        continue;
      }

      try {
        await telegramService.sendStatusReport(user.id);
        successCount++;
        console.log(`✓ Отчет отправлен пользователю: ${user.email}`);
      } catch (error: any) {
        errorCount++;
        console.error(`❌ Ошибка отправки отчета пользователю ${user.email}:`, error.message);
      }
    }

    console.log(`✓ Отправка завершена. Успешно: ${successCount}, Ошибок: ${errorCount}`);
  }

  /**
   * Отправка ежедневных отчетов по доменам всем пользователям
   */
  private async sendDailyDomainReports(): Promise<void> {
    const users = await prisma.user.findMany({
      where: {
        telegramChatId: { not: null },
        notificationsEnabled: true,
      },
      include: {
        domains: true,
      },
    });

    console.log(`🌐 Найдено ${users.length} пользователей для отправки отчетов по доменам`);

    let successCount = 0;
    let errorCount = 0;

    for (const user of users) {
      // Пропускаем пользователей без доменов
      if (user.domains.length === 0) {
        console.log(`⏭️  Пользователь ${user.email} пропущен (нет доменов)`);
        continue;
      }

      try {
        await telegramService.sendDomainReport(user.id);
        successCount++;
        console.log(`✓ Отчет отправлен пользователю: ${user.email}`);
      } catch (error: any) {
        errorCount++;
        console.error(`❌ Ошибка отправки отчета пользователю ${user.email}:`, error.message);
      }
    }

    console.log(`✓ Отправка завершена. Успешно: ${successCount}, Ошибок: ${errorCount}`);
  }
}

export const cronService = new CronService();
