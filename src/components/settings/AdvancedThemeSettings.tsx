import React, { useState, useEffect } from 'react';
import { Row, Col, Switch, Slider, Select, Typography, Button, Radio, Checkbox, InputNumber, Upload, Tag, Alert, Tooltip, List, Badge } from '@/components/ui';
import { Space, Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui';

import { SkinOutlined, ShareAltOutlined, MoonOutlined, SunOutlined, ExperimentOutlined, DiamondOutlined } from '@/components/ui';
import { Settings, Eye, Upload, Download, RefreshCw, Copy, Lightbulb, Shrink, Expand, Image, Gift, Flame, Star, Heart, Zap, Crown, Palette, Type, Monitor, Square } from 'lucide-react';
import { useSettingsStore } from '@/store/settings';
import { showMessage } from '@/utils/message';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

interface AdvancedThemeSettingsProps {
  className?: string;
}

export const AdvancedThemeSettings: React.FC<AdvancedThemeSettingsProps> = ({
  className}) => {
  const { settings, updateTheme, updateSettings, saveSettings } = useSettingsStore();
  const [previewMode, setPreviewMode] = useState(false);
  const [customThemeModalVisible, setCustomThemeModalVisible] = useState(false);
  const [themeExportModalVisible, setThemeExportModalVisible] = useState(false);

  // 预定义主题
  const predefinedThemes = [
    {
      name: 'Default Light',
      key: 'default-light',
      mode: 'light' as const,
      primaryColor: '#1890ff',
      borderRadius: 6,
      compact: false,
      icon: <SunOutlined />},
    {
      name: 'Default Dark',
      key: 'default-dark',
      mode: 'dark' as const,
      primaryColor: '#1890ff',
      borderRadius: 6,
      compact: false,
      icon: <MoonOutlined />},
    {
      name: 'Compact Blue',
      key: 'compact-blue',
      mode: 'light' as const,
      primaryColor: '#096dd9',
      borderRadius: 4,
      compact: true,
      icon: <Shrink className="w-4 h-4"  />},
    {
      name: 'Green Nature',
      key: 'green-nature',
      mode: 'light' as const,
      primaryColor: '#52c41a',
      borderRadius: 8,
      compact: false,
      icon: <Heart className="w-4 h-4"  />},
    {
      name: 'Purple Dream',
      key: 'purple-dream',
      mode: 'light' as const,
      primaryColor: '#722ed1',
      borderRadius: 10,
      compact: false,
      icon: <Star className="w-4 h-4"  />},
    {
      name: 'Orange Sunset',
      key: 'orange-sunset',
      mode: 'light' as const,
      primaryColor: '#fa8c16',
      borderRadius: 6,
      compact: false,
      icon: <Flame className="w-4 h-4"  />},
    {
      name: 'Dark Professional',
      key: 'dark-professional',
      mode: 'dark' as const,
      primaryColor: '#13c2c2',
      borderRadius: 4,
      compact: false,
      icon: <Crown className="w-4 h-4"  />},
    {
      name: 'High Contrast',
      key: 'high-contrast',
      mode: 'light' as const,
      primaryColor: '#000000',
      borderRadius: 2,
      compact: true,
      icon: <Square />},
  ];

  // 主题色彩选项
  const colorOptions = [
    { label: 'Blue', value: '#1890ff', color: '#1890ff' },
    { label: 'Purple', value: '#722ed1', color: '#722ed1' },
    { label: 'Cyan', value: '#13c2c2', color: '#13c2c2' },
    { label: 'Green', value: '#52c41a', color: '#52c41a' },
    { label: 'Magenta', value: '#eb2f96', color: '#eb2f96' },
    { label: 'Red', value: '#f5222d', color: '#f5222d' },
    { label: 'Orange', value: '#fa8c16', color: '#fa8c16' },
    { label: 'Yellow', value: '#fadb14', color: '#fadb14' },
    { label: 'Lime', value: '#a0d911', color: '#a0d911' },
    { label: 'Gold', value: '#faad14', color: '#faad14' },
    { label: 'Volcano', value: '#fa541c', color: '#fa541c' },
    { label: 'Geek Blue', value: '#2f54eb', color: '#2f54eb' },
  ];

  // 字体选项
  const fontOptions = [
    { label: 'System Default', value: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
    { label: 'Inter', value: 'Inter, system-ui, sans-serif' },
    { label: 'Roboto', value: 'Roboto, sans-serif' },
    { label: 'Open Sans', value: '"Open Sans", sans-serif' },
    { label: 'Lato', value: 'Lato, sans-serif' },
    { label: 'Poppins', value: 'Poppins, sans-serif' },
    { label: 'Montserrat', value: 'Montserrat, sans-serif' },
    { label: 'Source Sans Pro', value: '"Source Sans Pro", sans-serif' },
  ];

  // 应用预定义主题
  const applyPredefinedTheme = (theme: typeof predefinedThemes[0]) => {
    updateTheme({
      mode: theme.mode,
      primaryColor: theme.primaryColor,
      borderRadius: theme.borderRadius,
      compact: theme.compact});
    showMessage.success(`已应用主题: ${theme.name}`);
  };

  // 导出主题配置
  const exportTheme = () => {
    const themeConfig = {
      name: 'Custom Theme',
      timestamp: new Date().toISOString(),
      theme: settings.theme,
      version: '1.0.0'};
    
    const blob = new Blob([JSON.stringify(themeConfig, null, 2)], {
      type: 'application/json'});
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `theme-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    showMessage.success('主题已导出到文件');
  };

  // 导入主题配置
  const importTheme = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const themeConfig = JSON.parse(e.target?.result as string);
        if (themeConfig.theme) {
          updateTheme(themeConfig.theme);
          showMessage.success(`已导入主题: ${themeConfig.name || 'Unknown'}`);
        } else {
          showMessage.error('无效的主题文件格式');
        }
      } catch (error) {
        showMessage.error('主题文件解析失败');
      }
    };
    reader.readAsText(file);
  };

  // 重置主题
  const resetTheme = () => {
    Modal.confirm({
      title: '重置主题',
      content: '确定要重置所有主题设置为默认值吗？',
      onOk: () => {
        updateTheme({
          mode: 'auto',
          primaryColor: '#1890ff',
          borderRadius: 6,
          compact: false});
        showMessage.success('主题已重置为默认设置');
      }});
  };

  // 复制主题配置
  const copyThemeConfig = () => {
    const themeConfig = JSON.stringify(settings.theme, null, 2);
    navigator.clipboard.writeText(themeConfig);
    showMessage.success('主题配置已复制到剪贴板');
  };

  return (
    <div className={className}>
      <Row gutter={[16, 16]}>
        {/* 主题模式设置 */}
        <Col span={24}>
          <div
            title={
              <div className="flex gap-2">
                <Lightbulb className="w-4 h-4"  />
                <span>主题模式</span>
              </div>
            }
            extra={
              <div className="flex gap-2">
                <Button
                  size="small"
                  icon={<Eye className="w-4 h-4"  />}
                  onClick={() => setPreviewMode(!previewMode)}
                >
                  {previewMode ? '退出预览' : '预览模式'}
                </Button>
                <Button
                  size="small"
                  icon={<RefreshCw className="w-4 h-4"  />}
                  onClick={resetTheme}
                >
                  重置
                </Button>
              </div>
            }
          >
            <Row gutter={[16, 16]}>
              <Col span={8}>
                <div style={{ textAlign: 'center' }}>
                  <Radio.Group
                    value={settings.theme.mode}
                    onValueChange={(e) => updateTheme({ mode: e.target.value })}
                    style={{ width: '100%' }}
                  >
                    <div className="flex gap-2" direction="vertical" style={{ width: '100%' }}>
                      <Radio value="light">
                        <div className="flex gap-2">
                          <SunOutlined />
                          <span>亮色模式</span>
                        </div>
                      </Radio>
                      <Radio value="dark">
                        <div className="flex gap-2">
                          <MoonOutlined />
                          <span>暗色模式</span>
                        </div>
                      </Radio>
                      <Radio value="auto">
                        <div className="flex gap-2">
                          <Monitor />
                          <span>跟随系统</span>
                        </div>
                      </Radio>
                    </div>
                  </Radio.Group>
                </div>
              </Col>
              <Col span={16}>
                <Row gutter={[8, 8]}>
                  <Col span={12}>
                    <div style={{ padding: '12px', border: '1px solid #d9d9d9', borderRadius: '6px', backgroundColor: '#fff' }}>
                      <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>亮色模式预览</div>
                      <div style={{ height: '60px', backgroundColor: '#f0f0f0', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <SunOutlined style={{ fontSize: '24px', color: settings.theme.primaryColor }} />
                      </div>
                    </div>
                  </Col>
                  <Col span={12}>
                    <div style={{ padding: '12px', border: '1px solid #434343', borderRadius: '6px', backgroundColor: '#141414' }}>
                      <div style={{ fontSize: '12px', color: '#999', marginBottom: '8px' }}>暗色模式预览</div>
                      <div style={{ height: '60px', backgroundColor: '#262626', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <MoonOutlined style={{ fontSize: '24px', color: settings.theme.primaryColor }} />
                      </div>
                    </div>
                  </Col>
                </Row>
              </Col>
            </Row>
          </div>
        </Col>

        {/* 预定义主题 */}
        <Col span={24}>
          <div
            title={
              <div className="flex gap-2">
                <SkinOutlined />
                <span>预定义主题</span>
              </div>
            }
          >
            <Row gutter={[12, 12]}>
              {predefinedThemes.map((theme) => (
                <Col key={theme.key} span={6}>
                  <div
                    size="small"
                    hoverable
                    style={{ 
                      cursor: 'pointer',
                      borderColor: settings.theme.primaryColor === theme.primaryColor ? settings.theme.primaryColor : '#d9d9d9',
                      borderWidth: settings.theme.primaryColor === theme.primaryColor ? '2px' : '1px'}}
                    onClick={() => applyPredefinedTheme(theme)}
                  >
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '24px', color: theme.primaryColor, marginBottom: '8px' }}>
                        {theme.icon}
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>
                        {theme.name}
                      </div>
                      <div style={{ fontSize: '11px', color: '#666' }}>
                        {theme.mode === 'light' ? '亮色' : '暗色'}
                        {theme.compact && ' • 紧凑'}
                      </div>
                    </div>
                  </div>
                </Col>
              ))}
            </Row>
          </div>
        </Col>

        {/* 主题色彩设置 */}
        <Col span={12}>
          <div
            title={
              <div className="flex gap-2">
                <Palette />
                <span>主题色彩</span>
              </div>
            }
          >
            <div className="flex gap-2" direction="vertical" style={{ width: '100%' }}>
              <div>
                <Text strong>主色调</Text>
                <div style={{ marginTop: '8px' }}>
                  <Row gutter={[8, 8]}>
                    {colorOptions.map((color) => (
                      <Col key={color.value} span={4}>
                        <Tooltip title={color.label}>
                          <div
                            style={{
                              width: '32px',
                              height: '32px',
                              backgroundColor: color.color,
                              borderRadius: '6px',
                              cursor: 'pointer',
                              border: settings.theme.primaryColor === color.value ? '3px solid #fff' : '1px solid #d9d9d9',
                              boxShadow: settings.theme.primaryColor === color.value ? `0 0 0 2px ${color.color}` : 'none'}}
                            onClick={() => updateTheme({ primaryColor: color.value })}
                          />
                        </Tooltip>
                      </Col>
                    ))}
                  </Row>
                </div>
              </div>
              
              <div>
                <Text strong>自定义颜色</Text>
                <div style={{ marginTop: '8px' }}>
                  <ColorPicker
                    value={settings.theme.primaryColor}
                    onValueChange={(value) => updateTheme({ primaryColor: typeof value === 'string' ? value : value.toHexString() })}
                    showText
                    allowClear={false}
                    presets={[
                      {
                        label: '推荐色彩',
                        colors: colorOptions.map(c => c.value)},
                    ]}
                  />
                </div>
              </div>
            </div>
          </div>
        </Col>

        {/* 界面设置 */}
        <Col span={12}>
          <div
            title={
              <div className="flex gap-2">
                <Settings className="w-4 h-4"  />
                <span>界面设置</span>
              </div>
            }
          >
            <div className="flex gap-2" direction="vertical" style={{ width: '100%' }}>
              <div>
                <Row justify="space-between" align="middle">
                  <Text strong>紧凑模式</Text>
                  <Switch
                    checked={settings.theme.compact}
                    onValueChange={(checked) => updateTheme({ compact: checked })}
                  />
                </Row>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  启用后界面元素间距会更紧凑
                </Text>
              </div>
              
              <div>
                <Text strong>圆角半径</Text>
                <div style={{ marginTop: '8px' }}>
                  <Slider
                    min={0}
                    max={20}
                    step={1}
                    value={settings.theme.borderRadius}
                    onValueChange={(value) => updateTheme({ borderRadius: value })}
                    marks={{
                      0: '0px',
                      6: '6px',
                      12: '12px',
                      20: '20px'}}
                  />
                </div>
              </div>
            </div>
          </div>
        </Col>

        {/* 高级设置 */}
        <Col span={24}>
          <div
            title={
              <div className="flex gap-2">
                <ExperimentOutlined />
                <span>高级设置</span>
              </div>
            }
            extra={
              <div className="flex gap-2">
                <Button
                  size="small"
                  icon={<Copy className="w-4 h-4"  />}
                  onClick={copyThemeConfig}
                >
                  复制配置
                </Button>
                <Button
                  size="small"
                  icon={<Download className="w-4 h-4"  />}
                  onClick={exportTheme}
                >
                  导出主题
                </Button>
                <Upload
                  accept=".json"
                  showUploadList={false}
                  beforeUpload={(file) => {
                    importTheme(file);
                    return false;
                  }}
                >
                  <Button size="small" icon={<Upload className="w-4 h-4"  />}>
                    导入主题
                  </Button>
                </Upload>
              </div>
            }
          >
            <Row gutter={[16, 16]}>
              <Col span={8}>
                <div>
                  <Text strong>字体设置</Text>
                  <div style={{ marginTop: '8px' }}>
                    <Select
                      style={{ width: '100%' }}
                      value={settings.editor.fontFamily}
                      onValueChange={(value) => updateSettings({ 
                        editor: { ...settings.editor, fontFamily: value }
                      })}
                      placeholder="选择字体"
                    >
                      {fontOptions.map((font) => (
                        <Option key={font.value} value={font.value}>
                          {font.label}
                        </Option>
                      ))}
                    </Select>
                  </div>
                </div>
              </Col>
              
              <Col span={8}>
                <div>
                  <Text strong>字体大小</Text>
                  <div style={{ marginTop: '8px' }}>
                    <InputNumber
                      min={10}
                      max={24}
                      value={settings.editor.fontSize}
                      onValueChange={(value) => updateSettings({ 
                        editor: { ...settings.editor, fontSize: value || 14 }
                      })}
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>
              </Col>
              
              <Col span={8}>
                <div>
                  <Text strong>行高</Text>
                  <div style={{ marginTop: '8px' }}>
                    <InputNumber
                      min={1}
                      max={3}
                      step={0.1}
                      value={settings.editor.lineHeight}
                      onValueChange={(value) => updateSettings({ 
                        editor: { ...settings.editor, lineHeight: value || 1.5 }
                      })}
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>
              </Col>
            </Row>
          </div>
        </Col>

        {/* 主题效果预览 */}
        <Col span={24}>
          <div
            title={
              <div className="flex gap-2">
                <Eye className="w-4 h-4"  />
                <span>主题效果预览</span>
              </div>
            }
          >
            <div style={{ 
              padding: '16px',
              backgroundColor: settings.theme.mode === 'dark' ? '#141414' : '#fafafa',
              borderRadius: settings.theme.borderRadius,
              border: `1px solid ${settings.theme.mode === 'dark' ? '#434343' : '#d9d9d9'}`}}>
              <Row gutter={[16, 16]}>
                <Col span={8}>
                  <div style={{ 
                    padding: settings.theme.compact ? '8px' : '12px',
                    backgroundColor: settings.theme.mode === 'dark' ? '#1f1f1f' : '#fff',
                    borderRadius: settings.theme.borderRadius,
                    border: `1px solid ${settings.theme.mode === 'dark' ? '#434343' : '#d9d9d9'}`}}>
                    <div style={{ color: settings.theme.primaryColor, marginBottom: '8px' }}>
                      <DiamondOutlined /> 卡片标题
                    </div>
                    <div style={{ color: settings.theme.mode === 'dark' ? '#fff' : '#000' }}>
                      这是一个预览卡片，展示当前主题的效果。
                    </div>
                  </div>
                </Col>
                <Col span={8}>
                  <div style={{ 
                    padding: settings.theme.compact ? '8px' : '12px',
                    backgroundColor: settings.theme.primaryColor,
                    borderRadius: settings.theme.borderRadius,
                    color: '#fff'}}>
                    <div style={{ marginBottom: '8px' }}>
                      <Zap className="w-4 h-4"  /> 主要按钮
                    </div>
                    <div>
                      这是使用主题色的组件预览。
                    </div>
                  </div>
                </Col>
                <Col span={8}>
                  <div style={{ 
                    padding: settings.theme.compact ? '8px' : '12px',
                    backgroundColor: settings.theme.mode === 'dark' ? '#262626' : '#f0f0f0',
                    borderRadius: settings.theme.borderRadius,
                    color: settings.theme.mode === 'dark' ? '#fff' : '#000'}}>
                    <div style={{ marginBottom: '8px' }}>
                      <Gift className="w-4 h-4"  /> 次要内容
                    </div>
                    <div>
                      这是次要内容区域的预览。
                    </div>
                  </div>
                </Col>
              </Row>
            </div>
          </div>
        </Col>
      </Row>
    </div>
  );
};

export default AdvancedThemeSettings;