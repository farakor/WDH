# 🛠 Технологический стек WDH

## Frontend

### Основа

- **React 18** - UI библиотека
- **TypeScript** - Типизированный JavaScript
- **Vite** - Быстрый build tool и dev server

### Стилизация

- **Tailwind CSS** - Utility-first CSS фреймворк
- **PostCSS** - CSS пост-обработка

### Роутинг

- **React Router v6** - Клиентский роутинг

### Управление состоянием

- **React Query (TanStack Query)** - Серверное состояние и кэширование
- **Context API** - Глобальное состояние (аутентификация)

### HTTP клиент

- **Axios** - Promise-based HTTP клиент

### Уведомления

- **React Hot Toast** - Красивые toast уведомления

### Графики

- **Recharts** - Графики и визуализация данных

### Работа с файлами

- **XLSX** - Парсинг и создание Excel файлов

---

## Backend

### Основа

- **Node.js** - JavaScript runtime
- **Express** - Web framework
- **TypeScript** - Типизированный JavaScript

### База данных

- **PostgreSQL** - Реляционная СУБД
- **Prisma** - ORM и query builder

### Аутентификация

- **JWT (jsonwebtoken)** - JSON Web Tokens
- **bcryptjs** - Хэширование паролей

### Валидация

- **express-validator** - Валидация входных данных

### HTTP клиент

- **Axios** - Для проверки статуса сайтов

### Планировщик задач

- **node-cron** - Cron jobs для периодических проверок

### Интеграция

- **node-telegram-bot-api** - Telegram Bot API

### Работа с файлами

- **Multer** - Загрузка файлов
- **XLSX** - Парсинг Excel/CSV файлов

### CORS

- **cors** - Cross-Origin Resource Sharing

---

## DevOps & Tools

### Контейнеризация

- **Docker** - Контейнеризация приложения
- **Docker Compose** - Оркестрация контейнеров

### Development

- **tsx** - TypeScript execution для разработки
- **ts-node** - TypeScript execution

---

## Архитектура

### Backend Архитектура

```
backend/
├── src/
│   ├── config/           # Конфигурация
│   ├── controllers/      # Обработчики запросов
│   ├── routes/           # API маршруты
│   ├── middleware/       # Express middleware
│   ├── services/         # Бизнес-логика
│   └── index.ts         # Точка входа
├── prisma/
│   └── schema.prisma    # Database schema
└── package.json
```

**Паттерны:**

- MVC (Model-View-Controller) подход
- Service layer для бизнес-логики
- Middleware для аутентификации и обработки ошибок
- Repository pattern через Prisma

### Frontend Архитектура

```
frontend/
├── src/
│   ├── components/      # Переиспользуемые компоненты
│   ├── pages/          # Страницы приложения
│   ├── contexts/       # React Context
│   ├── lib/            # Утилиты и конфигурация
│   ├── types/          # TypeScript типы
│   └── App.tsx         # Главный компонент
└── package.json
```

**Паттерны:**

- Component-based architecture
- Context API для глобального состояния
- Custom hooks для повторного использования логики
- React Query для серверного состояния

---

## Database Schema

### Таблицы

**users**

- id (UUID, PK)
- email (String, Unique)
- password (String, Hashed)
- firstName (String, Optional)
- lastName (String, Optional)
- telegramChatId (String, Optional)
- notificationsEnabled (Boolean)
- createdAt (DateTime)
- updatedAt (DateTime)

**websites**

- id (UUID, PK)
- url (String)
- name (String)
- description (String, Optional)
- checkInterval (Int, default: 5)
- isActive (Boolean, default: true)
- notifyOnDown (Boolean, default: true)
- notifyOnUp (Boolean, default: true)
- userId (UUID, FK -> users.id)
- createdAt (DateTime)
- updatedAt (DateTime)

**status_checks**

- id (UUID, PK)
- websiteId (UUID, FK -> websites.id)
- status (Enum: ONLINE, OFFLINE, ERROR)
- responseTime (Int, Optional)
- statusCode (Int, Optional)
- errorMessage (String, Optional)
- checkedAt (DateTime)

### Связи

- User → Websites (One-to-Many)
- Website → StatusChecks (One-to-Many)

---

## API Endpoints

### Аутентификация

```
POST   /api/auth/register        Регистрация
POST   /api/auth/login           Вход
GET    /api/auth/profile         Получить профиль
PUT    /api/auth/profile         Обновить профиль
```

### Веб-сайты

```
GET    /api/websites             Список всех сайтов
GET    /api/websites/stats       Статистика
GET    /api/websites/:id         Детали сайта
POST   /api/websites             Добавить сайт
PUT    /api/websites/:id         Обновить сайт
DELETE /api/websites/:id         Удалить сайт
```

### Статус

```
GET    /api/status/:websiteId    История проверок
POST   /api/status/check         Принудительная проверка
POST   /api/status/report        Отправить отчет в Telegram
```

### Импорт

```
POST   /api/import               Импорт из файла
GET    /api/import/template      Скачать шаблон
```

---

## Безопасность

### Реализованные меры

- ✅ JWT аутентификация
- ✅ Хэширование паролей (bcrypt)
- ✅ Валидация входных данных
- ✅ CORS настройка
- ✅ Защита от SQL-инъекций (Prisma ORM)
- ✅ Rate limiting готов к внедрению
- ✅ Защищенные маршруты (middleware)

### Рекомендации для production

- [ ] Добавить rate limiting
- [ ] Настроить HTTPS
- [ ] Добавить helmet.js
- [ ] Настроить CSP (Content Security Policy)
- [ ] Логирование и мониторинг
- [ ] Бэкапы базы данных

---

## Производительность

### Оптимизации

- React Query кэширование
- Индексы в базе данных
- Lazy loading компонентов
- Оптимизация SQL запросов через Prisma
- Периодическое обновление данных (polling)

### Возможные улучшения

- [ ] Redis для кэширования
- [ ] WebSocket для real-time обновлений
- [ ] CDN для статических файлов
- [ ] Load balancing для масштабирования
- [ ] Database connection pooling

---

## Тестирование

### Готово к внедрению

- Unit тесты (Jest)
- Integration тесты (Supertest)
- E2E тесты (Playwright/Cypress)

### Покрытие тестами

Проект готов к написанию тестов, структура поддерживает тестирование.

---

## Лицензия

MIT License - свободное использование для коммерческих и некоммерческих проектов.
