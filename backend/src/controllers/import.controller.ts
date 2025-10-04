import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/database';
import * as XLSX from 'xlsx';
import { domainService } from '../services/domain.service';
import { ipService } from '../services/ip.service';

interface WebsiteImportData {
  url: string;
  name: string;
  description?: string;
  checkInterval?: number;
}

export const importWebsites = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;

    if (!req.file) {
      res.status(400).json({ message: 'Файл не загружен' });
      return;
    }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data: any[] = XLSX.utils.sheet_to_json(worksheet);

    if (data.length === 0) {
      res.status(400).json({ message: 'Файл пуст' });
      return;
    }

    const websites: WebsiteImportData[] = [];
    const errors: string[] = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];

      // Валидация обязательных полей
      if (!row.url || !row.name) {
        errors.push(`Строка ${i + 1}: отсутствуют обязательные поля (url, name)`);
        continue;
      }

      // Валидация URL
      try {
        new URL(row.url);
      } catch {
        errors.push(`Строка ${i + 1}: некорректный URL (${row.url})`);
        continue;
      }

      websites.push({
        url: row.url,
        name: row.name,
        description: row.description || null,
        checkInterval: row.checkInterval || 5,
      });
    }

    // Создаем сайты по одному, чтобы получить IP и автоматически добавить домены
    let importedCount = 0;
    const uniqueDomains = new Set<string>();

    for (const websiteData of websites) {
      try {
        // Получаем IP и информацию о хостинге
        const ipInfo = await ipService.getIPAndHosting(websiteData.url);

        // Создаем сайт
        await prisma.website.create({
          data: {
            url: websiteData.url,
            name: websiteData.name,
            description: websiteData.description,
            checkInterval: websiteData.checkInterval || 5,
            notifyOnDown: true,
            notifyOnUp: true,
            ipAddress: ipInfo.ip,
            hosting: ipInfo.hosting,
            userId,
          },
        });

        importedCount++;

        // Автоматически добавляем домен
        try {
          const domainName = domainService.extractDomain(websiteData.url);
          
          if (domainName && domainService.isValidDomain(domainName) && !uniqueDomains.has(domainName)) {
            uniqueDomains.add(domainName);

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
                  name: websiteData.name,
                  description: `Автоматически создан при импорте`,
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
              }

              console.log(`Автоматически добавлен домен при импорте: ${domainName}`);
            }
          }
        } catch (domainError) {
          console.error('Ошибка при добавлении домена:', domainError);
          // Не прерываем импорт
        }
      } catch (websiteError) {
        console.error('Ошибка при импорте сайта:', websiteError);
        errors.push(`Ошибка при импорте сайта ${websiteData.name}: ${websiteError}`);
      }
    }

    res.json({
      message: 'Импорт завершен',
      imported: importedCount,
      domainsAdded: uniqueDomains.size,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Import error:', error);
    res.status(500).json({ message: 'Ошибка при импорте файла' });
  }
};

export const downloadTemplate = (_req: AuthRequest, res: Response): void => {
  try {
    const data = [
      {
        url: 'https://example.com',
        name: 'Example Website',
        description: 'Описание сайта',
        checkInterval: 5,
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Websites');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader(
      'Content-Disposition',
      'attachment; filename=websites-template.xlsx'
    );
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.send(buffer);
  } catch (error) {
    console.error('Download template error:', error);
    res.status(500).json({ message: 'Ошибка при создании шаблона' });
  }
};
