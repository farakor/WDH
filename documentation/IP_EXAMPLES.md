# Примеры работы с IP и хостингом

## Примеры API ответов

### Создание нового сайта

**Request:**

```http
POST /api/websites
Content-Type: application/json
Authorization: Bearer <token>

{
  "url": "https://google.com",
  "name": "Google",
  "description": "Поисковая система",
  "checkInterval": 5
}
```

**Response:**

```json
{
  "message": "Сайт добавлен",
  "website": {
    "id": "uuid-here",
    "url": "https://google.com",
    "name": "Google",
    "description": "Поисковая система",
    "checkInterval": 5,
    "isActive": true,
    "notifyOnDown": true,
    "notifyOnUp": true,
    "ipAddress": "142.250.185.78",
    "hosting": "Google LLC",
    "userId": "user-uuid",
    "createdAt": "2025-10-05T00:00:00.000Z",
    "updatedAt": "2025-10-05T00:00:00.000Z"
  }
}
```

### Получение информации о сайте

**Request:**

```http
GET /api/websites/{id}
Authorization: Bearer <token>
```

**Response:**

```json
{
  "id": "uuid-here",
  "url": "https://example.com",
  "name": "Example Site",
  "ipAddress": "93.184.216.34",
  "hosting": "Edgecast Inc.",
  "statusChecks": [...]
}
```

## Примеры отображения в UI

### Страница деталей сайта

```
┌─────────────────────────────────────────────────────────────┐
│ Google                                                       │
│ https://google.com                                           │
│ Популярная поисковая система                                 │
│                                                              │
│ ┌───────────────────────┐  ┌─────────────────────────────┐ │
│ │ 🌐 IP адрес           │  │ 🖥️ Хостинг                  │ │
│ │ 142.250.185.78        │  │ Google LLC                  │ │
│ └───────────────────────┘  └─────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Список сайтов

```
┌────────────────────────────────────────────────────────┬──────────┬──────────┐
│ Сайт                                                   │ Статус   │ Интервал │
├────────────────────────────────────────────────────────┼──────────┼──────────┤
│ Google                                                 │ ✓ Онлайн │ 5 мин    │
│ https://google.com                                     │          │          │
│ 🌐 142.250.185.78 | 🖥️ Google LLC                      │          │          │
├────────────────────────────────────────────────────────┼──────────┼──────────┤
│ GitHub                                                 │ ✓ Онлайн │ 5 мин    │
│ https://github.com                                     │          │          │
│ 🌐 140.82.121.4 | 🖥️ GitHub, Inc.                      │          │          │
└────────────────────────────────────────────────────────┴──────────┴──────────┘
```

## Примеры использования в коде

### Backend - Получение IP и хостинга

```typescript
import { ipService } from "./services/ip.service";

// Получить IP и хостинг для URL
const ipInfo = await ipService.getIPAndHosting("https://example.com");
console.log(ipInfo);
// { ip: '93.184.216.34', hosting: 'Edgecast Inc.' }

// Только IP
const ip = await ipService.getIPAddress("https://example.com");
console.log(ip); // '93.184.216.34'

// Только хостинг
const hosting = await ipService.getHostingInfo("93.184.216.34");
console.log(hosting); // 'Edgecast Inc.'
```

### Frontend - Отображение информации

```tsx
import { Website } from "../types";
import { Globe, Server } from "lucide-react";

const WebsiteInfo = ({ website }: { website: Website }) => {
  return (
    <div>
      {website.ipAddress && (
        <div className="flex items-center space-x-2">
          <Globe className="w-4 h-4" />
          <span>{website.ipAddress}</span>
        </div>
      )}
      {website.hosting && (
        <div className="flex items-center space-x-2">
          <Server className="w-4 h-4" />
          <span>{website.hosting}</span>
        </div>
      )}
    </div>
  );
};
```

## Примеры хостинг-провайдеров

### Популярные хостинги

| Домен            | IP пример       | Хостинг-провайдер |
| ---------------- | --------------- | ----------------- |
| google.com       | 142.250.185.78  | Google LLC        |
| github.com       | 140.82.121.4    | GitHub, Inc.      |
| cloudflare.com   | 104.16.132.229  | Cloudflare, Inc.  |
| amazon.com       | 205.251.242.103 | Amazon.com, Inc.  |
| digitalocean.com | 167.99.0.0      | DigitalOcean, LLC |

### Российские хостинги

| Домен     | IP пример      | Хостинг-провайдер |
| --------- | -------------- | ----------------- |
| yandex.ru | 5.255.255.242  | Yandex LLC        |
| vk.com    | 87.240.132.242 | VK.com            |
| mail.ru   | 217.69.139.200 | Mail.Ru Group     |
| reg.ru    | 194.58.116.215 | RU-CENTER         |

## Сценарии использования

### Сценарий 1: Миграция сайта

**До миграции:**

```
example.com
🌐 192.0.2.1 | 🖥️ Old Hosting Provider
```

**После миграции:**

```
example.com
🌐 198.51.100.1 | 🖥️ New Hosting Provider
```

Система автоматически обновит информацию в течение 24 часов или при ручной проверке.

### Сценарий 2: CDN

**Сайт с Cloudflare:**

```
mywebsite.com
🌐 104.16.132.229 | 🖥️ Cloudflare, Inc.
```

Вы увидите IP Cloudflare, а не исходного сервера (это нормально для CDN).

### Сценарий 3: Множество доменов на одном IP

```
site1.com
🌐 192.0.2.1 | 🖥️ Shared Hosting Inc.

site2.com
🌐 192.0.2.1 | 🖥️ Shared Hosting Inc.
```

Несколько сайтов могут иметь один IP (shared hosting).

### Сценарий 4: Смена DNS

**При смене DNS-записей:**

- Старый IP: 192.0.2.1
- Новый IP: 198.51.100.1

Система обновит IP автоматически при следующей проверке. Вы сможете отследить изменение.

## API ip-api.com примеры

### Успешный ответ

```bash
curl http://ip-api.com/json/8.8.8.8
```

```json
{
  "status": "success",
  "country": "United States",
  "countryCode": "US",
  "region": "CA",
  "regionName": "California",
  "city": "Mountain View",
  "zip": "94043",
  "lat": 37.4223,
  "lon": -122.085,
  "timezone": "America/Los_Angeles",
  "isp": "Google LLC",
  "org": "Google Public DNS",
  "as": "AS15169 Google LLC",
  "query": "8.8.8.8"
}
```

### Ответ при ошибке

```json
{
  "status": "fail",
  "message": "invalid query",
  "query": "invalid-ip"
}
```

## Советы и рекомендации

### 1. Для точной диагностики

- Используйте IP для определения фактического расположения сервера
- Сравнивайте с ожидаемым хостингом

### 2. Для мониторинга CDN

- Если используется CDN (Cloudflare, CloudFront), вы увидите IP CDN
- Это нормально и ожидаемо

### 3. Для отладки DNS

- Если IP неожиданно изменился, проверьте DNS-записи
- Возможна проблема с DNS-провайдером

### 4. Для аудита безопасности

- Регулярно проверяйте, не изменились ли IP ваших сайтов
- Неожиданные изменения могут указывать на проблемы
