import React from 'react';
import { LogViewer } from '@/components/debug/LogViewer';

/**
 * 日志页面
 * 用于查看和管理前后端日志
 */
export const LogsPage: React.FC = () => {
  return (
    <div className="h-full w-full p-4">
      <LogViewer />
    </div>
  );
};

export default LogsPage;

