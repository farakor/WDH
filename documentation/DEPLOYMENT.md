# 🚀 Развертывание WDH на сервере Ubuntu 22.04

Подробная инструкция по развертыванию Website Down Handler (WDH) на production сервере с Ubuntu 22.04.

## 📋 Содержание

- [Предварительные требования](#предварительные-требования)
- [Способ 1: Docker Compose (Рекомендуется)](#способ-1-docker-compose-рекомендуется)
- [Способ 2: Ручная установка](#способ-2-ручная-установка)
- [Настройка Nginx с SSL](#настройка-nginx-с-ssl)
- [Настройка безопасности](#настройка-безопасности)
- [Мониторинг и логи](#мониторинг-и-логи)
- [Обслуживание и обновление](#обслуживание-и-обновление)

---

## 📋 Предварительные требования

### Минимальные требования сервера

- **OS:** Ubuntu 22.04 LTS (x64)
- **CPU:** 2 ядра (минимум 1 ядро)
- **RAM:** 2 GB (минимум 1 GB)
- **Диск:** 20 GB свободного места
- **Сеть:** Публичный IP адрес

### Необходимые данные

- Доменное имя (например, `wdh.example.com`)
- Telegram Bot Token (опционально, но рекомендуется)
- SSH доступ к серверу

---

## 🐳 Способ 1: Docker Compose (Рекомендуется)

Это самый простой и надежный способ развертывания.

### ⚠️ ВАЖНО: Использование Production файлов

Для продакшен деплоя используйте специальные production файлы:

- `docker-compose.prod.yml` - вместо `docker-compose.yml`
- `Dockerfile.prod` - для backend и frontend (вместо обычных `Dockerfile`)

Эти файлы оптимизированы для production:

- ✅ Multi-stage сборка (меньший размер образов)
- ✅ TypeScript компиляция включена
- ✅ Nginx для раздачи статики frontend
- ✅ Production зависимости без dev-пакетов
- ✅ Health checks для всех сервисов
- ✅ Безопасность (non-root user)

### 1. Подключение к серверу

```bash
ssh user@your-server-ip
```

### 2. Обновление системы

```bash
sudo apt update
sudo apt upgrade -y
```

### 3. Установка Docker

```bash
# Установка необходимых пакетов
sudo apt install -y apt-transport-https ca-certificates curl software-properties-common

# Добавление официального GPG ключа Docker
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Добавление репозитория Docker
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Установка Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io

# Проверка установки
sudo docker --version
```

### 4. Установка Docker Compose

```bash
# Установка Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

# Установка прав
sudo chmod +x /usr/local/bin/docker-compose

# Проверка установки
docker-compose --version
```

### 5. Добавление пользователя в группу Docker

```bash
# Добавить текущего пользователя в группу docker
sudo usermod -aG docker $USER

# Применить изменения (или перелогиниться)
newgrp docker
```

### 6. Установка Git

```bash
sudo apt install -y git
```

### 7. Клонирование проекта

```bash
# Создайте директорию для приложения
sudo mkdir -p /opt/wdh
sudo chown $USER:$USER /opt/wdh
cd /opt/wdh

# Клонируйте репозиторий (замените на ваш URL)
git clone https://github.com/farakor/WDH.git
```

### 8. Создание .env файла для production

```bash
# Скопируйте шаблон
cp .env.production.example .env.production

# Отредактируйте файл
nano .env.production
```

Заполните все необходимые переменные:

```env
# Database Configuration
POSTGRES_USER=wdh_user
POSTGRES_PASSWORD=ВАШ_СИЛЬНЫЙ_ПАРОЛЬ_БАЗЫ_ДАННЫХ
POSTGRES_DB=wdh_db

# Backend Configuration
JWT_SECRET=ВАШ_СЕКРЕТНЫЙ_КЛЮЧ_МИНИМУМ_32_СИМВОЛА
TELEGRAM_BOT_TOKEN=ваш_telegram_bot_token

# Frontend Configuration
VITE_API_URL=https://ваш-домен.com/api
```

**Важно:**

- Сгенерируйте сильный `JWT_SECRET`: `openssl rand -base64 64`
- Получите `TELEGRAM_BOT_TOKEN` у @BotFather в Telegram
- Укажите правильный домен в `VITE_API_URL`

Сохраните файл (`Ctrl+X`, затем `Y`, затем `Enter`).

### 9. Использование production конфигурации

Для production используйте `docker-compose.prod.yml`:

```bash
nano docker-compose.yml
```

Файл `docker-compose.prod.yml` уже настроен правильно и использует переменные из `.env.production`.

**Что включено в production конфигурацию:**

- ✅ PostgreSQL с health checks
- ✅ Backend с оптимизированной сборкой
- ✅ Frontend с Nginx на порту 80
- ✅ Все сервисы используют переменные окружения из `.env.production`
- ✅ Автоматический перезапуск контейнеров
- ✅ Изоляция сети

### 10. Проверка production файлов

Убедитесь, что все необходимые файлы на месте:

```bash
# Проверьте наличие production файлов
ls -la docker-compose.prod.yml
ls -la .env.production
ls -la frontend/Dockerfile.prod
ls -la frontend/nginx.conf
ls -la backend/Dockerfile.prod
```

Все эти файлы должны уже существовать в проекте.

### 11. Запуск приложения в production режиме

```bash
# Перейдите в директорию проекта
cd /opt/wdh/WDH

# Сборка и запуск контейнеров с production конфигурацией
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build

# Проверка статуса
docker compose -f docker-compose.prod.yml ps

# Просмотр логов
docker compose -f docker-compose.prod.yml logs -f
```

**Примечание:** Первая сборка может занять несколько минут, так как:

- Устанавливаются все зависимости (включая TypeScript)
- Компилируется TypeScript код
- Собирается frontend с Vite
- Создаются оптимизированные Docker образы

### 12. Проверка работы

```bash
# Проверка backend (порт 3000)
curl http://localhost:3000/api/health

# Проверка frontend (порт 80)
curl http://localhost/health

# Проверка всех контейнеров
docker compose -f docker-compose.prod.yml ps

# Проверка health checks
docker compose -f docker-compose.prod.yml ps --filter health=healthy
```

Все сервисы должны быть в состоянии `healthy`.

---

## 🌐 Настройка Nginx с SSL

Теперь настроим Nginx как reverse proxy с SSL сертификатом.

### 1. Установка Nginx

```bash
sudo apt install -y nginx
```

### 2. Установка Certbot для Let's Encrypt

```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 3. Настройка DNS

Убедитесь, что ваш домен указывает на IP адрес сервера:

```bash
# Проверка DNS записи
nslookup your-domain.com
```

### 4. Создание конфигурации Nginx

```bash
sudo nano /etc/nginx/sites-available/wdh
```

Добавьте:

```nginx
# Перенаправление HTTP на HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name your-domain.com www.your-domain.com;

    # Для получения SSL сертификата
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    # Перенаправление на HTTPS
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS конфигурация
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    # SSL сертификаты (будут настроены Certbot'ом)
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # SSL настройки
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Заголовки безопасности
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Логи
    access_log /var/log/nginx/wdh-access.log;
    error_log /var/log/nginx/wdh-error.log;

    # Proxy для backend API
    location /api {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Proxy для frontend
    location / {
        proxy_pass http://127.0.0.1:5173;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Ограничение размера загружаемых файлов
    client_max_body_size 10M;
}
```

**Важно:** Замените `your-domain.com` на ваш реальный домен!

### 5. Активация конфигурации

```bash
# Создание символической ссылки
sudo ln -s /etc/nginx/sites-available/wdh /etc/nginx/sites-enabled/

# Удаление default конфигурации
sudo rm /etc/nginx/sites-enabled/default

# Проверка конфигурации
sudo nginx -t

# Перезапуск Nginx
sudo systemctl restart nginx
```

### 6. Получение SSL сертификата

```bash
# Получение сертификата
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Следуйте инструкциям Certbot
# Выберите опцию редиректа на HTTPS
```

### 7. Автоматическое обновление сертификата

```bash
# Certbot автоматически добавляет cron задачу
# Проверка автообновления
sudo certbot renew --dry-run
```

### 8. Проверка доступности

Откройте в браузере: `https://your-domain.com`

---

## 🔒 Настройка безопасности

### 1. Настройка UFW (Firewall)

```bash
# Установка UFW
sudo apt install -y ufw

# Разрешение SSH
sudo ufw allow OpenSSH

# Разрешение HTTP и HTTPS
sudo ufw allow 'Nginx Full'

# Включение firewall
sudo ufw enable

# Проверка статуса
sudo ufw status
```

### 2. Ограничение попыток входа (fail2ban)

```bash
# Установка fail2ban
sudo apt install -y fail2ban

# Создание конфигурации
sudo nano /etc/fail2ban/jail.local
```

Добавьте:

```ini
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = ssh
logpath = /var/log/auth.log

[nginx-http-auth]
enabled = true
port = http,https
logpath = /var/log/nginx/wdh-error.log
```

```bash
# Перезапуск fail2ban
sudo systemctl restart fail2ban

# Проверка статуса
sudo systemctl status fail2ban
```

### 3. Автоматические обновления безопасности

```bash
# Установка unattended-upgrades
sudo apt install -y unattended-upgrades

# Включение автообновлений
sudo dpkg-reconfigure --priority=low unattended-upgrades
```

### 4. Настройка SSH

```bash
sudo nano /etc/ssh/sshd_config
```

Рекомендуемые настройки:

```
# Отключение входа root
PermitRootLogin no

# Использование только ключей
PasswordAuthentication no

# Изменение порта (опционально)
# Port 2222
```

```bash
# Перезапуск SSH
sudo systemctl restart sshd
```

---

## 📊 Мониторинг и логи

### Просмотр логов Docker

```bash
# Все логи
docker-compose logs -f

# Логи конкретного сервиса
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres

# Последние 100 строк
docker-compose logs --tail=100 backend
```

### Просмотр логов Nginx

```bash
# Access логи
sudo tail -f /var/log/nginx/wdh-access.log

# Error логи
sudo tail -f /var/log/nginx/wdh-error.log
```

### Мониторинг ресурсов

```bash
# Использование ресурсов контейнерами
docker stats

# Использование диска
df -h

# Использование памяти
free -h

# Процессы
htop
```

### Настройка ротации логов

```bash
sudo nano /etc/logrotate.d/wdh
```

Добавьте:

```
/var/log/nginx/wdh-*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data adm
    sharedscripts
    postrotate
        [ -s /run/nginx.pid ] && kill -USR1 `cat /run/nginx.pid`
    endscript
}
```

---

## 🔧 Обслуживание и обновление

### Резервное копирование

#### Backup базы данных

```bash
# Создание директории для бэкапов
mkdir -p /opt/wdh/backups

# Backup базы данных
docker exec wdh-postgres pg_dump -U wdh_user wdh_db > /opt/wdh/backups/db_backup_$(date +%Y%m%d_%H%M%S).sql

# Автоматический backup (cron)
crontab -e
```

Добавьте:

```
# Ежедневный backup в 2:00 AM
0 2 * * * docker exec wdh-postgres pg_dump -U wdh_user wdh_db > /opt/wdh/backups/db_backup_$(date +\%Y\%m\%d_\%H\%M\%S).sql

# Удаление старых бэкапов (старше 30 дней)
0 3 * * * find /opt/wdh/backups -name "db_backup_*.sql" -mtime +30 -delete
```

#### Восстановление из backup

```bash
# Восстановление базы данных
docker exec -i wdh-postgres psql -U wdh_user wdh_db < /opt/wdh/backups/db_backup_20240101_020000.sql
```

### Обновление приложения

```bash
# Перейдите в директорию проекта
cd /opt/wdh

# Остановка контейнеров
docker-compose down

# Получение последних изменений
git pull origin main

# Пересборка и запуск
docker-compose up -d --build

# Проверка логов
docker-compose logs -f
```

### Очистка Docker

```bash
# Удаление неиспользуемых образов
docker image prune -a

# Удаление неиспользуемых томов
docker volume prune

# Полная очистка (ОСТОРОЖНО!)
docker system prune -a --volumes
```

### Перезапуск сервисов

```bash
# Перезапуск всех контейнеров
docker-compose restart

# Перезапуск конкретного сервиса
docker-compose restart backend

# Перезапуск Nginx
sudo systemctl restart nginx
```

---

## 🆘 Решение проблем

### Контейнеры не запускаются

```bash
# Проверка логов
docker-compose logs

# Проверка статуса
docker-compose ps

# Пересоздание контейнеров
docker-compose down
docker-compose up -d --force-recreate
```

### База данных недоступна

```bash
# Проверка контейнера PostgreSQL
docker logs wdh-postgres

# Подключение к базе данных
docker exec -it wdh-postgres psql -U wdh_user -d wdh_db

# Проверка миграций
docker exec -it wdh-backend npx prisma migrate status
```

### SSL сертификат не работает

```bash
# Проверка конфигурации Nginx
sudo nginx -t

# Обновление сертификата вручную
sudo certbot renew

# Проверка логов Certbot
sudo cat /var/log/letsencrypt/letsencrypt.log
```

### Высокая нагрузка

```bash
# Проверка использования ресурсов
docker stats

# Увеличение ресурсов для контейнера (docker-compose.yml)
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 1G
```

---

## 📚 Дополнительные настройки

### Настройка Email уведомлений (опционально)

Если вы хотите добавить Email уведомления в дополнение к Telegram:

1. Установите SMTP сервис (например, Postfix)
2. Добавьте переменные окружения в `docker-compose.yml`:

```yaml
environment:
  SMTP_HOST: smtp.gmail.com
  SMTP_PORT: 587
  SMTP_USER: your-email@gmail.com
  SMTP_PASS: your-app-password
  SMTP_FROM: noreply@your-domain.com
```

### Настройка мониторинга (Prometheus + Grafana)

Для продвинутого мониторинга можно добавить Prometheus и Grafana в `docker-compose.yml`.

### Настройка CDN (Cloudflare)

Для улучшения производительности и дополнительной защиты:

1. Зарегистрируйтесь на Cloudflare
2. Добавьте ваш домен
3. Измените nameservers у регистратора
4. Включите Proxy для DNS записей
5. Настройте SSL mode: "Full (strict)"

---

## ✅ Чек-лист после установки

- [ ] Приложение доступно через HTTPS
- [ ] SSL сертификат валиден
- [ ] Firewall настроен и активен
- [ ] Автоматические бэкапы настроены
- [ ] Telegram бот работает
- [ ] Логи пишутся корректно
- [ ] Мониторинг работает
- [ ] Автообновления безопасности включены
- [ ] fail2ban активен
- [ ] Docker контейнеры автоматически перезапускаются при сбоях

---

## 📞 Поддержка

При возникновении проблем:

1. Проверьте логи: `docker-compose logs -f`
2. Проверьте статус: `docker-compose ps`
3. Проверьте конфигурацию Nginx: `sudo nginx -t`
4. Проверьте firewall: `sudo ufw status`

---

## 🎉 Готово!

Ваш WDH успешно развернут на production сервере!

Откройте `https://your-domain.com` и начните мониторить ваши сайты! 🚀

**Важные ссылки:**

- Frontend: `https://your-domain.com`
- Backend API: `https://your-domain.com/api`
- Документация: [README.md](./README.md)
- Руководство по использованию: [INSTALL.md](./INSTALL.md)

---

**Автор:** WDH Team  
**Версия:** 1.0  
**Дата:** 2025
