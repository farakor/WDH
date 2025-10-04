import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/database';
import { monitoringService } from '../services/monitoring.service';
import { telegramService } from '../services/telegram.service';

export const getStatusHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const { websiteId } = req.params;
    const limit = parseInt(req.query.limit as string) || 100;

    // Проверка принадлежности сайта пользователю
    const website = await prisma.website.findFirst({
      where: { id: websiteId, userId },
    });

    if (!website) {
      res.status(404).json({ message: 'Сайт не найден' });
      return;
    }

    const statusChecks = await prisma.statusCheck.findMany({
      where: { websiteId },
      orderBy: { checkedAt: 'desc' },
      take: limit,
    });

    res.json(statusChecks);
  } catch (error) {
    console.error('Get status history error:', error);
    res.status(500).json({ message: 'Ошибка при получении истории проверок' });
  }
};

export const forceCheck = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const { websiteId } = req.body;

    // Проверка принадлежности сайта пользователю
    const website = await prisma.website.findFirst({
      where: { id: websiteId, userId },
    });

    if (!website) {
      res.status(404).json({ message: 'Сайт не найден' });
      return;
    }

    await monitoringService.checkSingleWebsite(websiteId);

    // Получение последней проверки
    const lastCheck = await prisma.statusCheck.findFirst({
      where: { websiteId },
      orderBy: { checkedAt: 'desc' },
    });

    res.json({
      message: 'Проверка выполнена',
      statusCheck: lastCheck,
    });
  } catch (error) {
    console.error('Force check error:', error);
    res.status(500).json({ message: 'Ошибка при проверке сайта' });
  }
};

export const sendStatusReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;

    await telegramService.sendStatusReport(userId);

    res.json({ message: 'Отчет отправлен в Telegram' });
  } catch (error: any) {
    console.error('Send report error:', error);
    res.status(500).json({ 
      message: error.message || 'Ошибка при отправке отчета'
    });
  }
};
