import React, { useState } from 'react';
import { Text, Button, Space, Divider, Checkbox, Dialog, DialogContent, DialogHeader, DialogTitle, Alert } from '@/components/ui';
import { Info, Code, Globe, Monitor, X } from 'lucide-react';
import { isBrowserEnvironment } from '@/utils/tauri';
import { useNoticeStore } from '@/store/notice';

interface BrowserModeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const BrowserModeModal: React.FC<BrowserModeModalProps> = ({ isOpen, onClose }) => {
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
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Globe className="w-6 h-6 text-primary" />
            <span>🌐 InfloWave 功能预览</span>
          </DialogTitle>
        </DialogHeader>
      <div style={{ maxHeight: '70vh', overflowY: 'auto', padding: '8px 0' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <Text className="text-muted-foreground text-base leading-relaxed">
            欢迎体验 InfloWave 的界面和功能演示！<br />
            当前运行在浏览器预览模式，使用模拟数据展示应用特性
          </Text>
        </div>

        <Alert
          message="预览模式说明"
          description="您正在体验 InfloWave 的功能预览版本。完整的数据库连接、文件操作等功能需要在桌面应用中使用。"
          type="info"
          icon={<Info className="w-4 h-4"  />}
          showIcon
          style={{ marginBottom: '24px' }}
        />

        <div style={{ marginBottom: '24px' }}>
          <Text className="text-lg font-semibold block mb-2">🚀 获取完整版本</Text>
          <Text className="block mb-4 text-sm">
            要体验 InfloWave 的完整功能，请下载桌面应用版本：
          </Text>

          <div style={{
            background: '#f6f8fa',
            border: '1px solid #d1d9e0',
            borderRadius: '6px',
            padding: '12px',
            marginBottom: '12px'
          }}>
            <Text className="font-semibold block mb-1.5 text-sm">开发者模式：</Text>
            <div style={{ 
              backgroundColor: '#ffffff', 
              border: '1px solid #e1e4e8',
              borderRadius: '4px',
              padding: '8px 12px',
              marginBottom: '6px'
            }}>
              <code className="text-xs">npm run tauri:dev</code>
            </div>
            <Text className="text-muted-foreground text-xs">
              适用于开发和测试，支持热更新
            </Text>
          </div>

          <div style={{
            background: '#f6f8fa',
            border: '1px solid #d1d9e0',
            borderRadius: '6px',
            padding: '12px'
          }}>
            <Text className="font-semibold block mb-1.5 text-sm">生产版本：</Text>
            <div style={{ 
              backgroundColor: '#ffffff', 
              border: '1px solid #e1e4e8',
              borderRadius: '4px',
              padding: '8px 12px',
              marginBottom: '6px'
            }}>
              <code className="text-xs">npm run tauri:build</code>
            </div>
            <Text className="text-muted-foreground text-xs">
              构建优化的安装包，适用于日常使用
            </Text>
          </div>
        </div>

        <Divider />

        {/* 可用功能 */}
        <div style={{ marginBottom: '24px' }}>
          <Text className="text-lg font-semibold block mb-2">✨ 当前可用功能</Text>
          <div style={{
            background: '#f6ffed',
            border: '1px solid #b7eb8f',
            borderRadius: '6px',
            padding: '12px'
          }}>
            <div className="flex gap-2" direction="vertical" size="small" style={{ width: '100%' }}>
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
                <Text className="text-sm">完整界面展示和交互体验</Text>
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
                <Text className="text-sm">模拟数据演示和功能测试</Text>
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
                <Text className="text-sm">完整的设置和配置选项</Text>
              </div>
            </div>
          </div>
        </div>

        {/* 限制说明 */}
        <div style={{ marginBottom: '24px' }}>
          <Text className="text-lg font-semibold block mb-2">⚠️ 已知限制</Text>
          <div style={{
            background: '#fff7e6',
            border: '1px solid #ffd591',
            borderRadius: '6px',
            padding: '12px'
          }}>
            <div className="flex gap-2" direction="vertical" size="small" style={{ width: '100%' }}>
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
                <Text className="text-sm text-orange-600">无法连接真实数据库</Text>
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
                <Text className="text-sm text-orange-600">无法进行文件操作</Text>
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
                <Text className="text-sm text-orange-600">无法发送系统通知</Text>
              </div>
            </div>
          </div>
        </div>

        <Divider />

        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div className="flex gap-2" size="middle">
            <Button
              type="primary"
              icon={<Monitor />}
              onClick={() => {
                window.open('https://tauri.app/v1/guides/getting-started/setup/', '_blank');
              }}
            >
              了解 Tauri
            </Button>
            <Button
              icon={<Code className="w-4 h-4"  />}
              onClick={() => {
                window.open('https://github.com/chenqi92/inflowave', '_blank');
              }}
            >
              查看源码
            </Button>
          </div>
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
            onCheckedChange={(checked) => setDontShowAgain(checked)}
          >
            <Text className="text-sm">不再显示此提醒</Text>
          </Checkbox>
          
          <Button type="primary" onClick={handleClose}>
            开始体验
          </Button>
        </div>
      </div>
      </DialogContent>
    </Dialog>
  );
};

export default BrowserModeModal;