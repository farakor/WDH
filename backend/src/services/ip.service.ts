import dns from 'dns';
import { promisify } from 'util';
import axios from 'axios';

const lookup = promisify(dns.lookup);

interface IPInfo {
  ip: string | null;
  hosting: string | null;
}

class IPService {
  /**
   * Получает IP адрес для домена
   */
  async getIPAddress(url: string): Promise<string | null> {
    try {
      const hostname = new URL(url).hostname;
      const result = await lookup(hostname);
      return result.address;
    } catch (error) {
      console.error(`Ошибка при получении IP для ${url}:`, error);
      return null;
    }
  }

  /**
   * Получает информацию о хостинге по IP адресу
   * Использует ip-api.com (бесплатный API, 45 запросов в минуту)
   */
  async getHostingInfo(ip: string): Promise<string | null> {
    try {
      const response = await axios.get(`http://ip-api.com/json/${ip}`, {
        timeout: 5000,
      });

      if (response.data.status === 'success') {
        const { org, isp, as } = response.data;
        // Возвращаем наиболее информативное значение
        return org || isp || as || 'Неизвестно';
      }

      return null;
    } catch (error) {
      console.error(`Ошибка при получении информации о хостинге для IP ${ip}:`, error);
      return null;
    }
  }

  /**
   * Получает полную информацию об IP и хостинге для URL
   */
  async getIPAndHosting(url: string): Promise<IPInfo> {
    const ip = await this.getIPAddress(url);
    
    if (!ip) {
      return { ip: null, hosting: null };
    }

    const hosting = await this.getHostingInfo(ip);

    return {
      ip,
      hosting,
    };
  }
}

export const ipService = new IPService();
