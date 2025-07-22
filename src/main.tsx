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


import './styles/index.css';

// 配置 dayjs
dayjs.extend(relativeTime);
dayjs.extend(duration);
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.locale('zh-cn');



// Monaco Editor 配置已移至各个编辑器组件中进行局部配置


// 内部应用组件
const InnerApp: React.FC = () => {
  return <App />;
};

// 主应用组件
const AppWrapper: React.FC = () => {
  return (
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
