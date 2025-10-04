# 🔧 Исправление отображения SSL ошибок

## 📋 Проблема

При наличии SSL ошибок (например, истекший сертификат) на странице статуса не отображался красный badge с конкретной ошибкой. Вместо этого показывался только статус "Ошибка" без уточнения проблемы с SSL.

## 🎯 Причина

Когда происходила ошибка SSL подключения, код попадал в блок `catch` в `monitoring.service.ts`, где:

- Все SSL поля (`sslValid`, `sslExpiresAt`, и т.д.) устанавливались в `null`
- `errorMessage` содержал только текст ошибки без префикса "SSL:"
- Frontend не мог определить, что это SSL ошибка, и не показывал badge

## ✅ Решение

### Backend (`monitoring.service.ts`)

Добавлена логика определения SSL ошибок в блоке `catch`:

```typescript
// Проверяем, является ли ошибка SSL-связанной
const sslErrorCodes = [
  "CERT_HAS_EXPIRED",
  "DEPTH_ZERO_SELF_SIGNED_CERT",
  "SELF_SIGNED_CERT_IN_CHAIN",
  "UNABLE_TO_VERIFY_LEAF_SIGNATURE",
  "UNABLE_TO_GET_ISSUER_CERT",
  "UNABLE_TO_GET_ISSUER_CERT_LOCALLY",
  "ERR_TLS_CERT_ALTNAME_INVALID",
];

const isSSLError =
  sslErrorCodes.includes(errorCode) ||
  errorMessage.toLowerCase().includes("certificate") ||
  errorMessage.toLowerCase().includes("ssl") ||
  errorMessage.toLowerCase().includes("tls");
```

Теперь при SSL ошибках:

- `sslValid` устанавливается в `false` (вместо `null`)
- `errorMessage` форматируется с префиксом "SSL:" и конкретным текстом ошибки

### Типы ошибок с конкретными сообщениями:

| Код ошибки                     | Отображаемый текст                        |
| ------------------------------ | ----------------------------------------- |
| `CERT_HAS_EXPIRED`             | 🔴 **Сертификат истек**                   |
| `DEPTH_ZERO_SELF_SIGNED_CERT`  | 🔴 **Сертификат не доверенный**           |
| `ERR_TLS_CERT_ALTNAME_INVALID` | 🔴 **Сертификат не соответствует домену** |
| Другие с "certificate"         | 🔴 **Проблема с сертификатом**            |
| Другие SSL/TLS                 | 🔴 **SSL ошибка**                         |

### Frontend

Frontend уже был готов к этим изменениям:

```typescript
// DashboardPage.tsx и WebsitesPage.tsx
const getSSLErrorText = (errorMessage: string | undefined): string => {
  if (!errorMessage) return "SSL Проблема";

  const sslErrorMatch = errorMessage.match(/SSL:\s*(.+?)(?:;|$)/);
  if (sslErrorMatch && sslErrorMatch[1]) {
    return sslErrorMatch[1].trim();
  }

  return "SSL Проблема";
};
```

Условие отображения:

```typescript
{
  (lastCheck?.sslValid === false ||
    (lastCheck?.errorMessage && lastCheck.errorMessage.includes("SSL"))) && (
    <span className="bg-red-100 text-red-800">
      <ShieldAlert />
      <span>{getSSLErrorText(lastCheck?.errorMessage)}</span>
    </span>
  );
}
```

## 🎨 Результат

**До исправления:**

```
remont-kofe-spb.ru    ● Ошибка    631ms
```

**После исправления:**

```
remont-kofe-spb.ru    ● Ошибка    🔴 Сертификат истек    631ms
```

## 📝 Обновленная документация

Обновлен файл `SSL_CHECK.md`:

- Добавлена таблица с типами SSL ошибок и их кодами
- Добавлено описание логики обработки ошибок в catch блоке
- Обновлены примеры отображения

## 🚀 Как применить изменения

1. **Backend автоматически перезапустится** (если используется nodemon/watch mode)
2. **Frontend обновится автоматически** (если запущен dev-сервер)
3. Новая проверка сайта покажет конкретную SSL ошибку

## ✨ Дополнительные улучшения

Система теперь распознает следующие типы SSL проблем:

- ✅ Истекшие сертификаты
- ✅ Самоподписанные сертификаты
- ✅ Сертификаты от недоверенных CA
- ✅ Несоответствие домена сертификата
- ✅ Проблемы с цепочкой сертификатов
- ✅ Любые другие SSL/TLS ошибки

---

**Дата исправления:** 05.10.2025  
**Затронутые файлы:**

- `backend/src/services/monitoring.service.ts`
- `frontend/src/pages/DashboardPage.tsx` (уже готов)
- `frontend/src/pages/WebsitesPage.tsx` (уже готов)
- `SSL_CHECK.md`
