/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  // добавьте другие переменные окружения если нужно
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

