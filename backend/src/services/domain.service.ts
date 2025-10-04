import axios from 'axios';
import { DomainStatus } from '@prisma/client';
const whoisJson = require('whois-json');

interface WhoisResult {
  status: DomainStatus;
  expiresAt: Date | null;
  registrar: string | null;
  nameServers: string[];
  daysLeft: number | null;
  errorMessage: string | null;
}

class DomainService {
  /**
   * Проверяет информацию о домене используя WHOIS (бесплатно!)
   */
  async checkDomain(domain: string): Promise<WhoisResult> {
    const cleanDomain = this.extractDomain(domain);

    try {
      // Используем whois-json библиотеку (полностью бесплатно, без лимитов)
      const whoisData = await whoisJson(cleanDomain, {
        follow: 3,
        timeout: 15000,
      });

      // Извлекаем дату истечения
      let expiresAt: Date | null = null;
      const possibleExpiryFields = [
        'expirationDate',
        'registryExpiryDate', 
        'expiryDate',
        'expiry',
        'expire',
        'expires',
        'paid-till',
        'paidTill',
      ];

      for (const field of possibleExpiryFields) {
        if (whoisData[field]) {
          const dateStr = Array.isArray(whoisData[field]) ? whoisData[field][0] : whoisData[field];
          try {
            const parsedDate = new Date(dateStr);
            if (!isNaN(parsedDate.getTime())) {
              expiresAt = parsedDate;
              break;
            }
          } catch (e) {
            continue;
          }
        }
      }

      // Вычисляем количество дней до истечения
      const daysLeft = expiresAt ? Math.floor((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;

      // Определяем статус
      let status: DomainStatus = DomainStatus.ACTIVE;
      if (daysLeft !== null) {
        if (daysLeft < 0) {
          status = DomainStatus.EXPIRED;
        } else if (daysLeft <= 30) {
          status = DomainStatus.EXPIRING_SOON;
        }
      }

      // Извлекаем регистратора
      const registrar = whoisData.registrar || whoisData.registrarName || whoisData.registrarOrganization || null;

      // Извлекаем name servers
      let nameServers: string[] = [];
      if (whoisData.nameServer) {
        nameServers = Array.isArray(whoisData.nameServer) 
          ? whoisData.nameServer 
          : [whoisData.nameServer];
      } else if (whoisData.nameServers) {
        nameServers = Array.isArray(whoisData.nameServers) 
          ? whoisData.nameServers 
          : [whoisData.nameServers];
      } else if (whoisData.nserver) {
        const nservers = Array.isArray(whoisData.nserver) ? whoisData.nserver : [whoisData.nserver];
        nameServers = nservers.map((ns: any) => typeof ns === 'string' ? ns.split(' ')[0] : ns);
      }

      return {
        status,
        expiresAt,
        registrar,
        nameServers,
        daysLeft,
        errorMessage: null,
      };
    } catch (error: any) {
      console.error(`Ошибка при проверке домена ${domain}:`, error.message);
      
      // Пытаемся использовать RDAP как запасной метод
      try {
        return await this.checkDomainFallback(cleanDomain);
      } catch (fallbackError) {
        return {
          status: DomainStatus.ERROR,
          expiresAt: null,
          registrar: null,
          nameServers: [],
          daysLeft: null,
          errorMessage: error.message || 'Не удалось получить информацию о домене',
        };
      }
    }
  }

  /**
   * Альтернативный метод проверки через rdap.org и другие источники
   */
  private async checkDomainFallback(domain: string): Promise<WhoisResult> {
    // Для .ru доменов используем специальный RDAP сервер
    const tld = domain.split('.').pop()?.toLowerCase();
    const rdapUrl = tld === 'ru' 
      ? `https://rdap.tcinet.ru/domain/${domain}`
      : `https://rdap.org/domain/${domain}`;

    try {
      const response = await axios.get(rdapUrl, {
        timeout: 10000,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'WDH-Monitor/1.0',
        },
      });

      const data = response.data;
      
      // Извлекаем события (events) для поиска даты истечения
      let expiresAt: Date | null = null;
      if (data.events && Array.isArray(data.events)) {
        const expiryEvent = data.events.find((e: any) => e.eventAction === 'expiration');
        if (expiryEvent && expiryEvent.eventDate) {
          expiresAt = new Date(expiryEvent.eventDate);
        }
      }

      // Вычисляем количество дней до истечения
      const daysLeft = expiresAt ? Math.floor((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;

      // Определяем статус
      let status: DomainStatus = DomainStatus.ACTIVE;
      if (daysLeft !== null) {
        if (daysLeft < 0) {
          status = DomainStatus.EXPIRED;
        } else if (daysLeft <= 30) {
          status = DomainStatus.EXPIRING_SOON;
        }
      }

      // Извлекаем регистратора
      let registrar: string | null = null;
      if (data.entities && Array.isArray(data.entities)) {
        const registrarEntity = data.entities.find((e: any) => 
          e.roles && e.roles.includes('registrar')
        );
        if (registrarEntity) {
          registrar = registrarEntity.vcardArray?.[1]?.[1]?.[3] || registrarEntity.handle || null;
        }
      }

      // Извлекаем name servers
      const nameServers = data.nameservers 
        ? data.nameservers.map((ns: any) => ns.ldhName || ns.unicodeName)
        : [];

      return {
        status,
        expiresAt,
        registrar,
        nameServers,
        daysLeft,
        errorMessage: null,
      };
    } catch (error: any) {
      throw new Error(`RDAP fallback failed: ${error.message}`);
    }
  }

  /**
   * Извлекает чистое доменное имя из URL
   */
  extractDomain(urlOrDomain: string): string {
    let domain = urlOrDomain;
    
    // Убираем протокол
    domain = domain.replace(/^https?:\/\//, '');
    
    // Убираем www
    domain = domain.replace(/^www\./, '');
    
    // Убираем путь и query parameters
    domain = domain.split('/')[0].split('?')[0];
    
    // Убираем порт
    domain = domain.split(':')[0];
    
    return domain.toLowerCase();
  }

  /**
   * Проверяет валидность доменного имени
   */
  isValidDomain(domain: string): boolean {
    const cleanDomain = this.extractDomain(domain);
    const domainRegex = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/i;
    return domainRegex.test(cleanDomain);
  }
}

export const domainService = new DomainService();
