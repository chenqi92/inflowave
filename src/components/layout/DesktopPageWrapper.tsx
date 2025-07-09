import React from 'react';
import { Typography, Button, Breadcrumb } from 'antd';
import { HomeOutlined, RightOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

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
  className = '',
}) => {
  const navigate = useNavigate();

  // 生成面包屑导航
  const generateBreadcrumb = () => {
    const items = [
      {
        title: (
          <Button 
            type="text" 
            size="small" 
            icon={<HomeOutlined />}
            onClick={() => navigate('/dashboard')}
            style={{ padding: '0 4px', height: '20px' }}
          />
        ),
      },
    ];

    if (breadcrumb && breadcrumb.length > 0) {
      breadcrumb.forEach((item, index) => {
        items.push({
          title: item.path ? (
            <Button
              type="text"
              size="small"
              onClick={() => navigate(item.path!)}
              style={{ padding: '0 4px', height: '20px' }}
            >
              {item.title}
            </Button>
          ) : (
            item.title
          ),
        });
      });
    } else {
      items.push({
        title,
      });
    }

    return items;
  };

  return (
    <div className={`desktop-page-container ${className}`}>
      {/* 页面头部 */}
      <div className="desktop-page-header">
        {/* 面包屑导航 */}
        <div className="mb-4">
          <Breadcrumb
            items={generateBreadcrumb()}
            separator={<RightOutlined style={{ fontSize: '10px' }} />}
          />
        </div>

        {/* 标题和描述 */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <Title level={2} style={{ margin: 0, marginBottom: 8 }}>
              {title}
            </Title>
            {description && (
              <Text type="secondary" style={{ fontSize: '14px' }}>
                {description}
              </Text>
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

      {/* 页面内容 */}
      <div className="desktop-page-content">
        {children}
      </div>
    </div>
  );
};

export default DesktopPageWrapper;
