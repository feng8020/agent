/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 后端 API 基础地址，默认 /api */
  readonly VITE_API_BASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
