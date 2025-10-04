# 🚀 Быстрый старт WDH

## Минимальный запуск (для локальной разработки)

### 1️⃣ Настройка Backend (5 минут)

```bash
# Терминал 1 - Backend
cd backend

# Установка зависимостей
npm install

# Создание .env файла
cp .env.example .env
```

**Отредактируйте `backend/.env`:**

```env
DATABASE_URL="postgresql://wdh_user:wdh_password@localhost:5432/wdh_db"
JWT_SECRET="your-super-secret-key-change-me"
TELEGRAM_BOT_TOKEN=""  # Оставьте пустым для начала
PORT=3000
NODE_ENV=development
```

**Создайте базу данных PostgreSQL:**

```bash
# Если у вас установлен psql:
createdb wdh_db

# Или через SQL:
# psql -U postgres
# CREATE DATABASE wdh_db;
```

**Примените миграции:**

```bash
npx prisma migrate dev --name init
npx prisma generate
```

**Запустите backend:**

```bash
npm run dev
```

✅ Backend запущен на `http://localhost:3000`

---

### 2️⃣ Настройка Frontend (2 минуты)

```bash
# Терминал 2 - Frontend (откройте новый терминал)
cd frontend

# Установка зависимостей
npm install

# Создание .env файла
cp .env.example .env
```

**Запустите frontend:**

```bash
npm run dev
```

✅ Frontend запущен на `http://localhost:5173`

---

### 3️⃣ Начните использовать!

1. Откройте браузер: `http://localhost:5173`
2. Зарегистрируйте аккаунт
3. Добавьте свой первый веб-сайт для мониторинга
4. Наслаждайтесь! 🎉

---

## 🐳 Docker запуск (альтернативный способ)

```bash
# В корневой папке проекта
docker-compose up -d
```

Откройте `http://localhost:5173`

---

## 📱 Настройка Telegram (опционально)

### Создайте бота:

1. Найдите [@BotFather](https://t.me/botfather) в Telegram
2. Отправьте `/newbot`
3. Следуйте инструкциям
4. Скопируйте токен и добавьте в `backend/.env`:
   ```
   TELEGRAM_BOT_TOKEN="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
   ```
5. Перезапустите backend

### Получите Chat ID:

1. Найдите [@userinfobot](https://t.me/userinfobot) в Telegram
2. Отправьте любое сообщение
3. Скопируйте ваш ID
4. В WDH: Профиль → вставьте Chat ID → Включите уведомления

---

## ❓ Проблемы?

**Backend не запускается?**

- Убедитесь что PostgreSQL запущен
- Проверьте DATABASE_URL в .env
- Выполните `npx prisma migrate dev`

**Frontend не подключается?**

- Убедитесь что backend работает на порту 3000
- Проверьте консоль браузера на ошибки

**Telegram не работает?**

- Проверьте TELEGRAM_BOT_TOKEN в backend/.env
- Убедитесь что Chat ID указан правильно
- Начните диалог с вашим ботом

---

## 📚 Подробная документация

Смотрите [INSTALL.md](./INSTALL.md) для детальной инструкции.

---

**Успехов! 🚀**
