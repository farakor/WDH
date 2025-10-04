import { Response } from 'express';
import { body, validationResult } from 'express-validator';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { ipService } from '../services/ip.service';
import { domainService } from '../services/domain.service';

export const createWebsiteValidation = [
  body('url').isURL().withMessage('Введите корректный URL'),
  body('name').notEmpty().withMessage('Название обязательно'),
  body('checkInterval').optional().isInt({ min: 1 }).withMessage('Интервал проверки должен быть положительным числом'),
];

export const getAllWebsites = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;

    const websites = await prisma.website.findMany({
      where: { userId },
      include: {
        statusChecks: {
          orderBy: { checkedAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(websites);
  } catch (error) {
    console.error('Get websites error:', error);
    res.status(500).json({ message: 'Ошибка при получении списка сайтов' });
  }
};

export const getWebsiteById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    const website = await prisma.website.findFirst({
      where: { id, userId },
      include: {
        statusChecks: {
          orderBy: { checkedAt: 'desc' },
          take: 100,
        },
      },
    });

    if (!website) {
      res.status(404).json({ message: 'Сайт не найден' });
      return;
    }

    res.json(website);
  } catch (error) {
    console.error('Get website error:', error);
    res.status(500).json({ message: 'Ошибка при получении данных сайта' });
  }
};

export const createWebsite = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const userId = req.userId!;
    const { url, name, description, checkInterval, notifyOnDown, notifyOnUp } = req.body;

    // Получаем IP и информацию о хостинге
    const ipInfo = await ipService.getIPAndHosting(url);

    const website = await prisma.website.create({
      data: {
        url,
        name,
        description,
        checkInterval: checkInterval || 5,
        notifyOnDown: notifyOnDown !== undefined ? notifyOnDown : true,
        notifyOnUp: notifyOnUp !== undefined ? notifyOnUp : true,
        ipAddress: ipInfo.ip,
        hosting: ipInfo.hosting,
        userId,
      },
    });

    // Автоматически добавляем домен
    try {
      const domainName = domainService.extractDomain(url);
      
      if (domainName && domainService.isValidDomain(domainName)) {
        // Проверяем, существует ли уже такой домен у пользователя
        const existingDomain = await prisma.domain.findFirst({
          where: {
            userId,
            domain: domainName,
          },
        });

        if (!existingDomain) {
          // Создаем новый домен
          const newDomain = await prisma.domain.create({
            data: {
              domain: domainName,
              name: name,
              description: `Автоматически создан для сайта ${name}`,
              checkInterval: 1440, // раз в день
              notifyOnExpiry: true,
              userId,
            },
          });

          // Сразу проверяем домен
          try {
            const checkResult = await domainService.checkDomain(domainName);

            await prisma.domainCheck.create({
              data: {
                domainId: newDomain.id,
                status: checkResult.status,
                expiresAt: checkResult.expiresAt,
                registrar: checkResult.registrar,
                nameServers: checkResult.nameServers,
                daysLeft: checkResult.daysLeft,
                errorMessage: checkResult.errorMessage,
              },
            });
          } catch (checkError) {
            console.error('Ошибка при первой проверке домена:', checkError);
            // Не прерываем выполнение, домен уже создан
          }

          console.log(`Автоматически добавлен домен: ${domainName}`);
        } else {
          console.log(`Домен ${domainName} уже существует для пользователя`);
        }
      }
    } catch (domainError) {
      console.error('Ошибка при добавлении домена:', domainError);
      // Не прерываем выполнение, сайт уже создан
    }

    res.status(201).json({
      message: 'Сайт добавлен',
      website,
    });
  } catch (error) {
    console.error('Create website error:', error);
    res.status(500).json({ message: 'Ошибка при добавлении сайта' });
  }
};

export const updateWebsite = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const { id } = req.params;
    const { url, name, description, checkInterval, isActive, notifyOnDown, notifyOnUp } = req.body;

    // Проверка принадлежности сайта пользователю
    const existingWebsite = await prisma.website.findFirst({
      where: { id, userId },
    });

    if (!existingWebsite) {
      res.status(404).json({ message: 'Сайт не найден' });
      return;
    }

    // Если URL изменился, обновляем IP и хостинг
    const updateData: any = {
      url,
      name,
      description,
      checkInterval,
      isActive,
      notifyOnDown,
      notifyOnUp,
    };

    if (url && url !== existingWebsite.url) {
      const ipInfo = await ipService.getIPAndHosting(url);
      updateData.ipAddress = ipInfo.ip;
      updateData.hosting = ipInfo.hosting;
    }

    const website = await prisma.website.update({
      where: { id },
      data: updateData,
    });

    res.json({
      message: 'Сайт обновлен',
      website,
    });
  } catch (error) {
    console.error('Update website error:', error);
    res.status(500).json({ message: 'Ошибка при обновлении сайта' });
  }
};

export const deleteWebsite = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    // Проверка принадлежности сайта пользователю
    const existingWebsite = await prisma.website.findFirst({
      where: { id, userId },
    });

    if (!existingWebsite) {
      res.status(404).json({ message: 'Сайт не найден' });
      return;
    }

    await prisma.website.delete({
      where: { id },
    });

    res.json({ message: 'Сайт удален' });
  } catch (error) {
    console.error('Delete website error:', error);
    res.status(500).json({ message: 'Ошибка при удалении сайта' });
  }
};

export const deleteMultipleWebsites = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ message: 'Необходимо указать список ID для удаления' });
      return;
    }

    // Проверяем что все сайты принадлежат пользователю
    const websites = await prisma.website.findMany({
      where: {
        id: { in: ids },
        userId,
      },
    });

    if (websites.length !== ids.length) {
      res.status(403).json({ message: 'Некоторые сайты не найдены или не принадлежат вам' });
      return;
    }

    // Удаляем все сайты
    await prisma.website.deleteMany({
      where: {
        id: { in: ids },
        userId,
      },
    });

    res.json({ 
      message: `Удалено сайтов: ${ids.length}`,
      deletedCount: ids.length 
    });
  } catch (error) {
    console.error('Delete multiple websites error:', error);
    res.status(500).json({ message: 'Ошибка при массовом удалении сайтов' });
  }
};

export const getWebsiteStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;

    const totalWebsites = await prisma.website.count({
      where: { userId },
    });

    const activeWebsites = await prisma.website.count({
      where: { userId, isActive: true },
    });

    // Получение последних проверок для каждого сайта
    const websites = await prisma.website.findMany({
      where: { userId },
      include: {
        statusChecks: {
          orderBy: { checkedAt: 'desc' },
          take: 1,
        },
      },
    });

    const onlineCount = websites.filter(w => 
      w.statusChecks.length > 0 && w.statusChecks[0].status === 'ONLINE'
    ).length;

    const offlineCount = websites.filter(w => 
      w.statusChecks.length > 0 && w.statusChecks[0].status === 'OFFLINE'
    ).length;

    const errorCount = websites.filter(w => 
      w.statusChecks.length > 0 && w.statusChecks[0].status === 'ERROR'
    ).length;

    res.json({
      totalWebsites,
      activeWebsites,
      onlineCount,
      offlineCount,
      errorCount,
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ message: 'Ошибка при получении статистики' });
  }
};
