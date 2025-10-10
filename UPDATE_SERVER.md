# 🔄 Обновление WDH на сервере

Краткая инструкция по обновлению приложения на production сервере после внесения изменений в код.

## 📋 Быстрое обновление

```bash
# 1. Подключитесь к серверу
ssh user@your-server-ip

# 2. Перейдите в директорию проекта
cd /opt/WDH

# 3. Остановите контейнеры
docker compose -f docker-compose.prod.yml down

# 4. Получите последние изменения из Git
git pull origin main

# 5. Пересоберите и запустите контейнеры
docker compose -f docker-compose.prod.yml up -d --build

# 6. Проверьте статус
docker compose -f docker-compose.prod.yml ps

# 7. Проверьте логи
docker compose -f docker-compose.prod.yml logs -f
```

## 🔧 Обновление с полной пересборкой (если есть проблемы)

Если простое обновление не помогает или есть проблемы:

```bash
cd /opt/WDH

# Остановите и удалите контейнеры
docker compose -f docker-compose.prod.yml down

# Получите изменения из Git
git pull origin main

# Удалите старые образы
docker rmi wdh-frontend wdh-backend -f

# Очистите Docker кэш
docker builder prune -f

# Пересоберите БЕЗ КЭША
docker compose -f docker-compose.prod.yml build --no-cache

# Запустите контейнеры
docker compose -f docker-compose.prod.yml up -d

# Проверьте статус
docker compose -f docker-compose.prod.yml ps
```

## ⚙️ Обновление переменных окружения

Если изменились переменные окружения в `.env`:

```bash
cd /opt/WDH

# Отредактируйте .env файл
nano .env

# Пересоберите контейнеры с новыми переменными
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d --build

# Для frontend обязательна пересборка БЕЗ КЭША:
docker compose -f docker-compose.prod.yml build --no-cache frontend
docker compose -f docker-compose.prod.yml up -d
```

## 🗄️ Обновление базы данных (миграции)

Если были изменения в схеме базы данных:

```bash
cd /opt/WDH

# Выполните миграции Prisma
docker compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy

# Или используйте db push
docker compose -f docker-compose.prod.yml exec backend npx prisma db push

# Проверьте статус миграций
docker compose -f docker-compose.prod.yml exec backend npx prisma migrate status
```

## 🧹 Очистка после обновления

Удалите старые неиспользуемые образы и контейнеры:

```bash
# Удалите неиспользуемые образы
docker image prune -a -f

# Удалите неиспользуемые тома (ОСТОРОЖНО!)
docker volume prune -f

# Полная очистка (без удаления активных контейнеров и томов)
docker system prune -f
```

## ✅ Проверка после обновления

```bash
# Проверьте статус контейнеров
docker compose -f docker-compose.prod.yml ps

# Проверьте health checks
docker compose -f docker-compose.prod.yml ps --filter health=healthy

# Проверьте логи на ошибки
docker compose -f docker-compose.prod.yml logs --tail=50

# Проверьте работу в браузере
curl -I https://your-domain.com
```

## 🔄 Откат к предыдущей версии

Если обновление вызвало проблемы:

```bash
cd /opt/WDH

# Остановите контейнеры
docker compose -f docker-compose.prod.yml down

# Откатитесь к предыдущей версии в Git
git log --oneline -5  # Посмотрите последние коммиты
git reset --hard COMMIT_HASH  # Откатитесь к нужному коммиту

# Пересоберите контейнеры
docker compose -f docker-compose.prod.yml up -d --build
```

## 📝 Важные замечания

### Frontend изменения

- При изменении frontend кода **всегда** требуется пересборка
- Если изменился `VITE_API_URL`, нужна пересборка **БЕЗ КЭША**
- После пересборки **очистите кэш браузера** (Ctrl+Shift+R)

### Backend изменения

- При изменении backend кода требуется пересборка
- Если изменилась схема Prisma, выполните миграции
- Проверьте логи после запуска

### Переменные окружения

- Изменения в `.env` требуют перезапуска контейнеров
- Для frontend требуется **полная пересборка** при изменении `VITE_API_URL`
- Никогда не коммитьте `.env` файл в Git

### База данных

- Перед миграциями сделайте **backup базы данных**
- Миграции нельзя откатить автоматически
- Храните backups минимум 30 дней

## 🚀 Быстрая команда для обновления

Одна команда для большинства случаев:

```bash
cd /opt/WDH && \
git pull origin main && \
docker compose -f docker-compose.prod.yml down && \
docker compose -f docker-compose.prod.yml up -d --build && \
echo "Обновление завершено! Проверьте статус:" && \
docker compose -f docker-compose.prod.yml ps
```

## 📞 Помощь

Если возникли проблемы:

1. Проверьте логи: `docker compose -f docker-compose.prod.yml logs -f`
2. Проверьте статус: `docker compose -f docker-compose.prod.yml ps`
3. Проверьте переменные окружения: `cat .env`
4. Проверьте Nginx: `sudo nginx -t && sudo systemctl status nginx`

---

**Автор:** WDH Team  
**Дата:** 2025
