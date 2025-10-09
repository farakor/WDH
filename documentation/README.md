# Website Down Handler (WDH)

Веб-приложение для мониторинга статуса веб-сайтов с уведомлениями в Telegram.

## 🚀 Возможности

- ✅ Мониторинг статуса веб-сайтов (онлайн/оффлайн)
- 🔒 **Проверка SSL сертификатов** (новое!)
  - Автоматическая проверка валидности сертификатов
  - Предупреждения об истекающих сертификатах (30, 7 дней)
  - Отображение информации о сертификате (издатель, срок действия)
- 📱 Автоматические уведомления в Telegram
- 📊 Dashboard с визуализацией статуса
- 👤 Личный кабинет пользователя
- ➕ Добавление сайтов через UI
- 📁 Массовый импорт из CSV/XLS файлов
- 🔐 Безопасная аутентификация (JWT)
- ⚡ Real-time обновления статуса

## 🛠 Технологии

### Frontend

- React 18 + TypeScript
- Tailwind CSS
- React Router v6
- React Query (TanStack Query)
- Axios
- Vite

### Backend

- Node.js + Express
- TypeScript
- Prisma ORM
- PostgreSQL
- JWT Authentication
- Node-cron
- Telegram Bot API

## 📦 Установка и запуск

### Предварительные требования

- Node.js 18+
- PostgreSQL 14+
- Docker (опционально)

### Быстрый старт

1. Клонируйте репозиторий

```bash
git clone <repository-url>
cd WDH
```

2. Установите зависимости для backend

```bash
cd backend
npm install
```

3. Настройте переменные окружения

```bash
cp .env.example .env
# Отредактируйте .env файл с вашими данными
```

4. Запустите миграции базы данных

```bash
npx prisma migrate dev
```

5. Запустите backend

```bash
npm run dev
```

6. В новом терминале установите зависимости для frontend

```bash
cd frontend
npm install
```

7. Запустите frontend

```bash
npm run dev
```

### Запуск через Docker

```bash
docker-compose up -d
```

## 📝 Конфигурация

### Backend Environment Variables

```
DATABASE_URL=postgresql://user:password@localhost:5432/wdh
JWT_SECRET=your-secret-key
TELEGRAM_BOT_TOKEN=your-bot-token
PORT=3000
```

## 📖 Документация

### 🚀 Развертывание на сервере

- [📋 **Индекс развертывания**](DEPLOY_INDEX.md) - Выбор способа развертывания
- [🐳 **Docker Compose** (рекомендуется)](DEPLOYMENT.md) - Полная инструкция с Docker
- [🛠️ **Ручная установка**](DEPLOYMENT_MANUAL.md) - Развертывание без Docker
- [⚡ **Быстрый деплой**](QUICK_DEPLOY.md) - Шпаргалка для опытных
- [✅ **Production Checklist**](PRODUCTION_CHECKLIST.md) - Проверка готовности

### 💻 Локальная разработка

- [🚀 Быстрый старт](START.md) - Инструкции для быстрого запуска
- [⚙️ Установка](INSTALL.md) - Детальное руководство по установке
- [🔧 Tech Stack](TECH_STACK.md) - Используемые технологии

### 🔐 Функции и настройка

- [📘 SSL Certificate Monitoring](SSL_CHECK.md) - Руководство по проверке SSL
- [🎨 SSL Badges Guide](SSL_BADGES_GUIDE.md) - Визуальные индикаторы SSL
- [🌐 Domain Monitoring](DOMAIN_SETUP.md) - Мониторинг доменов
- [📍 IP & Hosting](IP_HOSTING_FEATURE.md) - Определение хостинга
- [🤖 Telegram Bot](TELEGRAM_BOT_COMMANDS.md) - Команды и настройка бота

### 📝 История изменений

- [📝 Changelog](CHANGELOG.md) - История изменений
- [🔄 Update Guide](UPDATE_GUIDE.md) - Руководство по обновлению

### API Documentation

API эндпоинты доступны по адресу: `http://localhost:3000/api`

### Authentication

- `POST /api/auth/register` - Регистрация
- `POST /api/auth/login` - Вход

### Websites

- `GET /api/websites` - Список всех сайтов
- `POST /api/websites` - Добавить сайт
- `PUT /api/websites/:id` - Обновить сайт
- `DELETE /api/websites/:id` - Удалить сайт
- `POST /api/websites/import` - Импорт из CSV/XLS

### Status

- `GET /api/status/:websiteId` - История проверок
- `POST /api/status/check` - Принудительная проверка

## 🤝 Контрибьюция

Pull requests приветствуются!

## 📄 Лицензия

MIT
