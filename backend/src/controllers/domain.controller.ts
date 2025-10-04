import { Request, Response } from 'express';
import prisma from '../config/database';
import { domainService } from '../services/domain.service';

interface AuthRequest extends Request {
  userId?: string;
}

class DomainController {
  /**
   * Получить все домены пользователя
   */
  async getAllDomains(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId!;

      const domains = await prisma.domain.findMany({
        where: { userId },
        include: {
          domainChecks: {
            orderBy: { checkedAt: 'desc' },
            take: 1,
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      res.json(domains);
    } catch (error) {
      console.error('Ошибка при получении доменов:', error);
      res.status(500).json({ message: 'Ошибка сервера' });
    }
  }

  /**
   * Получить домен по ID
   */
  async getDomainById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.userId!;

      const domain = await prisma.domain.findFirst({
        where: { id, userId },
        include: {
          domainChecks: {
            orderBy: { checkedAt: 'desc' },
            take: 50,
          },
        },
      });

      if (!domain) {
        res.status(404).json({ message: 'Домен не найден' });
        return;
      }

      res.json(domain);
    } catch (error) {
      console.error('Ошибка при получении домена:', error);
      res.status(500).json({ message: 'Ошибка сервера' });
    }
  }

  /**
   * Создать новый домен
   */
  async createDomain(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId!;
      const { domain, name, description, checkInterval, notifyOnExpiry } = req.body;

      // Валидация
      if (!domain || !name) {
        res.status(400).json({ message: 'Домен и название обязательны' });
        return;
      }

      if (!domainService.isValidDomain(domain)) {
        res.status(400).json({ message: 'Неверный формат доменного имени' });
        return;
      }

      // Создаем домен
      const newDomain = await prisma.domain.create({
        data: {
          domain,
          name,
          description,
          checkInterval: checkInterval || 1440,
          notifyOnExpiry: notifyOnExpiry !== undefined ? notifyOnExpiry : true,
          userId,
        },
      });

      // Сразу проверяем домен
      try {
        const checkResult = await domainService.checkDomain(domain);

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
      } catch (error) {
        console.error('Ошибка при первой проверке домена:', error);
        // Не возвращаем ошибку, домен уже создан
      }

      // Возвращаем домен с последней проверкой
      const domainWithCheck = await prisma.domain.findUnique({
        where: { id: newDomain.id },
        include: {
          domainChecks: {
            orderBy: { checkedAt: 'desc' },
            take: 1,
          },
        },
      });

      res.status(201).json(domainWithCheck);
    } catch (error) {
      console.error('Ошибка при создании домена:', error);
      res.status(500).json({ message: 'Ошибка сервера' });
    }
  }

  /**
   * Обновить домен
   */
  async updateDomain(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.userId!;
      const { name, description, checkInterval, isActive, notifyOnExpiry } = req.body;

      // Проверяем что домен принадлежит пользователю
      const existingDomain = await prisma.domain.findFirst({
        where: { id, userId },
      });

      if (!existingDomain) {
        res.status(404).json({ message: 'Домен не найден' });
        return;
      }

      // Обновляем домен
      const updatedDomain = await prisma.domain.update({
        where: { id },
        data: {
          name,
          description,
          checkInterval,
          isActive,
          notifyOnExpiry,
        },
        include: {
          domainChecks: {
            orderBy: { checkedAt: 'desc' },
            take: 1,
          },
        },
      });

      res.json(updatedDomain);
    } catch (error) {
      console.error('Ошибка при обновлении домена:', error);
      res.status(500).json({ message: 'Ошибка сервера' });
    }
  }

  /**
   * Удалить домен
   */
  async deleteDomain(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.userId!;

      // Проверяем что домен принадлежит пользователю
      const domain = await prisma.domain.findFirst({
        where: { id, userId },
      });

      if (!domain) {
        res.status(404).json({ message: 'Домен не найден' });
        return;
      }

      // Удаляем домен (cascade удалит все проверки)
      await prisma.domain.delete({
        where: { id },
      });

      res.json({ message: 'Домен успешно удален' });
    } catch (error) {
      console.error('Ошибка при удалении домена:', error);
      res.status(500).json({ message: 'Ошибка сервера' });
    }
  }

  /**
   * Проверить домен вручную
   */
  async checkDomain(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.userId!;

      const domain = await prisma.domain.findFirst({
        where: { id, userId },
      });

      if (!domain) {
        res.status(404).json({ message: 'Домен не найден' });
        return;
      }

      // Проверяем домен
      const checkResult = await domainService.checkDomain(domain.domain);

      // Сохраняем результат
      await prisma.domainCheck.create({
        data: {
          domainId: domain.id,
          status: checkResult.status,
          expiresAt: checkResult.expiresAt,
          registrar: checkResult.registrar,
          nameServers: checkResult.nameServers,
          daysLeft: checkResult.daysLeft,
          errorMessage: checkResult.errorMessage,
        },
      });

      // Возвращаем обновленный домен
      const updatedDomain = await prisma.domain.findUnique({
        where: { id },
        include: {
          domainChecks: {
            orderBy: { checkedAt: 'desc' },
            take: 1,
          },
        },
      });

      res.json(updatedDomain);
    } catch (error) {
      console.error('Ошибка при проверке домена:', error);
      res.status(500).json({ message: 'Ошибка при проверке домена' });
    }
  }

  /**
   * Удалить несколько доменов
   */
  async deleteMultipleDomains(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId!;
      const { ids } = req.body;

      if (!Array.isArray(ids) || ids.length === 0) {
        res.status(400).json({ message: 'Необходимо указать список ID для удаления' });
        return;
      }

      // Проверяем что все домены принадлежат пользователю
      const domains = await prisma.domain.findMany({
        where: {
          id: { in: ids },
          userId,
        },
      });

      if (domains.length !== ids.length) {
        res.status(403).json({ message: 'Некоторые домены не найдены или не принадлежат вам' });
        return;
      }

      // Удаляем все домены
      await prisma.domain.deleteMany({
        where: {
          id: { in: ids },
          userId,
        },
      });

      res.json({
        message: `Удалено доменов: ${ids.length}`,
        deletedCount: ids.length,
      });
    } catch (error) {
      console.error('Ошибка при массовом удалении доменов:', error);
      res.status(500).json({ message: 'Ошибка сервера' });
    }
  }

  /**
   * Получить статистику доменов
   */
  async getDomainStats(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId!;

      const domains = await prisma.domain.findMany({
        where: { userId },
        include: {
          domainChecks: {
            orderBy: { checkedAt: 'desc' },
            take: 1,
          },
        },
      });

      const stats = {
        totalDomains: domains.length,
        activeDomains: domains.filter(d => d.isActive).length,
        expiringSoon: 0,
        expired: 0,
        active: 0,
      };

      domains.forEach(domain => {
        const lastCheck = domain.domainChecks[0];
        if (lastCheck) {
          if (lastCheck.status === 'EXPIRING_SOON') stats.expiringSoon++;
          if (lastCheck.status === 'EXPIRED') stats.expired++;
          if (lastCheck.status === 'ACTIVE') stats.active++;
        }
      });

      res.json(stats);
    } catch (error) {
      console.error('Ошибка при получении статистики доменов:', error);
      res.status(500).json({ message: 'Ошибка сервера' });
    }
  }
}

export const domainController = new DomainController();
