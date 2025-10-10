# 🛠️ Ручное развертывание WDH без Docker

Инструкция по развертыванию WDH на Ubuntu 22.04 без использования Docker.

## 📋 Содержание

- [Предварительные требования](#предварительные-требования)
- [Установка зависимостей](#установка-зависимостей)
- [Настройка PostgreSQL](#настройка-postgresql)
- [Установка Backend](#установка-backend)
- [Установка Frontend](#установка-frontend)
- [Настройка Nginx](#настройка-nginx)
- [Настройка PM2](#настройка-pm2)
- [Настройка автозапуска](#настройка-автозапуска)

---

## 📋 Предварительные требования

- Ubuntu 22.04 LTS
- Root или sudo доступ
- Доменное имя (опционально, но рекомендуется)

---

## 🔧 Установка зависимостей

### 1. Обновление системы

```bash
sudo apt update
sudo apt upgrade -y
```

### 2. Установка Node.js 18

```bash
# Установка Node.js через NodeSource
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Проверка установки
node --version
npm --version
```

### 3. Установка дополнительных инструментов

```bash
sudo apt install -y git build-essential curl
```

---

## 🗄️ Настройка PostgreSQL

### 1. Установка PostgreSQL

```bash
# Установка PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Запуск сервиса
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Проверка статуса
sudo systemctl status postgresql
```

### 2. Создание базы данных и пользователя

```bash
# Переключение на пользователя postgres
sudo -u postgres psql

# В PostgreSQL консоли выполните:
```

```sql
-- Создание пользователя
CREATE USER wdh_user WITH PASSWORD 'your_strong_password_here';

-- Создание базы данных
CREATE DATABASE wdh_db OWNER wdh_user;

-- Выдача прав
GRANT ALL PRIVILEGES ON DATABASE wdh_db TO wdh_user;

-- Выход
\q
```

### 3. Настройка доступа (опционально)

```bash
# Редактирование pg_hba.conf для локального доступа
sudo nano /etc/postgresql/14/main/pg_hba.conf
```

Убедитесь что есть строка:

```
local   all             all                                     md5
```

```bash
# Перезапуск PostgreSQL
sudo systemctl restart postgresql
```

---

## 🚀 Установка Backend

### 1. Создание директории и клонирование проекта

```bash
# Создание директории для приложения
sudo mkdir -p /opt/wdh
sudo chown $USER:$USER /opt/wdh
cd /opt/wdh

# Клонирование репозитория
git clone https://github.com/your-username/WDH.git .
```

### 2. Установка зависимостей Backend

```bash
cd /opt/wdh/backend
npm install
```

### 3. Создание .env файла

```bash
nano .env
```

Добавьте:

```env
# База данных
DATABASE_URL="postgresql://wdh_user:your_strong_password_here@localhost:5432/wdh_db"

# JWT секрет (сгенерируйте случайную строку)
JWT_SECRET="your-super-secret-jwt-key-min-32-characters-long"

# Telegram Bot Token
TELEGRAM_BOT_TOKEN="your_telegram_bot_token"

# Порт
PORT=3000

# Окружение
NODE_ENV=production
```

### 4. Генерация JWT Secret

```bash
# Генерация случайной строки
openssl rand -base64 32
```

Скопируйте результат и замените `JWT_SECRET` в `.env`.

### 5. Запуск миграций Prisma

```bash
# Генерация Prisma клиента
npx prisma generate

# Применение миграций
npx prisma migrate deploy
```

### 6. Сборка Backend

```bash
npm run build
```

### 7. Тестовый запуск

```bash
npm start
```

Если все работает, остановите процесс (`Ctrl+C`).

---

## 🎨 Установка Frontend

### 1. Переход в директорию Frontend

```bash
cd /opt/wdh/frontend
```

### 2. Установка зависимостей

```bash
npm install
```

### 3. Создание .env файла

```bash
nano .env
```

Добавьте:

```env
# API URL (замените на ваш домен или IP)
VITE_API_URL=https://your-domain.com/api
```

### 4. Сборка Frontend

```bash
npm run build
```

Собранные файлы будут в папке `dist/`.

---

## 🌐 Настройка Nginx

### 1. Установка Nginx

```bash
sudo apt install -y nginx
```

### 2. Создание конфигурации

```bash
sudo nano /etc/nginx/sites-available/wdh
```

Добавьте:

```nginx
# Перенаправление HTTP на HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name wdh.faruk.io www.wdh.faruk.io;

    # Для Let's Encrypt
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS конфигурация
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name wdh.faruk.io www.wdh.faruk.io;

    # SSL сертификаты
    ssl_certificate /etc/letsencrypt/live/wdh.faruk.io/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/wdh.faruk.io/privkey.pem;

    # SSL настройки
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Заголовки безопасности
    add_header Strict-Transport-Security "max-age=31536000" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;

    # Логи
    access_log /var/log/nginx/wdh-access.log;
    error_log /var/log/nginx/wdh-error.log;

    # Frontend (статические файлы)
    location / {
        root /opt/wdh/frontend/dist;
        index index.html;
        try_files $uri $uri/ /index.html;

        # Кэширование статических файлов
        location ~* \.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3000;
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

    # Ограничение размера файлов
    client_max_body_size 10M;
}
```

**Важно:** Замените `your-domain.com` на ваш реальный домен!

### 3. Активация конфигурации

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

### 4. Установка SSL сертификата

```bash
# Установка Certbot
sudo apt install -y certbot python3-certbot-nginx

# Получение сертификата
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Автообновление (Certbot настроит автоматически)
sudo certbot renew --dry-run
```

---

## 🔄 Настройка PM2

PM2 - это process manager для Node.js приложений, который обеспечивает автозапуск и перезапуск при сбоях.

### 1. Установка PM2

```bash
sudo npm install -g pm2
```

### 2. Создание конфигурации PM2

```bash
cd /opt/wdh/backend
nano ecosystem.config.js
```

Добавьте:

```javascript
module.exports = {
  apps: [
    {
      name: "wdh-backend",
      script: "./dist/index.js",
      instances: 1,
      exec_mode: "cluster",
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      error_file: "/var/log/wdh/backend-error.log",
      out_file: "/var/log/wdh/backend-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,
    },
  ],
};
```

### 3. Создание директории для логов

```bash
sudo mkdir -p /var/log/wdh
sudo chown $USER:$USER /var/log/wdh
```

### 4. Запуск приложения через PM2

```bash
cd /opt/wdh/backend
pm2 start ecosystem.config.js

# Проверка статуса
pm2 status

# Просмотр логов
pm2 logs wdh-backend

# Остановка
pm2 stop wdh-backend

# Перезапуск
pm2 restart wdh-backend
```

---

## 🚦 Настройка автозапуска

### 1. Настройка PM2 для автозапуска

```bash
# Генерация startup скрипта
pm2 startup systemd

# Выполните команду которую выведет PM2 (начинается с sudo)
# Пример: sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u username --hp /home/username

# Сохранение текущего списка процессов
pm2 save

# Проверка
sudo systemctl status pm2-$USER
```

### 2. Проверка автозапуска

```bash
# Перезагрузка сервера
sudo reboot

# После перезагрузки проверьте статус
pm2 status
```

---

## 📊 Мониторинг

### Мониторинг PM2

```bash
# Статус всех процессов
pm2 status

# Детальная информация
pm2 show wdh-backend

# Мониторинг в реальном времени
pm2 monit

# Логи
pm2 logs wdh-backend

# Последние 100 строк логов
pm2 logs wdh-backend --lines 100
```

### Системные ресурсы

```bash
# Использование памяти
free -h

# Использование диска
df -h

# Процессы
htop

# Статистика Nginx
sudo systemctl status nginx
```

---

## 🔒 Безопасность

### 1. Firewall (UFW)

```bash
# Установка
sudo apt install -y ufw

# Базовые правила
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Разрешение SSH
sudo ufw allow OpenSSH

# Разрешение HTTP/HTTPS
sudo ufw allow 'Nginx Full'

# Включение firewall
sudo ufw enable

# Проверка
sudo ufw status verbose
```

### 2. fail2ban

```bash
# Установка
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

[nginx-http-auth]
enabled = true
logpath = /var/log/nginx/wdh-error.log
```

```bash
# Перезапуск
sudo systemctl restart fail2ban
```

---

## 💾 Резервное копирование

### Backup базы данных

```bash
# Создание директории для бэкапов
mkdir -p /opt/wdh/backups

# Ручной backup
pg_dump -U wdh_user wdh_db > /opt/wdh/backups/db_backup_$(date +%Y%m%d_%H%M%S).sql

# Автоматический backup (cron)
crontab -e
```

Добавьте:

```cron
# Ежедневный backup в 2:00 AM
0 2 * * * pg_dump -U wdh_user wdh_db > /opt/wdh/backups/db_backup_$(date +\%Y\%m\%d_\%H\%M\%S).sql

# Удаление старых бэкапов (старше 30 дней)
0 3 * * * find /opt/wdh/backups -name "db_backup_*.sql" -mtime +30 -delete
```

### Восстановление из backup

```bash
# Восстановление базы данных
psql -U wdh_user wdh_db < /opt/wdh/backups/db_backup_20240101_020000.sql
```

---

## 🔄 Обновление приложения

### 1. Остановка сервисов

```bash
cd /opt/wdh

# Остановка PM2
pm2 stop wdh-backend
```

### 2. Обновление кода

```bash
# Получение последних изменений
git pull origin main
```

### 3. Обновление Backend

```bash
cd /opt/wdh/backend

# Установка новых зависимостей
npm install

# Применение новых миграций
npx prisma migrate deploy
npx prisma generate

# Пересборка
npm run build
```

### 4. Обновление Frontend

```bash
cd /opt/wdh/frontend

# Установка новых зависимостей
npm install

# Пересборка
npm run build
```

### 5. Запуск сервисов

```bash
# Запуск Backend
pm2 restart wdh-backend

# Проверка статуса
pm2 status

# Просмотр логов
pm2 logs wdh-backend
```

---

## 🆘 Решение проблем

### Backend не запускается

```bash
# Проверка логов PM2
pm2 logs wdh-backend

# Проверка порта
sudo lsof -i :3000

# Проверка конфигурации
cat /opt/wdh/backend/.env

# Тестовый запуск
cd /opt/wdh/backend
npm start
```

### База данных недоступна

```bash
# Проверка статуса PostgreSQL
sudo systemctl status postgresql

# Подключение к базе данных
psql -U wdh_user -d wdh_db

# Проверка миграций
cd /opt/wdh/backend
npx prisma migrate status
```

### Nginx не работает

```bash
# Проверка конфигурации
sudo nginx -t

# Проверка статуса
sudo systemctl status nginx

# Просмотр логов ошибок
sudo tail -f /var/log/nginx/wdh-error.log

# Перезапуск
sudo systemctl restart nginx
```

### Frontend не отображается

```bash
# Проверка файлов
ls -la /opt/wdh/frontend/dist/

# Пересборка
cd /opt/wdh/frontend
npm run build

# Проверка прав доступа
sudo chown -R www-data:www-data /opt/wdh/frontend/dist/
```

---

## 📈 Оптимизация производительности

### Настройка PostgreSQL

```bash
sudo nano /etc/postgresql/14/main/postgresql.conf
```

Рекомендуемые настройки для сервера с 2GB RAM:

```
shared_buffers = 512MB
effective_cache_size = 1536MB
maintenance_work_mem = 128MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200
work_mem = 2621kB
min_wal_size = 1GB
max_wal_size = 4GB
```

```bash
sudo systemctl restart postgresql
```

### Настройка Node.js

В `ecosystem.config.js` увеличьте количество instances для cluster mode:

```javascript
instances: 'max', // Использовать все CPU ядра
```

---

## ✅ Чек-лист после установки

- [ ] Node.js установлен
- [ ] PostgreSQL установлен и настроен
- [ ] Backend собран и работает через PM2
- [ ] Frontend собран и доступен через Nginx
- [ ] SSL сертификат установлен и работает
- [ ] Firewall настроен
- [ ] fail2ban активен
- [ ] Автозапуск PM2 настроен
- [ ] Резервное копирование настроено
- [ ] Telegram бот работает
- [ ] Логи пишутся корректно

---

## 🎉 Готово!

Ваш WDH успешно развернут на сервере без Docker!

Откройте `https://your-domain.com` и начните использовать приложение! 🚀

---

**Дополнительные ресурсы:**

- [Основная документация по развертыванию](./DEPLOYMENT.md)
- [Руководство по установке](./INSTALL.md)
- [PM2 документация](https://pm2.keymetrics.io/docs/usage/quick-start/)
- [Nginx документация](https://nginx.org/ru/docs/)
- [PostgreSQL документация](https://www.postgresql.org/docs/)
