/// <reference types="vite/client" />

// 扩展Window接口以支持Monaco Editor
declare global {
  interface Window {
    monaco?: typeof import('monaco-editor');
    MonacoEnvironment?: {
      getWorkerUrl?: (moduleId: string, label: string) => string;
    };
  }
}

// 扩展 Vite 环境变量接口
interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string
  // 更多环境变量...
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}