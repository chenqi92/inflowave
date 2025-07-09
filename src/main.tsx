import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ConfigProvider, theme, App as AntdApp } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import enUS from 'antd/locale/en_US';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import relativeTime from 'dayjs/plugin/relativeTime';
import duration from 'dayjs/plugin/duration';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

import App from './App';
import { useAppStore } from '@/store/app';
import { setMessageInstance, setNotificationInstance } from '@/utils/message';
import './styles/index.css';

// 配置 dayjs
dayjs.extend(relativeTime);
dayjs.extend(duration);
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.locale('zh-cn');

// 内部应用组件
const InnerApp: React.FC = () => {
  const { message, notification } = AntdApp.useApp();

  React.useEffect(() => {
    setMessageInstance(message);
    setNotificationInstance(notification);
  }, [message, notification]);

  return <App />;
};

// 主应用组件
const AppWrapper: React.FC = () => {
  const { config } = useAppStore();
  
  // 主题配置
  const themeConfig = React.useMemo(() => {
    const isDark = config.theme === 'dark' || 
      (config.theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    
    return {
      algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
      token: {
        colorPrimary: '#1890ff',
        borderRadius: 6,
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 14,
        lineHeight: 1.5,
      },
      components: {
        Layout: {
          headerBg: isDark ? '#1f2937' : '#ffffff',
          siderBg: isDark ? '#111827' : '#f8fafc',
          bodyBg: isDark ? '#1f2937' : '#ffffff',
        },
        Menu: {
          itemBg: 'transparent',
          subMenuItemBg: 'transparent',
        },
        Table: {
          headerBg: isDark ? '#374151' : '#fafafa',
        },
        Card: {
          headerBg: isDark ? '#374151' : '#fafafa',
        },
      },
    };
  }, [config.theme]);
  
  // 语言配置
  const locale = config.language === 'en-US' ? enUS : zhCN;
  
  return (
    <ConfigProvider theme={themeConfig} locale={locale}>
      <AntdApp>
        <BrowserRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <InnerApp />
        </BrowserRouter>
      </AntdApp>
    </ConfigProvider>
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
