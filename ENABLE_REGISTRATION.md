# 🔓 Включение регистрации

Регистрация была временно отключена. Чтобы включить её обратно, раскомментируйте следующие строки:

## Backend

**Файл:** `backend/src/routes/auth.routes.ts`

```typescript
// Раскомментируйте строку 15:
router.post("/register", registerValidation, register);
```

## Frontend

### 1. App.tsx

**Файл:** `frontend/src/App.tsx`

```typescript
// Раскомментируйте строку 6:
import RegisterPage from "./pages/RegisterPage";

// Раскомментируйте строку 21:
<Route path="/register" element={<RegisterPage />} />;
```

### 2. LoginPage.tsx

**Файл:** `frontend/src/pages/LoginPage.tsx`

```typescript
// Раскомментируйте строки 91-98:
<div className="text-center">
  <p className="text-sm text-gray-600">
    Нет аккаунта?{" "}
    <Link
      to="/register"
      className="font-medium text-primary-600 hover:text-primary-500"
    >
      Зарегистрироваться
    </Link>
  </p>
</div>
```

## После изменений

1. Сделайте commit и push изменений
2. На сервере выполните:

```bash
cd /opt/WDH
git pull origin main
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d --build
```

---

**Примечание:** После включения регистрации пользователи смогут создавать новые аккаунты через `/register`.
