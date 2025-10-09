# 🔧 Исправление ошибки "tsc: not found"

## ❌ Проблема

```bash
=> ERROR [frontend builder 6/6] RUN npm run build
sh: 1: tsc: not found
```

## ✅ Решение

Вы использовали **dev Dockerfile** вместо **production Dockerfile**.

### Быстрое исправление

**1. Используйте правильную команду запуска:**

```bash
# ❌ НЕ ИСПОЛЬЗУЙТЕ:
docker compose up -d --build
docker-compose up -d --build

# ✅ ИСПОЛЬЗУЙТЕ:
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

**2. Или используйте автоматический скрипт:**

```bash
./deploy-prod.sh
```

**3. Или используйте Makefile:**

```bash
make prod-deploy
```

## 📝 Почему это произошло?

### Dev Dockerfile (НЕ для production)

```dockerfile
# ❌ Этот файл для разработки
FROM node:18-slim
RUN npm install  # Может не установить dev зависимости правильно
CMD ["npm", "run", "dev"]  # Dev сервер
```

### Production Dockerfile (ПРАВИЛЬНЫЙ)

```dockerfile
# ✅ Этот файл для production
FROM node:18-alpine AS builder
RUN npm ci  # Устанавливает ВСЕ зависимости (включая TypeScript)
RUN npm run build  # TypeScript компилируется успешно

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
```

## 🎯 Что нужно сделать на сервере?

### Шаг 1: Подключитесь к серверу

```bash
ssh user@your-server-ip
cd /opt/wdh/WDH  # Или где у вас проект
```

### Шаг 2: Обновите код (если еще не обновляли)

```bash
git pull
```

### Шаг 3: Создайте .env.production

```bash
# Скопируйте шаблон
cp .env.production.example .env.production

# Отредактируйте
nano .env.production
```

Минимально необходимые переменные:

```env
POSTGRES_USER=wdh_user
POSTGRES_PASSWORD=ваш_пароль
POSTGRES_DB=wdh_db
JWT_SECRET=$(openssl rand -base64 64)
TELEGRAM_BOT_TOKEN=ваш_токен
VITE_API_URL=https://ваш-домен.com/api
```

### Шаг 4: Запустите правильную конфигурацию

```bash
# Остановите старые контейнеры
docker compose down

# Запустите production конфигурацию
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

### Шаг 5: Проверьте

```bash
# Статус контейнеров
docker compose -f docker-compose.prod.yml ps

# Логи
docker compose -f docker-compose.prod.yml logs -f

# Health checks
curl http://localhost:3000/api/health  # Backend
curl http://localhost/health           # Frontend
```

## 🚨 Если все еще не работает

### Проверка 1: Используется ли правильный Dockerfile?

```bash
cat docker-compose.prod.yml | grep dockerfile
```

Должно быть:

```yaml
dockerfile: Dockerfile.prod # ✅ Правильно
```

### Проверка 2: Существует ли Dockerfile.prod?

```bash
ls -la frontend/Dockerfile.prod
ls -la backend/Dockerfile.prod
ls -la frontend/nginx.conf
```

Если файлов нет:

```bash
# Убедитесь, что вы обновили код
git pull

# Проверьте еще раз
ls -la frontend/Dockerfile.prod
```

### Проверка 3: Правильный ли Dockerfile.prod?

```bash
cat frontend/Dockerfile.prod | grep "npm ci"
```

Должна быть строка:

```dockerfile
RUN npm ci  # ✅ БЕЗ --production!
```

НЕ должно быть:

```dockerfile
RUN npm ci --only=production  # ❌ Неправильно
RUN npm ci --production       # ❌ Неправильно
```

### Проверка 4: Очистка и пересборка

```bash
# Полная очистка
docker compose -f docker-compose.prod.yml down -v
docker system prune -af

# Пересборка с нуля
docker compose -f docker-compose.prod.yml build --no-cache
docker compose -f docker-compose.prod.yml --env-file .env.production up -d
```

## 📊 Dev vs Production

| Аспект              | Development          | Production                                                                |
| ------------------- | -------------------- | ------------------------------------------------------------------------- |
| Docker Compose файл | `docker-compose.yml` | `docker-compose.prod.yml`                                                 |
| Dockerfile          | `Dockerfile`         | `Dockerfile.prod`                                                         |
| Frontend порт       | 5173                 | 80                                                                        |
| Frontend сервер     | Vite dev             | Nginx                                                                     |
| Backend TypeScript  | tsx (runtime)        | Pre-compiled                                                              |
| Команда запуска     | `docker compose up`  | `docker compose -f docker-compose.prod.yml --env-file .env.production up` |

## 💡 Лучшие практики

### Всегда используйте для production:

```bash
# Через скрипт (рекомендуется)
./deploy-prod.sh

# Или через Makefile
make prod-deploy

# Или напрямую
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

### НЕ используйте для production:

```bash
# ❌ Это для разработки!
docker compose up
docker-compose up
npm run build  # В обычном Dockerfile
```

## 📚 Дополнительная помощь

- **Полное руководство:** [PRODUCTION_DEPLOY.md](./PRODUCTION_DEPLOY.md)
- **Все команды:** `make help`
- **Документация:** [documentation/DEPLOYMENT.md](./documentation/DEPLOYMENT.md)
- **Changelog:** [CHANGELOG_PRODUCTION.md](./CHANGELOG_PRODUCTION.md)

## 🆘 Все еще не работает?

1. Проверьте логи: `docker compose -f docker-compose.prod.yml logs`
2. Убедитесь, что файл `.env.production` заполнен
3. Проверьте, что используется `Dockerfile.prod`
4. Попробуйте пересобрать с нуля (см. Проверка 4)
5. Создайте Issue на GitHub с полными логами

---

**Обновлено:** 2025-10-09  
**Статус:** ✅ Решено в версии 2.0.0
