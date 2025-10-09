# 🚀 Production Deploy Update

## Что нового?

### ✅ Исправлена ошибка "tsc: not found" на production

**Проблема:** При деплое на продакшен возникала ошибка:

```
sh: 1: tsc: not found
```

**Причина:** Старые Dockerfile файлы не были оптимизированы для production сборки.

**Решение:** Создана полная production инфраструктура.

---

## 🆕 Добавленные файлы

### Production конфигурации

1. **`docker-compose.prod.yml`** - Production Docker Compose конфигурация

   - Multi-stage builds
   - Health checks для всех сервисов
   - Оптимизированные переменные окружения
   - Production зависимости

2. **`frontend/Dockerfile.prod`** - Production Dockerfile для frontend

   - Multi-stage build (builder + nginx)
   - Установка всех зависимостей включая TypeScript
   - Компиляция TypeScript и сборка Vite
   - Nginx для раздачи статики на порту 80

3. **`backend/Dockerfile.prod`** - Production Dockerfile для backend

   - Multi-stage build (builder + runtime)
   - Компиляция TypeScript в JavaScript
   - Только production зависимости в финальном образе
   - Non-root пользователь для безопасности

4. **`frontend/nginx.conf`** - Nginx конфигурация для frontend
   - Gzip сжатие
   - Кэширование статических ресурсов
   - SPA routing (React Router)
   - Безопасные HTTP заголовки
   - Health check endpoint

### Конфигурация окружения

5. **`.env.production.example`** - Шаблон переменных окружения
   - Все необходимые переменные с пояснениями
   - Примеры значений
   - Инструкции по генерации секретов

### Оптимизация сборки

6. **`frontend/.dockerignore`** - Исключения для Docker frontend
7. **`backend/.dockerignore`** - Исключения для Docker backend

### Автоматизация

8. **`deploy-prod.sh`** - Скрипт автоматического деплоя

   - Проверка всех необходимых файлов
   - Автоматическая сборка и запуск
   - Проверка работоспособности
   - Красивый вывод с цветами

9. **`Makefile`** - Команды для управления проектом
   - `make prod-deploy` - полный деплой
   - `make prod-status` - статус контейнеров
   - `make prod-logs` - просмотр логов
   - `make update` - обновление из git
   - `make backup-db` - бэкап базы данных
   - `make health` - проверка health endpoints
   - И многое другое (`make help`)

### Документация

10. **`PRODUCTION_DEPLOY.md`** - Быстрое руководство по production деплою

    - Пошаговая инструкция
    - Сравнение dev vs production
    - Команды управления
    - Устранение проблем

11. **`README.md`** - Главный README проекта

    - Обзор проекта
    - Быстрый старт
    - Структура проекта
    - Технологический стек

12. **`CHANGELOG_PRODUCTION.md`** - Этот файл

### Обновления существующих файлов

13. **`documentation/DEPLOYMENT.md`** - Обновлена инструкция

    - Добавлена информация о production файлах
    - Обновлены команды запуска
    - Добавлены ссылки на новые файлы

14. **`DEPLOY_README.md`** - Обновлена навигация
    - Ссылка на PRODUCTION_DEPLOY.md
    - Выделена как рекомендуемая

---

## 🎯 Ключевые улучшения

### 1. Оптимизированная сборка

**До:**

- Один Dockerfile для dev и prod
- Установка dev зависимостей в production
- Большой размер образов
- TypeScript выполнялся через tsx в runtime

**После:**

- Отдельные Dockerfile.prod
- Multi-stage builds
- Только production зависимости в финальных образах
- TypeScript компилируется в JavaScript при сборке
- Образы на 50-70% меньше

### 2. Правильная работа TypeScript

**До:**

```bash
RUN npm install --production  # ❌ TypeScript не устанавливается!
RUN npm run build            # ❌ Ошибка: tsc: not found
```

**После:**

```bash
# Builder stage
RUN npm ci                   # ✅ Все зависимости (включая TypeScript)
RUN npm run build            # ✅ Успешная компиляция

# Production stage
RUN npm ci --omit=dev        # ✅ Только production зависимости
COPY --from=builder /app/dist # ✅ Уже скомпилированный код
```

### 3. Nginx для frontend

**До:**

- Vite dev server в production (не оптимально)
- Порт 5173

**После:**

- Nginx для раздачи статики
- Порт 80 (стандартный HTTP)
- Gzip сжатие
- Кэширование
- Оптимизация производительности

### 4. Безопасность

**До:**

- Root пользователь в контейнерах
- Нет health checks
- Все зависимости включая dev

**После:**

- Non-root пользователь (nodejs)
- Health checks для всех сервисов
- Только production зависимости
- Безопасные HTTP заголовки
- Изолированная сеть

### 5. Автоматизация

**До:**

- Длинные команды вручную
- Легко ошибиться

**После:**

- `./deploy-prod.sh` - один скрипт для всего
- `make prod-deploy` - одна команда
- Автоматические проверки
- Понятный вывод

---

## 📊 Сравнение размеров образов

### Frontend

|               | Development  | Production     |
| ------------- | ------------ | -------------- |
| Базовый образ | node:18-slim | nginx:alpine   |
| Размер образа | ~450 MB      | ~25 MB         |
| Зависимости   | All          | None (статика) |
| Сервер        | Vite dev     | Nginx          |

### Backend

|               | Development   | Production      |
| ------------- | ------------- | --------------- |
| Build stage   | -             | node:18-alpine  |
| Runtime stage | node:18-slim  | node:18-alpine  |
| Размер образа | ~380 MB       | ~180 MB         |
| Зависимости   | All           | Production only |
| TypeScript    | Runtime (tsx) | Pre-compiled    |

---

## 🚀 Как использовать

### Быстрый старт

```bash
# 1. Обновите код
git pull

# 2. Настройте окружение
cp .env.production.example .env.production
nano .env.production

# 3. Запустите (выберите способ)

# Вариант A: Автоматический скрипт
./deploy-prod.sh

# Вариант B: Makefile
make prod-deploy

# Вариант C: Вручную
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

### Проверка

```bash
# Статус
make prod-status

# Health checks
make health

# Логи
make prod-logs
```

### Обновление

```bash
# Автоматически
make update

# Вручную
docker compose -f docker-compose.prod.yml down
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

---

## 🔧 Устранение проблем

### "tsc: not found"

**Решение:** Убедитесь что используете `Dockerfile.prod`:

```bash
# Проверьте конфигурацию
grep dockerfile docker-compose.prod.yml

# Должно быть:
# dockerfile: Dockerfile.prod
```

### Frontend не собирается

**Решение:** Убедитесь что Dockerfile использует `npm ci` (не `npm ci --production`):

```bash
cat frontend/Dockerfile.prod | grep "npm ci"
# Должно быть: RUN npm ci
```

### Контейнеры не запускаются

```bash
# Логи
make prod-logs

# Пересоздать с нуля
make prod-clean
make prod-deploy
```

---

## 📚 Дополнительные ресурсы

- [PRODUCTION_DEPLOY.md](./PRODUCTION_DEPLOY.md) - Полное руководство
- [documentation/DEPLOYMENT.md](./documentation/DEPLOYMENT.md) - Детальная инструкция
- [Makefile](./Makefile) - Все доступные команды (`make help`)

---

## ✅ Чеклист миграции

Если вы обновляете существующий деплой:

- [ ] Сделайте бэкап базы данных
- [ ] Остановите старые контейнеры
- [ ] Обновите код из git
- [ ] Создайте `.env.production` из шаблона
- [ ] Заполните все переменные окружения
- [ ] Запустите `./deploy-prod.sh` или `make prod-deploy`
- [ ] Проверьте статус: `make prod-status`
- [ ] Проверьте health: `make health`
- [ ] Проверьте логи: `make prod-logs`
- [ ] Настройте Nginx reverse proxy (если нужно)
- [ ] Настройте SSL сертификат (если нужно)

---

**Дата обновления:** 2025-10-09  
**Версия:** 2.0.0  
**Автор:** Faruk Oripov
