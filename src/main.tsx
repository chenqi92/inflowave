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
import { MessageProvider } from '@/components/ui';
import './styles/index.css';

// 配置 dayjs
dayjs.extend(relativeTime);
dayjs.extend(duration);
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.locale('zh-cn');

// 内部应用组件
const InnerApp: React.FC = () => {
  return <App />;
};

// 主应用组件
const AppWrapper: React.FC = () => {
  
  return (
    <MessageProvider>
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <InnerApp />
      </BrowserRouter>
    </MessageProvider>
  );
};

// 渲染应用
const root = ReactDOM.createRoot(document.getElementById('root')!);

root.render(
  <React.StrictMode>
    <AppWrapper />
  </React.StrictMode>
);

// 开发环境热更新
// Hot module replacement is handled by Vite automatically in development mode
