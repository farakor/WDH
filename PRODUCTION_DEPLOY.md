# 🚀 Быстрый деплой WDH на Production

Краткое руководство для развертывания WDH на продакшен сервере.

## ⚡ Быстрый старт

### 1. Подготовка сервера

```bash
# Обновление системы
sudo apt update && sudo apt upgrade -y

# Установка Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
newgrp docker

# Установка Git
sudo apt install -y git
```

### 2. Клонирование проекта

```bash
# Создание директории
sudo mkdir -p /opt/wdh
sudo chown $USER:$USER /opt/wdh
cd /opt/wdh

# Клонирование
git clone https://github.com/farakor/WDH.git
cd WDH
```

### 3. Настройка переменных окружения

```bash
# Копирование шаблона
cp .env.production.example .env.production

# Редактирование
nano .env.production
```

Заполните:

```env
POSTGRES_USER=wdh_user
POSTGRES_PASSWORD=ваш_сильный_пароль
POSTGRES_DB=wdh_db

JWT_SECRET=$(openssl rand -base64 64)
TELEGRAM_BOT_TOKEN=ваш_telegram_token

VITE_API_URL=https://ваш-домен.com/api
```

### 4. Запуск в production режиме

**Способ 1: Используя автоматический скрипт (рекомендуется)**

```bash
# Запуск скрипта автоматического деплоя
./deploy-prod.sh
```

Скрипт автоматически:

- Проверит наличие всех необходимых файлов
- Остановит старые контейнеры
- Соберет новые образы
- Запустит контейнеры
- Проверит работоспособность

**Способ 2: Используя Makefile**

```bash
# Полный деплой
make prod-deploy

# Или по шагам:
make prod-build    # Сборка образов
make prod-up       # Запуск контейнеров
make prod-status   # Проверка статуса
```

**Способ 3: Вручную**

```bash
# Сборка и запуск
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build

# Проверка статуса
docker compose -f docker-compose.prod.yml ps

# Проверка логов
docker compose -f docker-compose.prod.yml logs -f
```

### 5. Проверка работы

```bash
# Backend health check
curl http://localhost:3000/api/health

# Frontend health check
curl http://localhost/health
```

## 📝 Важные отличия от dev версии

| Параметр            | Development          | Production                |
| ------------------- | -------------------- | ------------------------- |
| Docker Compose      | `docker-compose.yml` | `docker-compose.prod.yml` |
| Frontend Dockerfile | `Dockerfile`         | `Dockerfile.prod`         |
| Backend Dockerfile  | `Dockerfile`         | `Dockerfile.prod`         |
| Frontend Port       | 5173                 | 80                        |
| Frontend Server     | Vite Dev Server      | Nginx                     |
| TypeScript          | tsx (runtime)        | Compiled to JS            |
| Dependencies        | All (dev + prod)     | Production only           |
| Image Size          | Larger               | Optimized                 |
| Hot Reload          | Yes                  | No                        |

## 🔧 Управление

### 🎯 Быстрые команды (Makefile)

```bash
# Справка по всем командам
make help

# Запуск и остановка
make prod-deploy   # Полный деплой
make prod-up       # Запустить контейнеры
make prod-down     # Остановить контейнеры
make prod-restart  # Перезапустить

# Мониторинг
make prod-status   # Статус контейнеров
make prod-logs     # Просмотр логов
make health        # Проверка health endpoints

# Обслуживание
make update        # Обновить из git и перезапустить
make backup-db     # Создать бэкап БД
make restore-db FILE=backup.sql  # Восстановить БД
make check-env     # Проверить .env.production

# Очистка
make prod-clean    # Удалить контейнеры и volumes
```

### 📝 Ручные команды Docker Compose

#### Остановка

```bash
docker compose -f docker-compose.prod.yml down
```

#### Перезапуск

```bash
docker compose -f docker-compose.prod.yml restart
```

#### Обновление

```bash
# С использованием Makefile
make update

# Или вручную:
docker compose -f docker-compose.prod.yml down
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

#### Просмотр логов

```bash
# Все сервисы
docker compose -f docker-compose.prod.yml logs -f

# Только backend
docker compose -f docker-compose.prod.yml logs -f backend

# Только frontend
docker compose -f docker-compose.prod.yml logs -f frontend
```

#### Бэкап и восстановление

```bash
# Создание бэкапа
make backup-db

# Восстановление из бэкапа
make restore-db FILE=backups/backup_20250101_120000.sql
```

## 🌐 Настройка Nginx reverse proxy (опционально)

Если вы хотите использовать Nginx как reverse proxy с SSL:

```bash
# Установка
sudo apt install -y nginx certbot python3-certbot-nginx

# Создание конфигурации
sudo nano /etc/nginx/sites-available/wdh
```

Добавьте:

```nginx
server {
    listen 80;
    server_name ваш-домен.com;

    location / {
        proxy_pass http://localhost:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api {
        proxy_pass http://localhost:3000/api;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# Активация конфигурации
sudo ln -s /etc/nginx/sites-available/wdh /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Получение SSL сертификата
sudo certbot --nginx -d ваш-домен.com
```

## 🔍 Устранение проблем

### Ошибка "tsc: not found"

**Проблема:** Старый Dockerfile не содержит TypeScript.

**Решение:** Убедитесь, что используете `Dockerfile.prod` для frontend:

```bash
# Проверьте, что используется правильный файл
grep "dockerfile:" docker-compose.prod.yml

# Должно быть: dockerfile: Dockerfile.prod
```

### Контейнеры не запускаются

```bash
# Проверка логов
docker compose -f docker-compose.prod.yml logs

# Проверка переменных окружения
docker compose -f docker-compose.prod.yml config

# Пересборка с нуля
docker compose -f docker-compose.prod.yml down -v
docker compose -f docker-compose.prod.yml up -d --build --force-recreate
```

### Frontend не собирается

```bash
# Проверьте, что Dockerfile.prod использует npm ci (не npm install --production)
cat frontend/Dockerfile.prod | grep "npm ci"

# Должна быть строка: RUN npm ci
```

## 📚 Дополнительная документация

- [Полная инструкция по деплою](documentation/DEPLOYMENT.md)
- [Техническая документация](documentation/README.md)
- [Настройка доменов](documentation/DOMAIN_SETUP.md)

## 🆘 Поддержка

При возникновении проблем:

1. Проверьте логи: `docker compose -f docker-compose.prod.yml logs`
2. Убедитесь, что все переменные окружения заданы в `.env.production`
3. Проверьте, что используются правильные production файлы
4. Обратитесь к полной документации в папке `documentation/`
