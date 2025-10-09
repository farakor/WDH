# 🌐 WDH - Website Down Handler

Система мониторинга и оповещения о доступности веб-сайтов с интеграцией Telegram.

![Docker](https://img.shields.io/badge/Docker-Ready-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.2-blue)
![React](https://img.shields.io/badge/React-18.2-blue)
![Node.js](https://img.shields.io/badge/Node.js-18+-green)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue)

## 🚀 Быстрый старт

### Production деплой

```bash
# 1. Клонирование
git clone https://github.com/farakor/WDH.git
cd WDH

# 2. Настройка переменных окружения
cp .env.production.example .env.production
nano .env.production  # Заполните переменные

# 3. Запуск (выберите один способ)
./deploy-prod.sh      # Автоматический скрипт
# или
make prod-deploy      # Через Makefile
```

**📖 Полная инструкция:** [PRODUCTION_DEPLOY.md](./PRODUCTION_DEPLOY.md)

### Локальная разработка

```bash
# 1. Клонирование
git clone https://github.com/farakor/WDH.git
cd WDH

# 2. Запуск dev окружения
docker compose up -d

# Frontend: http://localhost:5173
# Backend: http://localhost:3000
```

## 📚 Документация

### 📋 Быстрые ссылки

| Документ                                              | Описание                           |
| ----------------------------------------------------- | ---------------------------------- |
| **[🚀 PRODUCTION_DEPLOY.md](./PRODUCTION_DEPLOY.md)** | **Быстрый production деплой**      |
| [📖 DEPLOY_README.md](./DEPLOY_README.md)             | Навигация по документации деплоя   |
| [🐳 DEPLOYMENT.md](./documentation/DEPLOYMENT.md)     | Полная инструкция по развертыванию |
| [⚡ QUICK_DEPLOY.md](./documentation/QUICK_DEPLOY.md) | Шпаргалка для опытных              |
| [📘 README.md](./documentation/README.md)             | Основная документация проекта      |

### 📁 Вся документация

Полная документация находится в папке [`documentation/`](./documentation/)

## ✨ Возможности

- ✅ **Мониторинг веб-сайтов** - проверка доступности сайтов
- ✅ **SSL мониторинг** - отслеживание сертификатов SSL
- ✅ **Telegram уведомления** - мгновенные оповещения
- ✅ **IP хостинг** - проверка сайтов по IP адресам
- ✅ **Домены** - управление пользовательскими доменами
- ✅ **API** - RESTful API для интеграций
- ✅ **Docker** - готовые конфигурации для деплоя
- ✅ **TypeScript** - типобезопасный код

## 🛠️ Технологический стек

### Backend

- Node.js 18+
- TypeScript
- Express.js
- Prisma ORM
- PostgreSQL 15
- Telegram Bot API

### Frontend

- React 18
- TypeScript
- Vite
- TailwindCSS
- React Query
- Recharts (графики)

### DevOps

- Docker & Docker Compose
- Nginx (production)
- Multi-stage builds
- Health checks

## 📦 Структура проекта

```
WDH/
├── backend/                 # Backend приложение
│   ├── src/                # Исходный код
│   ├── prisma/             # Схема БД и миграции
│   ├── Dockerfile          # Dev Dockerfile
│   └── Dockerfile.prod     # Production Dockerfile
│
├── frontend/               # Frontend приложение
│   ├── src/               # Исходный код React
│   ├── Dockerfile         # Dev Dockerfile
│   ├── Dockerfile.prod    # Production Dockerfile
│   └── nginx.conf         # Nginx конфигурация
│
├── documentation/         # Документация
│   ├── DEPLOYMENT.md     # Полная инструкция деплоя
│   ├── QUICK_DEPLOY.md   # Быстрый деплой
│   └── ...               # Другая документация
│
├── docker-compose.yml     # Dev конфигурация
├── docker-compose.prod.yml # Production конфигурация
├── .env.production.example # Шаблон переменных
├── deploy-prod.sh         # Скрипт автодеплоя
├── Makefile               # Makefile с командами
└── README.md              # Этот файл
```

## 🎯 Использование Makefile

Для удобства работы доступны команды через `make`:

```bash
# Справка по всем командам
make help

# Production
make prod-deploy   # Полный деплой
make prod-status   # Статус контейнеров
make prod-logs     # Просмотр логов
make health        # Проверка здоровья

# Обслуживание
make update        # Обновить и перезапустить
make backup-db     # Бэкап БД
make restore-db FILE=backup.sql

# Разработка
make dev           # Запуск dev окружения
```

**Полный список:** запустите `make help`

## 🔐 Безопасность

### Production конфигурация включает:

- ✅ Non-root пользователи в контейнерах
- ✅ Минимальные production зависимости
- ✅ Health checks для всех сервисов
- ✅ Gzip сжатие
- ✅ Безопасные заголовки HTTP
- ✅ Изолированная Docker сеть
- ✅ Переменные окружения из файла

### Рекомендации:

```bash
# Сгенерируйте сильные пароли
openssl rand -base64 32  # Для JWT_SECRET
openssl rand -base64 16  # Для POSTGRES_PASSWORD

# Используйте HTTPS на production
# Настройте файрвол (UFW)
# Регулярно обновляйте зависимости
```

## 🔍 Устранение проблем

### Ошибка "tsc: not found"

**Причина:** Используется dev Dockerfile вместо production.

**Решение:**

```bash
# Убедитесь, что используете production файлы
docker compose -f docker-compose.prod.yml up -d --build
# или
make prod-deploy
```

### Контейнеры не запускаются

```bash
# Проверьте логи
make prod-logs
# или
docker compose -f docker-compose.prod.yml logs

# Проверьте статус
make prod-status

# Пересоздайте с нуля
make prod-clean
make prod-deploy
```

### Frontend не собирается

```bash
# Убедитесь, что используется правильный Dockerfile
cat frontend/Dockerfile.prod | grep "npm ci"
# Должно быть: RUN npm ci (БЕЗ --production)

# Проверьте наличие nginx.conf
ls -la frontend/nginx.conf
```

## 🤝 Вклад в проект

Приветствуются pull requests! Для крупных изменений сначала откройте issue для обсуждения.

## 📝 Лицензия

[MIT License](LICENSE)

## 👨‍💻 Автор

**Faruk Oripov**

- GitHub: [@farakor](https://github.com/farakor)
- Website: [faruk.io](https://faruk.io)

## 🆘 Поддержка

Если у вас возникли проблемы:

1. Проверьте [документацию](./documentation/)
2. Посмотрите [Issues на GitHub](https://github.com/farakor/WDH/issues)
3. Создайте новый Issue с описанием проблемы

---

⭐ Если проект был полезен, поставьте звезду на GitHub!
