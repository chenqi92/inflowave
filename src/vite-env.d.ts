/// <reference types="vite/client" />
/// <reference path="./i18n/react-i18next.d.ts" />

// 扩展 Vite 环境变量接口
interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string
  // 更多环境变量...
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}