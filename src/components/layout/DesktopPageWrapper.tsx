import React from 'react';
import { Button, Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator } from '@/components/ui';
import { Typography } from '@/components/ui';
import { Home, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface DesktopPageWrapperProps {
  title: string;
  description?: string;
  breadcrumb?: Array<{
    title: string;
    path?: string;
  }>;
  toolbar?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

const DesktopPageWrapper: React.FC<DesktopPageWrapperProps> = ({
  title,
  description,
  breadcrumb,
  toolbar,
  children,
  className = ''}) => {
  const navigate = useNavigate();

  // 生成面包屑导航
  const renderBreadcrumb = () => {
    return (
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink 
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-1 cursor-pointer hover:text-foreground"
            >
              <Home className="w-4 h-4" />
            </BreadcrumbLink>
          </BreadcrumbItem>
          
          {breadcrumb && breadcrumb.length > 0 ? (
            breadcrumb.map((item, index) => (
              <React.Fragment key={index}>
                <BreadcrumbSeparator>
                  <ChevronRight className="w-4 h-4" />
                </BreadcrumbSeparator>
                <BreadcrumbItem>
                  {item.path ? (
                    <BreadcrumbLink 
                      onClick={() => navigate(item.path!)}
                      className="cursor-pointer hover:text-foreground"
                    >
                      {item.title}
                    </BreadcrumbLink>
                  ) : (
                    <span className="text-foreground">{item.title}</span>
                  )}
                </BreadcrumbItem>
              </React.Fragment>
            ))
          ) : (
            <>
              <BreadcrumbSeparator>
                <ChevronRight className="w-4 h-4" />
              </BreadcrumbSeparator>
              <BreadcrumbItem>
                <span className="text-foreground">{title}</span>
              </BreadcrumbItem>
            </>
          )}
        </BreadcrumbList>
      </Breadcrumb>
    );
  };

  return (
    <div className={`desktop-page-container ${className}`}>
      {/* 页面头部 */}
      <div className="desktop-page-header">
        {/* 面包屑导航 */}
        <div className="mb-4">
          {renderBreadcrumb()}
        </div>

        {/* 标题和描述 */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <Typography.Title level={2} className="m-0 mb-2">
              {title}
            </Typography.Title>
            {description && (
              <Typography.Text variant="muted" className="text-sm">
                {description}
              </Typography.Text>
            )}
          </div>

          {/* 工具栏 */}
          {toolbar && (
            <div className="desktop-page-toolbar">
              {toolbar}
            </div>
          )}
        </div>
      </div>

      {/* 页面内容 - 添加滚动容器 */}
      <div className="desktop-page-content">
        <div className="desktop-page-scroll-container">
          {children}
        </div>
      </div>
    </div>
  );
};

export default DesktopPageWrapper;
