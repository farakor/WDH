# 🔧 Исправления ошибок компиляции

## Исправленные проблемы

### ✅ JWT типизация

**Проблема:** TypeScript не мог правильно определить тип для `jwt.sign()` с опцией `expiresIn`

**Решение:**

- Добавлен импорт `SignOptions` из `jsonwebtoken`
- Явное указание типа для options: `as SignOptions`

### ✅ Неиспользуемые переменные

**Проблема:** TypeScript жаловался на неиспользуемые параметры функций

**Решение:**
Префикс `_` для неиспользуемых параметров:

- `_req` вместо `req`
- `_next` вместо `next`

### ✅ Неиспользуемые импорты

**Проблема:** Импорт `Request` и `config` не использовались

**Решение:**

- Удален неиспользуемый импорт `Request` из `website.controller.ts`
- Удален неиспользуемый импорт `config` из `cron.service.ts`

## Теперь можно собирать Docker!

```bash
# Сборка и запуск
docker-compose up -d --build

# Просмотр логов
docker-compose logs -f

# Проверка статуса
docker-compose ps
```

---

## Если всё ещё есть проблемы

### Очистить Docker кэш и пересобрать:

```bash
docker-compose down -v
docker system prune -af
docker-compose up -d --build
```

### Проверить логи конкретного сервиса:

```bash
docker-compose logs backend
docker-compose logs frontend
docker-compose logs postgres
```

### Войти в контейнер для отладки:

```bash
docker-compose exec backend sh
docker-compose exec frontend sh
```

---

Всё готово! 🚀
