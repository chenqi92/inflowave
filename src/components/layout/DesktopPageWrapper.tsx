import React from 'react';
import { Typography } from '@/components/ui';

interface DesktopPageWrapperProps {
  title: string;
  description?: string;
  toolbar?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

const DesktopPageWrapper: React.FC<DesktopPageWrapperProps> = ({
  title,
  description,
  toolbar,
  children,
  className = '',
}) => {

  return (
    <div className={`desktop-page-container ${className}`}>
      {/* 页面头部 */}
      <div className='desktop-page-header'>
        {/* 标题和描述 */}
        <div className='flex items-start justify-between mb-6'>
          <div>
            <Typography.Title level={2} className='m-0 mb-2'>
              {title}
            </Typography.Title>
            {description && (
              <Typography.Text variant='muted' className='text-sm'>
                {description}
              </Typography.Text>
            )}
          </div>

          {/* 工具栏 */}
          {toolbar && <div className='desktop-page-toolbar'>{toolbar}</div>}
        </div>
      </div>

      {/* 页面内容 - 添加滚动容器 */}
      <div className='desktop-page-content'>
        <div className='desktop-page-scroll-container'>{children}</div>
      </div>
    </div>
  );
};

export default DesktopPageWrapper;
