import TelegramBot from 'node-telegram-bot-api';
import config from '../config';
import { CheckStatus, DomainStatus } from '@prisma/client';
import prisma from '../config/database';

class TelegramService {
  private bot: TelegramBot | null = null;

  constructor() {
    if (config.telegram.botToken) {
      this.bot = new TelegramBot(config.telegram.botToken, { polling: false });
      console.log('✓ Telegram Bot инициализирован');
    } else {
      console.warn('⚠️ Telegram Bot Token не указан, уведомления отключены');
    }
  }

  async sendMessage(chatId: string, message: string): Promise<void> {
    if (!this.bot) {
      console.warn('Telegram Bot не инициализирован');
      return;
    }

    try {
      await this.bot.sendMessage(chatId, message, { parse_mode: 'HTML' });
    } catch (error) {
      console.error('Ошибка отправки сообщения в Telegram:', error);
    }
  }

  async sendAlert(
    website: any,
    status: CheckStatus,
    type: 'down' | 'up'
  ): Promise<void> {
    if (!website.user.telegramChatId) {
      return;
    }

    const emoji = type === 'down' ? '🔴' : '🟢';
    const statusText = type === 'down' ? 'НЕДОСТУПЕН' : 'ВОССТАНОВЛЕН';

    const message = `
${emoji} <b>${statusText}</b>

<b>Сайт:</b> ${website.name}
<b>URL:</b> ${website.url}
<b>Время:</b> ${new Date().toLocaleString('ru-RU')}
<b>Статус:</b> ${status}
    `.trim();

    await this.sendMessage(website.user.telegramChatId, message);
  }

  async sendDailySummary(userId: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        websites: {
          include: {
            statusChecks: {
              orderBy: { checkedAt: 'desc' },
              take: 1,
            },
          },
        },
      },
    });

    if (!user || !user.telegramChatId || !user.notificationsEnabled) {
      return;
    }

    const totalWebsites = user.websites.length;
    const onlineWebsites = user.websites.filter(
      (w) => w.statusChecks[0]?.status === CheckStatus.ONLINE
    ).length;
    const offlineWebsites = user.websites.filter(
      (w) =>
        w.statusChecks[0]?.status === CheckStatus.OFFLINE ||
        w.statusChecks[0]?.status === CheckStatus.ERROR
    ).length;

    const message = `
📊 <b>Ежедневный отчет</b>

<b>Всего сайтов:</b> ${totalWebsites}
🟢 <b>Онлайн:</b> ${onlineWebsites}
🔴 <b>Офлайн:</b> ${offlineWebsites}

<b>Дата:</b> ${new Date().toLocaleDateString('ru-RU')}
    `.trim();

    await this.sendMessage(user.telegramChatId, message);
  }

  async sendStatusReport(userId: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        websites: {
          include: {
            statusChecks: {
              orderBy: { checkedAt: 'desc' },
              take: 1,
            },
          },
        },
      },
    });

    if (!user || !user.telegramChatId) {
      return;
    }

    let message = '📊 <b>Статус всех сайтов</b>\n\n';

    for (const website of user.websites) {
      const lastCheck = website.statusChecks[0];
      const emoji =
        lastCheck?.status === CheckStatus.ONLINE
          ? '🟢'
          : lastCheck?.status === CheckStatus.OFFLINE
          ? '🔴'
          : '🟠';

      message += `${emoji} <b>${website.name}</b>\n`;
      message += `   ${website.url}\n`;
      if (lastCheck) {
        message += `   Статус: ${lastCheck.status}`;
        if (lastCheck.responseTime) {
          message += ` (${lastCheck.responseTime}ms)`;
        }
        message += '\n';
      }
      message += '\n';
    }

    message += `<i>Время: ${new Date().toLocaleString('ru-RU')}</i>`;

    await this.sendMessage(user.telegramChatId, message);
  }

  async sendDomainAlert(
    domain: any,
    status: DomainStatus,
    daysLeft: number | null,
    expiresAt: Date | null
  ): Promise<void> {
    if (!domain.user.telegramChatId) {
      return;
    }

    let emoji = '🌐';
    let statusText = '';

    if (status === DomainStatus.EXPIRED) {
      emoji = '🔴';
      statusText = 'ИСТЕК';
    } else if (status === DomainStatus.EXPIRING_SOON) {
      emoji = '⚠️';
      statusText = 'ИСТЕКАЕТ СКОРО';
    } else if (status === DomainStatus.ACTIVE) {
      emoji = '🟢';
      statusText = 'АКТИВЕН';
    } else {
      emoji = '🟠';
      statusText = 'ОШИБКА ПРОВЕРКИ';
    }

    let message = `
${emoji} <b>${statusText}</b>

<b>Домен:</b> ${domain.name}
<b>Адрес:</b> ${domain.domain}
<b>Время:</b> ${new Date().toLocaleString('ru-RU')}
    `.trim();

    if (daysLeft !== null) {
      message += `\n<b>Осталось дней:</b> ${daysLeft}`;
    }

    if (expiresAt) {
      message += `\n<b>Дата истечения:</b> ${expiresAt.toLocaleDateString('ru-RU')}`;
    }

    await this.sendMessage(domain.user.telegramChatId, message);
  }
}

export const telegramService = new TelegramService();
