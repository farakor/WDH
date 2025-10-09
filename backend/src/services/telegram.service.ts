import TelegramBot from 'node-telegram-bot-api';
import config from '../config';
import { CheckStatus, DomainStatus } from '@prisma/client';
import prisma from '../config/database';

class TelegramService {
  private bot: TelegramBot | null = null;

  constructor() {
    if (config.telegram.botToken) {
      this.bot = new TelegramBot(config.telegram.botToken, { polling: true });
      this.setupCommandHandlers();
      console.log('✓ Telegram Bot инициализирован');
    } else {
      console.warn('⚠️ Telegram Bot Token не указан, уведомления отключены');
    }
  }

  /**
   * Настройка обработчиков команд бота
   */
  private setupCommandHandlers(): void {
    if (!this.bot) return;

    // Команда /start
    this.bot.onText(/\/start/, async (msg) => {
      const chatId = msg.chat.id.toString();
      const message = `
👋 <b>Добро пожаловать в WDH Monitoring Bot!</b>

Этот бот отправляет уведомления о статусе ваших сайтов и доменов.

<b>Доступные команды:</b>
/report - Получить полный отчет (сайты + домены)
/websites - Отчет по сайтам
/domains - Отчет по доменам
/help - Справка

<b>Настройка:</b>
1. Скопируйте ваш Chat ID: <code>${chatId}</code>
2. Вставьте его в настройках профиля на сайте
3. Включите уведомления

После настройки вы будете получать:
• Мгновенные алерты при падении/восстановлении сайтов
• Предупреждения об истечении доменов
• Ежедневные отчеты в 09:00 MSK
      `.trim();

      await this.sendMessage(chatId, message);
    });

    // Команда /help
    this.bot.onText(/\/help/, async (msg) => {
      const chatId = msg.chat.id.toString();
      const message = `
📚 <b>Справка по командам</b>

<b>/report</b> - Полный отчет по всем сайтам и доменам
<b>/websites</b> - Отчет только по сайтам
<b>/domains</b> - Отчет только по доменам
<b>/help</b> - Эта справка

<b>Ваш Chat ID:</b> <code>${chatId}</code>

💡 Вставьте Chat ID в настройки профиля на сайте для получения уведомлений.
      `.trim();

      await this.sendMessage(chatId, message);
    });

    // Команда /report - полный отчет
    this.bot.onText(/\/report/, async (msg) => {
      const chatId = msg.chat.id.toString();
      
      try {
        // Находим пользователя по chatId
        const user = await prisma.user.findFirst({
          where: { telegramChatId: chatId },
        });

        if (!user) {
          await this.sendMessage(
            chatId,
            '❌ Пользователь не найден.\n\nПожалуйста, укажите ваш Chat ID в настройках профиля на сайте.\n\n<b>Ваш Chat ID:</b> <code>' + chatId + '</code>'
          );
          return;
        }

        // Отправляем отчеты
        await this.sendMessage(chatId, '⏳ Формирую отчеты...');
        
        await this.sendStatusReport(user.id);
        await this.sendDomainReport(user.id);

        console.log(`✓ Отчеты по команде /report отправлены пользователю ${user.email}`);
      } catch (error: any) {
        console.error('Ошибка при обработке команды /report:', error);
        await this.sendMessage(
          chatId,
          '❌ Произошла ошибка при формировании отчета.\n\n' + error.message
        );
      }
    });

    // Команда /websites - отчет по сайтам
    this.bot.onText(/\/websites/, async (msg) => {
      const chatId = msg.chat.id.toString();
      
      try {
        const user = await prisma.user.findFirst({
          where: { telegramChatId: chatId },
        });

        if (!user) {
          await this.sendMessage(
            chatId,
            '❌ Пользователь не найден.\n\nПожалуйста, укажите ваш Chat ID в настройках профиля на сайте.\n\n<b>Ваш Chat ID:</b> <code>' + chatId + '</code>'
          );
          return;
        }

        await this.sendMessage(chatId, '⏳ Формирую отчет по сайтам...');
        await this.sendStatusReport(user.id);

        console.log(`✓ Отчет по сайтам отправлен пользователю ${user.email}`);
      } catch (error: any) {
        console.error('Ошибка при обработке команды /websites:', error);
        await this.sendMessage(
          chatId,
          '❌ Произошла ошибка при формировании отчета.\n\n' + error.message
        );
      }
    });

    // Команда /domains - отчет по доменам
    this.bot.onText(/\/domains/, async (msg) => {
      const chatId = msg.chat.id.toString();
      
      try {
        const user = await prisma.user.findFirst({
          where: { telegramChatId: chatId },
        });

        if (!user) {
          await this.sendMessage(
            chatId,
            '❌ Пользователь не найден.\n\nПожалуйста, укажите ваш Chat ID в настройках профиля на сайте.\n\n<b>Ваш Chat ID:</b> <code>' + chatId + '</code>'
          );
          return;
        }

        await this.sendMessage(chatId, '⏳ Формирую отчет по доменам...');
        await this.sendDomainReport(user.id);

        console.log(`✓ Отчет по доменам отправлен пользователю ${user.email}`);
      } catch (error: any) {
        console.error('Ошибка при обработке команды /domains:', error);
        await this.sendMessage(
          chatId,
          '❌ Произошла ошибка при формировании отчета.\n\n' + error.message
        );
      }
    });

    console.log('✓ Обработчики команд Telegram бота настроены');
  }

  async sendMessage(chatId: string, message: string): Promise<void> {
    if (!this.bot) {
      const error = 'Telegram Bot не инициализирован';
      console.warn(error);
      throw new Error(error);
    }

    try {
      console.log(`📤 Отправка сообщения в Telegram. Chat ID: ${chatId}`);
      await this.bot.sendMessage(chatId, message, { parse_mode: 'HTML' });
      console.log('✓ Сообщение успешно отправлено в Telegram');
    } catch (error: any) {
      console.error('❌ Ошибка отправки сообщения в Telegram:', error.message);
      throw error;
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

    let message = `
${emoji} <b>${statusText}</b>

<b>Сайт:</b> ${website.name}
<b>URL:</b> ${website.url}
<b>Время:</b> ${new Date().toLocaleString('ru-RU')}
<b>Статус:</b> ${status}`;

    // Добавляем IP адрес если есть
    if (website.ipAddress) {
      message += `\n<b>IP:</b> ${website.ipAddress}`;
    }

    // Добавляем хостера если есть
    if (website.hosting) {
      message += `\n<b>Хостинг:</b> ${website.hosting}`;
    }

    message = message.trim();

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
    console.log(`📊 Запрос отчета для пользователя: ${userId}`);
    
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

    if (!user) {
      throw new Error('Пользователь не найден');
    }

    if (!user.telegramChatId) {
      throw new Error('Telegram Chat ID не указан. Пожалуйста, укажите Chat ID в настройках профиля.');
    }

    console.log(`✓ Пользователь найден. Chat ID: ${user.telegramChatId}, Сайтов: ${user.websites.length}`);

    // Подсчет статистики
    const totalWebsites = user.websites.length;
    const onlineWebsites = user.websites.filter(
      (w) => w.statusChecks[0]?.status === CheckStatus.ONLINE
    ).length;
    const offlineWebsites = user.websites.filter(
      (w) => w.statusChecks[0]?.status === CheckStatus.OFFLINE
    ).length;
    const errorWebsites = user.websites.filter(
      (w) => w.statusChecks[0]?.status === CheckStatus.ERROR
    ).length;

    // Отправляем сводку
    let summaryMessage = `📊 <b>Статус всех сайтов</b>\n\n`;
    summaryMessage += `<b>Всего:</b> ${totalWebsites}\n`;
    summaryMessage += `🟢 <b>Онлайн:</b> ${onlineWebsites}\n`;
    summaryMessage += `🔴 <b>Офлайн:</b> ${offlineWebsites}\n`;
    summaryMessage += `🟠 <b>Ошибки:</b> ${errorWebsites}\n\n`;
    summaryMessage += `<i>Время: ${new Date().toLocaleString('ru-RU')}</i>`;

    await this.sendMessage(user.telegramChatId, summaryMessage);

    // Отправляем проблемные сайты (оффлайн и ошибки)
    const problemWebsites = user.websites.filter(
      (w) => w.statusChecks[0]?.status !== CheckStatus.ONLINE
    );

    if (problemWebsites.length > 0) {
      const MAX_MESSAGE_LENGTH = 4000; // Лимит Telegram - 4096, оставляем запас
      let detailMessage = '⚠️ <b>Проблемные сайты:</b>\n\n';
      let messageCount = 1;

      for (const website of problemWebsites) {
        const lastCheck = website.statusChecks[0];
        const emoji =
          lastCheck?.status === CheckStatus.OFFLINE ? '🔴' : '🟠';

        let websiteInfo = `${emoji} <b>${website.name}</b>\n`;
        websiteInfo += `   ${website.url}\n`;
        
        if (lastCheck) {
          websiteInfo += `   Статус: ${lastCheck.status}`;
          if (lastCheck.responseTime) {
            websiteInfo += ` (${lastCheck.responseTime}ms)`;
          }
          websiteInfo += '\n';
          
          // Добавляем информацию об ошибке
          if (lastCheck.errorMessage) {
            websiteInfo += `   Ошибка: ${lastCheck.errorMessage}\n`;
          }
        }
        
        // Добавляем IP и хостинг
        if (website.ipAddress) {
          websiteInfo += `   IP: ${website.ipAddress}\n`;
        }
        if (website.hosting) {
          websiteInfo += `   Хостинг: ${website.hosting}\n`;
        }
        
        // Добавляем SSL информацию для HTTPS сайтов
        if (website.url.startsWith('https://') && lastCheck) {
          if (lastCheck.sslValid === false) {
            websiteInfo += `   🔒 SSL: Ошибка\n`;
          } else if (lastCheck.sslValid === true && lastCheck.sslDaysLeft !== null) {
            const sslEmoji = lastCheck.sslDaysLeft < 30 ? '⚠️' : '🔒';
            websiteInfo += `   ${sslEmoji} SSL: ${lastCheck.sslDaysLeft} дней\n`;
          }
        }
        
        websiteInfo += '\n';

        // Если сообщение станет слишком длинным, отправляем его и начинаем новое
        if ((detailMessage + websiteInfo).length > MAX_MESSAGE_LENGTH) {
          await this.sendMessage(user.telegramChatId, detailMessage);
          messageCount++;
          detailMessage = `⚠️ <b>Проблемные сайты (продолжение ${messageCount}):</b>\n\n`;
        }

        detailMessage += websiteInfo;
      }

      // Отправляем последнее сообщение
      if (detailMessage.length > 0) {
        await this.sendMessage(user.telegramChatId, detailMessage);
      }
    }
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

  async sendDomainReport(userId: string): Promise<void> {
    console.log(`📊 Запрос отчета по доменам для пользователя: ${userId}`);
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        domains: {
          include: {
            domainChecks: {
              orderBy: { checkedAt: 'desc' },
              take: 1,
            },
          },
        },
      },
    });

    if (!user) {
      throw new Error('Пользователь не найден');
    }

    if (!user.telegramChatId) {
      throw new Error('Telegram Chat ID не указан. Пожалуйста, укажите Chat ID в настройках профиля.');
    }

    console.log(`✓ Пользователь найден. Chat ID: ${user.telegramChatId}, Доменов: ${user.domains.length}`);

    // Подсчет статистики
    const totalDomains = user.domains.length;
    const activeDomains = user.domains.filter(
      (d) => d.domainChecks[0]?.status === DomainStatus.ACTIVE
    ).length;
    const expiringSoonDomains = user.domains.filter(
      (d) => d.domainChecks[0]?.status === DomainStatus.EXPIRING_SOON
    ).length;
    const expiredDomains = user.domains.filter(
      (d) => d.domainChecks[0]?.status === DomainStatus.EXPIRED
    ).length;
    const errorDomains = user.domains.filter(
      (d) => d.domainChecks[0]?.status === DomainStatus.ERROR
    ).length;

    // Отправляем сводку
    let summaryMessage = `🌐 <b>Статус всех доменов</b>\n\n`;
    summaryMessage += `<b>Всего:</b> ${totalDomains}\n`;
    summaryMessage += `🟢 <b>Активных:</b> ${activeDomains}\n`;
    summaryMessage += `⚠️ <b>Истекают скоро:</b> ${expiringSoonDomains}\n`;
    summaryMessage += `🔴 <b>Истекли:</b> ${expiredDomains}\n`;
    summaryMessage += `🟠 <b>Ошибки:</b> ${errorDomains}\n\n`;
    summaryMessage += `<i>Время: ${new Date().toLocaleString('ru-RU')}</i>`;

    await this.sendMessage(user.telegramChatId, summaryMessage);

    // Фильтруем только проблемные домены (истекшие, истекающие скоро и с ошибками)
    const problemDomains = user.domains.filter((d) => {
      const status = d.domainChecks[0]?.status;
      return status === DomainStatus.EXPIRED || 
             status === DomainStatus.EXPIRING_SOON || 
             status === DomainStatus.ERROR;
    });

    // Отправляем детальную информацию только по проблемным доменам
    if (problemDomains.length > 0) {
      const MAX_MESSAGE_LENGTH = 4000;
      let detailMessage = '⚠️ <b>Проблемные домены:</b>\n\n';
      let messageCount = 1;

      // Сортируем домены: сначала истекшие, потом истекающие скоро, потом ошибки
      const sortedDomains = [...problemDomains].sort((a, b) => {
        const aCheck = a.domainChecks[0];
        const bCheck = b.domainChecks[0];
        
        // Сначала истекшие
        if (aCheck?.status === DomainStatus.EXPIRED && bCheck?.status !== DomainStatus.EXPIRED) return -1;
        if (aCheck?.status !== DomainStatus.EXPIRED && bCheck?.status === DomainStatus.EXPIRED) return 1;
        
        // Потом истекающие скоро
        if (aCheck?.status === DomainStatus.EXPIRING_SOON && bCheck?.status !== DomainStatus.EXPIRING_SOON) return -1;
        if (aCheck?.status !== DomainStatus.EXPIRING_SOON && bCheck?.status === DomainStatus.EXPIRING_SOON) return 1;
        
        // Потом ошибки
        if (aCheck?.status === DomainStatus.ERROR && bCheck?.status !== DomainStatus.ERROR) return -1;
        if (aCheck?.status !== DomainStatus.ERROR && bCheck?.status === DomainStatus.ERROR) return 1;
        
        // Остальные по дням до истечения
        const aDaysLeft = aCheck?.daysLeft ?? 9999;
        const bDaysLeft = bCheck?.daysLeft ?? 9999;
        return aDaysLeft - bDaysLeft;
      });

      for (const domain of sortedDomains) {
        const lastCheck = domain.domainChecks[0];
        let emoji = '🌐';
        
        if (lastCheck?.status === DomainStatus.EXPIRED) {
          emoji = '🔴';
        } else if (lastCheck?.status === DomainStatus.EXPIRING_SOON) {
          emoji = '⚠️';
        } else if (lastCheck?.status === DomainStatus.ACTIVE) {
          emoji = '🟢';
        } else {
          emoji = '🟠';
        }

        let domainInfo = `${emoji} <b>${domain.name}</b>\n`;
        domainInfo += `   ${domain.domain}\n`;
        
        if (lastCheck) {
          domainInfo += `   Статус: ${lastCheck.status}\n`;
          
          if (lastCheck.daysLeft !== null) {
            domainInfo += `   Дней до истечения: ${lastCheck.daysLeft}\n`;
          }
          
          if (lastCheck.expiresAt) {
            domainInfo += `   Истекает: ${lastCheck.expiresAt.toLocaleDateString('ru-RU')}\n`;
          }
          
          if (lastCheck.registrar) {
            domainInfo += `   Регистратор: ${lastCheck.registrar}\n`;
          }
          
          if (lastCheck.nameServers && lastCheck.nameServers.length > 0) {
            domainInfo += `   NS: ${lastCheck.nameServers.slice(0, 2).join(', ')}`;
            if (lastCheck.nameServers.length > 2) {
              domainInfo += ` (+${lastCheck.nameServers.length - 2})`;
            }
            domainInfo += '\n';
          }
          
          if (lastCheck.errorMessage) {
            domainInfo += `   Ошибка: ${lastCheck.errorMessage}\n`;
          }
        }
        
        domainInfo += '\n';

        // Если сообщение станет слишком длинным, отправляем его и начинаем новое
        if ((detailMessage + domainInfo).length > MAX_MESSAGE_LENGTH) {
          await this.sendMessage(user.telegramChatId, detailMessage);
          messageCount++;
          detailMessage = `⚠️ <b>Проблемные домены (продолжение ${messageCount}):</b>\n\n`;
        }

        detailMessage += domainInfo;
      }

      // Отправляем последнее сообщение
      if (detailMessage.length > 0) {
        await this.sendMessage(user.telegramChatId, detailMessage);
      }
    } else if (user.domains.length > 0) {
      // Если есть домены, но все в порядке
      const goodNewsMessage = '✅ <b>Все домены в порядке!</b>\n\nВсе ваши домены активны и имеют достаточный срок действия.';
      await this.sendMessage(user.telegramChatId, goodNewsMessage);
    }
  }
}

export const telegramService = new TelegramService();
