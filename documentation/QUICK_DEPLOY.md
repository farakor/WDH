# ⚡ Быстрое развертывание WDH на Ubuntu 22.04

Минимальная инструкция для быстрого развертывания. Для детальной информации смотрите [DEPLOYMENT.md](./DEPLOYMENT.md).

---

## 🐳 Docker (5 минут)

### 1. Установка Docker и Docker Compose

```bash
# Обновление системы
sudo apt update && sudo apt upgrade -y

# Установка Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Установка Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Добавление пользователя в группу docker
sudo usermod -aG docker $USER
newgrp docker
```

### 2. Клонирование и настройка проекта

```bash
# Клонирование
sudo mkdir -p /opt/wdh
sudo chown $USER:$USER /opt/wdh
cd /opt/wdh
git clone https://github.com/your-username/WDH.git .

# Создание .env
nano .env
```

Добавьте:

```env
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
```

### 3. Редактирование docker-compose.yml

```bash
nano docker-compose.yml
```

**Обязательно измените:**

- Пароль PostgreSQL (2 места: `POSTGRES_PASSWORD` и в `DATABASE_URL`)
- `JWT_SECRET` (используйте `openssl rand -base64 32`)
- `VITE_API_URL` в frontend на ваш домен

### 4. Создание production Dockerfile для frontend

```bash
nano frontend/Dockerfile.prod
```

```dockerfile
FROM node:18-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### 5. Создание nginx.conf для frontend

```bash
nano frontend/nginx.conf
```

```nginx
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|svg|ico)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### 6. Запуск

```bash
docker-compose up -d --build
docker-compose logs -f
```

---

## 🌐 Настройка Nginx с SSL (10 минут)

### 1. Установка

```bash
sudo apt install -y nginx certbot python3-certbot-nginx
```

### 2. Конфигурация Nginx

```bash
sudo nano /etc/nginx/sites-available/wdh
```

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        return 301 https://$server_name$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    location /api {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        proxy_pass http://127.0.0.1:5173;
        proxy_set_header Host $host;
    }
}
```

### 3. Активация и SSL

```bash
sudo ln -s /etc/nginx/sites-available/wdh /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
sudo certbot --nginx -d your-domain.com
```

---

## 🔒 Базовая безопасность (5 минут)

```bash
# Firewall
sudo apt install -y ufw
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable

# fail2ban
sudo apt install -y fail2ban
sudo systemctl enable fail2ban
```

---

## 📊 Полезные команды

```bash
# Логи
docker-compose logs -f
docker-compose logs -f backend

# Статус
docker-compose ps
sudo systemctl status nginx

# Перезапуск
docker-compose restart
sudo systemctl restart nginx

# Backup БД
docker exec wdh-postgres pg_dump -U wdh_user wdh_db > backup_$(date +%Y%m%d).sql

# Обновление
cd /opt/wdh
docker-compose down
git pull
docker-compose up -d --build
```

---

## 🆘 Проблемы?

**Контейнеры не запускаются:**

```bash
docker-compose logs
docker-compose down
docker-compose up -d --force-recreate
```

**SSL не работает:**

```bash
sudo certbot renew
sudo nginx -t
sudo systemctl restart nginx
```

**Frontend не загружается:**

- Проверьте `VITE_API_URL` в docker-compose.yml
- Убедитесь что указан правильный домен с `https://`

---

## ✅ Готово!

Откройте `https://your-domain.com` 🚀

**Что дальше:**

1. Зарегистрируйтесь в приложении
2. Настройте Telegram бот в профиле
3. Добавьте сайты для мониторинга
4. Настройте автобэкапы (см. [DEPLOYMENT.md](./DEPLOYMENT.md))

---

**Полная документация:**

- [Детальная инструкция Docker](./DEPLOYMENT.md)
- [Ручная установка без Docker](./DEPLOYMENT_MANUAL.md)
- [Руководство пользователя](./INSTALL.md)
