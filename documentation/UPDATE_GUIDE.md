# Руководство по обновлению до версии 1.2.0

## Что нового

В версии 1.2.0 добавлена функция автоматического определения IP-адреса и хостинг-провайдера для каждого отслеживаемого сайта.

## Инструкции по обновлению

### Вариант 1: Автоматическое развёртывание через Docker Compose

```bash
# 1. Остановите текущие контейнеры
docker-compose down

# 2. Обновите код (если используете git)
git pull

# 3. Пересоберите и запустите контейнеры
docker-compose up -d --build

# 4. Миграция уже применена, если нет - выполните:
docker exec wdh-postgres psql -U wdh_user -d wdh_db -c "ALTER TABLE websites ADD COLUMN IF NOT EXISTS \"ipAddress\" TEXT, ADD COLUMN IF NOT EXISTS hosting TEXT;"
```

### Вариант 2: Ручное обновление (dev-режим)

#### Backend

```bash
cd backend

# 1. Убедитесь, что PostgreSQL запущен
docker-compose up -d postgres

# 2. Применить миграцию базы данных
docker exec wdh-postgres psql -U wdh_user -d wdh_db -c "ALTER TABLE websites ADD COLUMN IF NOT EXISTS \"ipAddress\" TEXT, ADD COLUMN IF NOT EXISTS hosting TEXT;"

# 3. Сгенерировать Prisma Client
npx prisma generate

# 4. Собрать backend
npm run build

# 5. Запустить backend
npm run dev
```

#### Frontend

```bash
cd frontend

# Запустить frontend
npm run dev
```

## Проверка обновления

### 1. Проверка базы данных

```bash
docker exec wdh-postgres psql -U wdh_user -d wdh_db -c "\d websites"
```

Вы должны увидеть колонки `ipAddress` и `hosting` в выводе.

### 2. Проверка UI

1. Откройте приложение в браузере
2. Перейдите к любому сайту
3. Нажмите "Проверить сейчас"
4. Обновите страницу
5. Вы должны увидеть IP-адрес и хостинг-провайдера

### 3. Проверка новых сайтов

1. Добавьте новый сайт (например, https://google.com)
2. Сразу после добавления должна отобразиться информация об IP и хостинге

## Что делать при проблемах

### Проблема: Колонки не добавились в базу данных

**Решение:**

```bash
# Выполните миграцию вручную
docker exec wdh-postgres psql -U wdh_user -d wdh_db -c "ALTER TABLE websites ADD COLUMN IF NOT EXISTS \"ipAddress\" TEXT, ADD COLUMN IF NOT EXISTS hosting TEXT;"
```

### Проблема: Backend не компилируется

**Решение:**

```bash
cd backend
npm install
npx prisma generate
npm run build
```

### Проблема: IP и хостинг не отображаются для существующих сайтов

**Решение:**

- Это нормально для существующих сайтов
- Информация будет получена при следующей проверке
- Или нажмите "Проверить сейчас" на странице деталей сайта

### Проблема: Ошибка "45 requests per minute exceeded"

**Решение:**

- ip-api.com имеет лимит 45 запросов в минуту
- Подождите минуту и попробуйте снова
- Система автоматически кэширует данные на 24 часа

## Откат к предыдущей версии

Если вам нужно откатиться к версии 1.1.1:

```bash
# 1. Откатите код
git checkout [предыдущий коммит]

# 2. Удалите колонки (опционально, не обязательно)
docker exec wdh-postgres psql -U wdh_user -d wdh_db -c "ALTER TABLE websites DROP COLUMN IF EXISTS \"ipAddress\", DROP COLUMN IF EXISTS hosting;"

# 3. Пересоберите приложение
docker-compose up -d --build
```

## Дополнительная информация

- **Техническая документация:** см. `IP_HOSTING_FEATURE.md`
- **Руководство пользователя:** см. `IP_USAGE.md`
- **История изменений:** см. `CHANGELOG.md`

## Поддержка

При возникновении проблем:

1. Проверьте логи: `docker-compose logs backend`
2. Убедитесь, что PostgreSQL работает: `docker ps | grep postgres`
3. Проверьте переменные окружения в `.env`
