/// <reference types="vite/client" />

/** Variables de entorno de la app. Tiparlas evita que `import.meta.env` se lea como `any`. */
interface ImportMetaEnv {
  /** URL base del backend, con `/api` incluido. */
  readonly VITE_API_BASE_URL?: string;
  /** `'false'` conecta contra el backend real; cualquier otro valor deja los mocks encendidos. */
  readonly VITE_USAR_MOCKS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
