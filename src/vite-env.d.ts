/// <reference types="vite/client" />

// 扩展 Vite 环境变量接口
interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string
  // 更多环境变量...
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}