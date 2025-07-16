import React from 'react';
import { Space, Alert, Button, Text, Separator } from '@/components/ui';
import { Info, Code, Globe, Monitor } from 'lucide-react';
import { isBrowserEnvironment } from '@/utils/tauri';

const BrowserModeNotice: React.FC = () => {
  if (!isBrowserEnvironment()) {
    return null;
  }

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <div>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <Globe className="w-4 h-4" style={{ fontSize: '48px', color: '#1890ff', marginBottom: '16px' }}  />
          <Text className="text-2xl font-bold block">🌐 InfloWave 功能预览</Text>
          <Text type="secondary" style={{ fontSize: '16px', lineHeight: '1.6' }}>
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
          style={{ marginBottom: '32px' }}
        />

        <div style={{ marginBottom: '32px' }}>
          <Text className="text-lg font-semibold block mb-2">🚀 获取完整版本</Text>
          <Text className="block mb-4">
            要体验 InfloWave 的完整功能，包括真实数据库连接和文件操作，请下载桌面应用版本：
          </Text>

          <div style={{
            background: '#f6f8fa',
            border: '1px solid #d1d9e0',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '16px'
          }}>
            <Text className="font-semibold block mb-2">开发者模式：</Text>
            <div className="mb-2" style={{ backgroundColor: '#ffffff' }}>
              <code className="text-sm">npm run tauri:dev</code>
            </div>
            <Text className="text-muted-foreground text-sm">
              适用于开发和测试，支持热更新
            </Text>
          </div>

          <div style={{
            background: '#f6f8fa',
            border: '1px solid #d1d9e0',
            borderRadius: '8px',
            padding: '16px'
          }}>
            <Text className="font-semibold block mb-2">生产版本：</Text>
            <div className="mb-2" style={{ backgroundColor: '#ffffff' }}>
              <code className="text-sm">npm run tauri:build</code>
            </div>
            <Text className="text-muted-foreground text-sm">
              构建优化的安装包，适用于日常使用
            </Text>
          </div>
        </div>

        <Separator />

        {/* 可用功能 */}
        <div style={{ marginBottom: '32px' }}>
          <Text className="text-lg font-semibold block mb-2">✨ 当前可用功能</Text>
          <div style={{
            background: '#f6ffed',
            border: '1px solid #b7eb8f',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '24px'
          }}>
            <div className="flex gap-2" direction="vertical" size="middle" style={{ width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{
                  width: '24px',
                  height: '24px',
                  background: '#52c41a',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <span style={{ color: 'white', fontSize: '12px', fontWeight: 'bold' }}>✓</span>
                </div>
                <div>
                  <Text className="font-semibold text-sm">完整界面展示</Text>
                  <br />
                  <Text className="text-muted-foreground">所有页面、组件和交互元素的完整展示</Text>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{
                  width: '24px',
                  height: '24px',
                  background: '#52c41a',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <span style={{ color: 'white', fontSize: '12px', fontWeight: 'bold' }}>✓</span>
                </div>
                <div>
                  <Text className="font-semibold text-sm">模拟数据演示</Text>
                  <br />
                  <Text className="text-muted-foreground">使用预设的示例数据展示各项功能特性</Text>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{
                  width: '24px',
                  height: '24px',
                  background: '#52c41a',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <span style={{ color: 'white', fontSize: '12px', fontWeight: 'bold' }}>✓</span>
                </div>
                <div>
                  <Text className="font-semibold text-sm">交互体验测试</Text>
                  <br />
                  <Text className="text-muted-foreground">按钮点击、表单填写、菜单导航等交互功能</Text>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 已知限制 */}
        <div style={{ marginBottom: '32px' }}>
          <Text className="text-lg font-semibold block mb-2">⚠️ 已知限制</Text>
          <Text className="block mb-4 text-muted-foreground">
            以下功能需要在桌面应用环境中才能正常使用，这些是计划中的核心特性：
          </Text>
          <div style={{
            background: '#fff7e6',
            border: '1px solid #ffd591',
            borderRadius: '8px',
            padding: '16px'
          }}>
            <div className="flex gap-2" direction="vertical" size="middle" style={{ width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{
                  width: '24px',
                  height: '24px',
                  background: '#fa8c16',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <span style={{ color: 'white', fontSize: '12px', fontWeight: 'bold' }}>!</span>
                </div>
                <div>
                  <Text className="font-semibold text-sm text-orange-600">真实数据库连接</Text>
                  <br />
                  <Text className="text-muted-foreground">
                    无法连接到真实的 InfluxDB 实例进行数据查询和管理操作
                  </Text>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{
                  width: '24px',
                  height: '24px',
                  background: '#fa8c16',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <span style={{ color: 'white', fontSize: '12px', fontWeight: 'bold' }}>!</span>
                </div>
                <div>
                  <Text className="font-semibold text-sm text-orange-600">文件系统操作</Text>
                  <br />
                  <Text className="text-muted-foreground">
                    无法进行文件导入导出、配置保存等本地文件系统操作
                  </Text>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{
                  width: '24px',
                  height: '24px',
                  background: '#fa8c16',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <span style={{ color: 'white', fontSize: '12px', fontWeight: 'bold' }}>!</span>
                </div>
                <div>
                  <Text className="font-semibold text-sm text-orange-600">系统通知</Text>
                  <br />
                  <Text className="text-muted-foreground">
                    无法发送桌面通知和系统级提醒消息
                  </Text>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 即将推出 */}
        <div style={{ marginBottom: '32px' }}>
          <Text className="text-lg font-semibold block mb-2">🚀 即将推出</Text>
          <Text className="block mb-4 text-muted-foreground">
            这些核心功能将在桌面应用版本中完全实现，为您提供专业级的数据库管理体验：
          </Text>
          <div style={{
            background: '#f0f9ff',
            border: '1px solid #91d5ff',
            borderRadius: '8px',
            padding: '16px'
          }}>
            <div className="flex gap-2" direction="vertical" size="middle" style={{ width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{
                  width: '24px',
                  height: '24px',
                  background: '#1890ff',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <span style={{ color: 'white', fontSize: '12px', fontWeight: 'bold' }}>🔗</span>
                </div>
                <div>
                  <Text className="font-semibold text-sm text-primary">多实例连接管理</Text>
                  <br />
                  <Text className="text-muted-foreground">
                    支持同时连接多个 InfluxDB 实例，实时状态监控和连接池管理
                  </Text>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{
                  width: '24px',
                  height: '24px',
                  background: '#1890ff',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <span style={{ color: 'white', fontSize: '12px', fontWeight: 'bold' }}>📁</span>
                </div>
                <div>
                  <Text className="font-semibold text-sm text-primary">高效数据导入导出</Text>
                  <br />
                  <Text className="text-muted-foreground">
                    支持 CSV、JSON、Parquet 等多种格式的批量数据导入导出功能
                  </Text>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{
                  width: '24px',
                  height: '24px',
                  background: '#1890ff',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <span style={{ color: 'white', fontSize: '12px', fontWeight: 'bold' }}>🔔</span>
                </div>
                <div>
                  <Text className="font-semibold text-sm text-primary">智能通知系统</Text>
                  <br />
                  <Text className="text-muted-foreground">
                    查询完成、连接状态变化、系统告警等事件的桌面通知提醒
                  </Text>
                </div>
              </div>
            </div>
          </div>
        </div>

        <Separator />

        <div style={{ textAlign: 'center' }}>
          <div className="flex gap-2" size="large">
            <Button
              size="lg"
              onClick={() => {
                window.open('https://tauri.app/v1/guides/getting-started/setup/', '_blank');
              }}
            >
              <Monitor className="w-4 h-4 mr-2" />
              了解 Tauri
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => {
                window.open('https://github.com/chenqi92/inflowave', '_blank');
              }}
            >
              <Code className="w-4 h-4 mr-2" />
              查看源码
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrowserModeNotice;
