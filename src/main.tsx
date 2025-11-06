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

// 在开发环境中暂时禁用 StrictMode 以避免 DOM 操作错误
// StrictMode 在开发环境中会双重调用 effects，可能导致 DOM 操作冲突
const isDevelopment = import.meta.env.DEV;

if (isDevelopment) {
  console.log('🔧 开发环境：禁用 React StrictMode 以避免 DOM 操作冲突');
  root.render(<AppWrapper />);
} else {
  console.log('🚀 生产环境：启用 React StrictMode');
  root.render(
    <React.StrictMode>
      <AppWrapper />
    </React.StrictMode>
  );
}

// 开发环境热更新
// Hot module replacement is handled by Vite automatically in development mode
