import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import relativeTime from 'dayjs/plugin/relativeTime';
import duration from 'dayjs/plugin/duration';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

import App from './App';
import { TooltipProvider } from '@/components/ui';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { I18nProvider } from '@/i18n';
import logger from '@/utils/logger';

import './styles/index.css';
import './styles/font-preview.css';
import '@glideapps/glide-data-grid/dist/index.css';

// 配置 dayjs
dayjs.extend(relativeTime);
dayjs.extend(duration);
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.locale('zh-cn');

// 内部应用组件
const InnerApp: React.FC = () => {
  // app-ready 事件现在由 App.tsx 在完成所有初始化后发送
  // 这样可以确保加载屏幕只在应用真正准备好后才消失
  return <App />;
};

// 主应用组件
const AppWrapper: React.FC = () => {
  return (
    <I18nProvider
      enableLanguageDetection={true}
      enablePersistence={true}
    >
      <ThemeProvider defaultTheme='system' storageKey='inflowave-ui-theme'>
        <TooltipProvider>
          <BrowserRouter
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true,
            }}
          >
            <InnerApp />
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </I18nProvider>
  );
};

// 渲染应用
const root = ReactDOM.createRoot(document.getElementById('root')!);

// 🔧 统一禁用 StrictMode
// 原因：
// 1. StrictMode 会双重调用 effects，可能导致初始化逻辑执行两次
// 2. 某些 Tauri API 调用和 i18n 初始化不兼容双重调用
// 3. 开发和生产环境行为一致，减少难以复现的 bug
// 4. 我们已通过 useRef 保护关键初始化逻辑，确保只执行一次

logger.info('🚀 InfloWave 启动中...');
root.render(<AppWrapper />);

// 开发环境热更新
// Hot module replacement is handled by Vite automatically in development mode
