import https from 'https';
import { URL } from 'url';

export interface SSLInfo {
  valid: boolean;
  expiresAt: Date | null;
  issuer: string | null;
  daysLeft: number | null;
  error: string | null;
}

class SSLService {
  async checkSSL(urlString: string): Promise<SSLInfo> {
    try {
      const parsedUrl = new URL(urlString);
      
      // Проверяем только HTTPS сайты
      if (parsedUrl.protocol !== 'https:') {
        return {
          valid: false,
          expiresAt: null,
          issuer: null,
          daysLeft: null,
          error: 'Не HTTPS протокол',
        };
      }

      return new Promise((resolve) => {
        const options = {
          hostname: parsedUrl.hostname,
          port: parsedUrl.port || 443,
          method: 'GET',
          agent: false,
          rejectUnauthorized: false, // Не отклоняем невалидные сертификаты, чтобы получить информацию
        };

        const req = https.request(options, (res) => {
          const cert = (res.socket as any).getPeerCertificate();

          if (!cert || Object.keys(cert).length === 0) {
            resolve({
              valid: false,
              expiresAt: null,
              issuer: null,
              daysLeft: null,
              error: 'SSL сертификат отсутствует',
            });
            return;
          }

          const expiresAt = new Date(cert.valid_to);
          const now = new Date();
          const daysLeft = Math.floor((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          
          // Проверяем валидность
          const isExpired = expiresAt < now;
          const isNotYetValid = new Date(cert.valid_from) > now;
          const valid = !isExpired && !isNotYetValid && (res.socket as any).authorized;

          resolve({
            valid,
            expiresAt,
            issuer: cert.issuer?.O || cert.issuer?.CN || 'Unknown',
            daysLeft: daysLeft > 0 ? daysLeft : 0,
            error: valid ? null : this.getSSLError(cert, isExpired, isNotYetValid, (res.socket as any).authorized),
          });

          req.destroy();
        });

        req.on('error', (error) => {
          resolve({
            valid: false,
            expiresAt: null,
            issuer: null,
            daysLeft: null,
            error: `SSL ошибка: ${error.message}`,
          });
        });

        req.setTimeout(5000, () => {
          req.destroy();
          resolve({
            valid: false,
            expiresAt: null,
            issuer: null,
            daysLeft: null,
            error: 'Timeout при проверке SSL',
          });
        });

        req.end();
      });
    } catch (error: any) {
      return {
        valid: false,
        expiresAt: null,
        issuer: null,
        daysLeft: null,
        error: error.message,
      };
    }
  }

  private getSSLError(_cert: any, isExpired: boolean, isNotYetValid: boolean, authorized: boolean): string {
    if (isExpired) {
      return 'Сертификат истек';
    }
    if (isNotYetValid) {
      return 'Сертификат еще не действителен';
    }
    if (!authorized) {
      return 'Сертификат не доверенный';
    }
    return 'Проблема с сертификатом';
  }

  shouldWarnAboutExpiry(daysLeft: number | null): boolean {
    if (daysLeft === null) return false;
    return daysLeft <= 30; // Предупреждать за 30 дней
  }

  getExpiryWarningLevel(daysLeft: number | null): 'critical' | 'warning' | 'info' | null {
    if (daysLeft === null) return null;
    if (daysLeft <= 7) return 'critical';
    if (daysLeft <= 30) return 'warning';
    if (daysLeft <= 60) return 'info';
    return null;
  }
}

export const sslService = new SSLService();
