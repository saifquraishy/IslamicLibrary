/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_LIBRARY_BASE_URL?: string;
  readonly VITE_GA_MEASUREMENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
