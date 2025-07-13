import React, { useState } from 'react';
import { Modal, Alert, Typography, Button, Space, Divider, Checkbox } from 'antd';
import {
  InfoCircleOutlined,
  CodeOutlined,
  GlobalOutlined,
  DesktopOutlined,
  CloseOutlined
} from '@ant-design/icons';
import { isBrowserEnvironment } from '@/utils/tauri';
import { useNoticeStore } from '@/store/notice';

const { Title, Text, Paragraph } = Typography;

interface BrowserModeModalProps {
  visible: boolean;
  onClose: () => void;
}

const BrowserModeModal: React.FC<BrowserModeModalProps> = ({ visible, onClose }) => {
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const { dismissBrowserModeNotice } = useNoticeStore();

  const handleClose = () => {
    if (dontShowAgain) {
      dismissBrowserModeNotice();
    }
    onClose();
  };

  if (!isBrowserEnvironment()) {
    return null;
  }

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <GlobalOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
          <span>🌐 InfloWave 功能预览</span>
        </div>
      }
      open={visible}
      onCancel={handleClose}
      footer={null}
      width={800}
      centered
      closeIcon={<CloseOutlined />}
    >
      <div style={{ maxHeight: '70vh', overflowY: 'auto', padding: '8px 0' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <Text type="secondary" style={{ fontSize: '16px', lineHeight: '1.6' }}>
            欢迎体验 InfloWave 的界面和功能演示！<br />
            当前运行在浏览器预览模式，使用模拟数据展示应用特性
          </Text>
        </div>

        <Alert
          message="预览模式说明"
          description="您正在体验 InfloWave 的功能预览版本。完整的数据库连接、文件操作等功能需要在桌面应用中使用。"
          type="info"
          icon={<InfoCircleOutlined />}
          showIcon
          style={{ marginBottom: '24px' }}
        />

        <div style={{ marginBottom: '24px' }}>
          <Title level={5}>🚀 获取完整版本</Title>
          <Paragraph style={{ marginBottom: '16px', fontSize: '14px' }}>
            要体验 InfloWave 的完整功能，请下载桌面应用版本：
          </Paragraph>

          <div style={{
            background: '#f6f8fa',
            border: '1px solid #d1d9e0',
            borderRadius: '6px',
            padding: '12px',
            marginBottom: '12px'
          }}>
            <Text strong style={{ display: 'block', marginBottom: '6px', fontSize: '14px' }}>开发者模式：</Text>
            <div style={{ 
              backgroundColor: '#ffffff', 
              border: '1px solid #e1e4e8',
              borderRadius: '4px',
              padding: '8px 12px',
              marginBottom: '6px'
            }}>
              <Text code style={{ fontSize: '13px' }}>npm run tauri:dev</Text>
            </div>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              适用于开发和测试，支持热更新
            </Text>
          </div>

          <div style={{
            background: '#f6f8fa',
            border: '1px solid #d1d9e0',
            borderRadius: '6px',
            padding: '12px'
          }}>
            <Text strong style={{ display: 'block', marginBottom: '6px', fontSize: '14px' }}>生产版本：</Text>
            <div style={{ 
              backgroundColor: '#ffffff', 
              border: '1px solid #e1e4e8',
              borderRadius: '4px',
              padding: '8px 12px',
              marginBottom: '6px'
            }}>
              <Text code style={{ fontSize: '13px' }}>npm run tauri:build</Text>
            </div>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              构建优化的安装包，适用于日常使用
            </Text>
          </div>
        </div>

        <Divider />

        {/* 可用功能 */}
        <div style={{ marginBottom: '24px' }}>
          <Title level={5}>✨ 当前可用功能</Title>
          <div style={{
            background: '#f6ffed',
            border: '1px solid #b7eb8f',
            borderRadius: '6px',
            padding: '12px'
          }}>
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '16px',
                  height: '16px',
                  background: '#52c41a',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <span style={{ color: 'white', fontSize: '10px', fontWeight: 'bold' }}>✓</span>
                </div>
                <Text style={{ fontSize: '14px' }}>完整界面展示和交互体验</Text>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '16px',
                  height: '16px',
                  background: '#52c41a',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <span style={{ color: 'white', fontSize: '10px', fontWeight: 'bold' }}>✓</span>
                </div>
                <Text style={{ fontSize: '14px' }}>模拟数据演示和功能测试</Text>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '16px',
                  height: '16px',
                  background: '#52c41a',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <span style={{ color: 'white', fontSize: '10px', fontWeight: 'bold' }}>✓</span>
                </div>
                <Text style={{ fontSize: '14px' }}>完整的设置和配置选项</Text>
              </div>
            </Space>
          </div>
        </div>

        {/* 限制说明 */}
        <div style={{ marginBottom: '24px' }}>
          <Title level={5}>⚠️ 已知限制</Title>
          <div style={{
            background: '#fff7e6',
            border: '1px solid #ffd591',
            borderRadius: '6px',
            padding: '12px'
          }}>
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '16px',
                  height: '16px',
                  background: '#fa8c16',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <span style={{ color: 'white', fontSize: '10px', fontWeight: 'bold' }}>!</span>
                </div>
                <Text style={{ fontSize: '14px', color: '#d46b08' }}>无法连接真实数据库</Text>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '16px',
                  height: '16px',
                  background: '#fa8c16',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <span style={{ color: 'white', fontSize: '10px', fontWeight: 'bold' }}>!</span>
                </div>
                <Text style={{ fontSize: '14px', color: '#d46b08' }}>无法进行文件操作</Text>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '16px',
                  height: '16px',
                  background: '#fa8c16',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <span style={{ color: 'white', fontSize: '10px', fontWeight: 'bold' }}>!</span>
                </div>
                <Text style={{ fontSize: '14px', color: '#d46b08' }}>无法发送系统通知</Text>
              </div>
            </Space>
          </div>
        </div>

        <Divider />

        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <Space size="middle">
            <Button
              type="primary"
              icon={<DesktopOutlined />}
              onClick={() => {
                window.open('https://tauri.app/v1/guides/getting-started/setup/', '_blank');
              }}
            >
              了解 Tauri
            </Button>
            <Button
              icon={<CodeOutlined />}
              onClick={() => {
                window.open('https://github.com/chenqi92/inflowave', '_blank');
              }}
            >
              查看源码
            </Button>
          </Space>
        </div>

        <div style={{ 
          borderTop: '1px solid #f0f0f0', 
          paddingTop: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <Checkbox 
            checked={dontShowAgain}
            onChange={(e) => setDontShowAgain(e.target.checked)}
          >
            <Text style={{ fontSize: '14px' }}>不再显示此提醒</Text>
          </Checkbox>
          
          <Button type="primary" onClick={handleClose}>
            开始体验
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default BrowserModeModal;