import { useForm } from 'react-hook-form';
import React, { useState, useEffect } from 'react';
import {
  Tabs,
  Form,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Button,
  Typography,
  Table,
  Row,
  Col,
  Tag,
  Switch,
  Slider,
  Radio,
  Modal,
  Tooltip,
  FormItem
} from '@/components/ui';
import { showMessage, showNotification } from '@/utils/message';

import { LayoutOutlined } from '@/components/ui';
import { Settings, Eye, Save, RefreshCw, Edit, Plus, Key, Bell } from 'lucide-react';
import { safeTauriInvoke } from '@/utils/tauri';
import type { 
  UserPreferences, 
  KeyboardShortcut, 
  NotificationSettings,
  AccessibilitySettings,
  WorkspaceSettings 
} from '@/types';

const { Title, Text } = Typography;

interface UserExperienceSettingsProps {
  onSettingsChange?: (settings: UserPreferences) => void;
}

const UserExperienceSettings: React.FC<UserExperienceSettingsProps> = ({
  onSettingsChange}) => {
  const [loading, setLoading] = useState(false);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [editingShortcut, setEditingShortcut] = useState<KeyboardShortcut | null>(null);
  const [showShortcutModal, setShowShortcutModal] = useState(false);
  const form = useForm();
  const shortcutForm = useForm();

  // 加载用户偏好设置
  const loadPreferences = async () => {
    setLoading(true);
    try {
      const prefs = await safeTauriInvoke<UserPreferences>('get_user_preferences');
      setPreferences(prefs);
      if (prefs) {
        form.reset({
          notifications: prefs.notifications,
          accessibility: prefs.accessibility,
          workspace: prefs.workspace});
      }
    } catch (error) {
      showNotification.error({
        message: "加载用户偏好失败",
        description: String(error)
      });
    } finally {
      setLoading(false);
    }
  };

  // 保存用户偏好设置
  const savePreferences = async (values: any) => {
    try {
      const updatedPreferences: UserPreferences = {
        ...preferences!,
        notifications: values.notifications,
        accessibility: values.accessibility,
        workspace: values.workspace};

      await safeTauriInvoke('update_user_preferences', { preferences: updatedPreferences });
      setPreferences(updatedPreferences);
      onSettingsChange?.(updatedPreferences);
      showMessage.success("设置已保存" );
    } catch (error) {
      showNotification.error({
        message: "保存设置失败",
        description: String(error)
      });
    }
  };

  // 重置为默认设置
  const resetToDefaults = async () => {
    try {
      const defaultPrefs = await safeTauriInvoke<UserPreferences>('get_default_user_preferences');
      await safeTauriInvoke('update_user_preferences', { preferences: defaultPrefs });
      setPreferences(defaultPrefs);
      form.reset({
        notifications: defaultPrefs.notifications,
        accessibility: defaultPrefs.accessibility,
        workspace: defaultPrefs.workspace});
      showMessage.success("已重置为默认设置" );
    } catch (error) {
      showNotification.error({
        message: "重置设置失败",
        description: String(error)
      });
    }
  };

  // 更新快捷键
  const updateShortcut = async (shortcut: KeyboardShortcut) => {
    try {
      const updatedShortcuts = preferences!.shortcuts.map(s => 
        s.id === shortcut.id ? shortcut : s
      );
      
      const updatedPreferences = {
        ...preferences!,
        shortcuts: updatedShortcuts};

      await safeTauriInvoke('update_user_preferences', { preferences: updatedPreferences });
      setPreferences(updatedPreferences);
      showMessage.success("快捷键已更新" );
    } catch (error) {
      showNotification.error({
        message: "更新快捷键失败",
        description: String(error)
      });
    }
  };

  // 快捷键表格列
  const shortcutColumns = [
    {
      title: '功能',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: KeyboardShortcut) => (
        <div>
          <Text strong>{name}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.description}
          </Text>
        </div>
      )},
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 120,
      render: (category: string) => <Tag color="blue">{category}</Tag>},
    {
      title: '快捷键',
      dataIndex: 'keys',
      key: 'keys',
      width: 200,
      render: (keys: string[]) => (
        <div className="flex gap-2">
          {keys.map((key, index) => (
            <Tag key={index} color="orange">{key}</Tag>
          ))}
        </div>
      )},
    {
      title: '状态',
      dataIndex: 'enabled',
      key: 'enabled',
      width: 80,
      render: (enabled: boolean) => (
        <Tag color={enabled ? 'green' : 'red'}>
          {enabled ? '启用' : '禁用'}
        </Tag>
      )},
    {
      title: '操作',
      key: 'actions',
      width: 100,
      render: (_: any, record: KeyboardShortcut) => (
        <Button
          type="text"
          icon={<Edit className="w-4 h-4"  />}
          onClick={() => {
            setEditingShortcut(record);
            shortcutForm.setFieldsValue({
              keys: record.keys.join('+'),
              enabled: record.enabled});
            setShowShortcutModal(true);
          }}
          size="small">
          编辑
        </Button>
      )},
  ];

  useEffect(() => {
    loadPreferences();
  }, []);

  if (!preferences) {
    return <div>加载中...</div>;
  }

  return (
    <div style={{ padding: '16px' }}>
      <div
        title={
          <div className="flex gap-2">
            <Settings className="w-4 h-4"  />
            <span>用户体验设置</span>
          </div>
        }
        extra={
          <div className="flex gap-2">
            <Button onClick={resetToDefaults}>
              重置默认
            </Button>
            <Button
              type="primary"
              icon={<Save className="w-4 h-4"  />}
              onClick={() => form.submit()}
              disabled={loading}>
              保存设置
            </Button>
          </div>
        }>
        <Form
          form={form}
          layout="vertical"
          onFinish={savePreferences}
          initialValues={{
            notifications: preferences.notifications,
            accessibility: preferences.accessibility,
            workspace: preferences.workspace}}>
          <Tabs
            items={[
              {
                key: 'shortcuts',
                label: (
                  <div className="flex gap-2">
                    <Key className="w-4 h-4"  />
                    快捷键
                  </div>
                ),
                children: (
                  <div>
                    <div style={{ marginBottom: 16 }}>
                      <Text type="secondary">
                        自定义键盘快捷键以提高工作效率。点击编辑按钮修改快捷键组合。
                      </Text>
                    </div>
                    <Table
                      columns={shortcutColumns}
                      dataSource={preferences.shortcuts}
                      rowKey="id"
                      pagination={{ pageSize: 10 }}
                      size="small"
                    />
                  </div>
                )},
              {
                key: 'notifications',
                label: (
                  <div className="flex gap-2">
                    <Bell className="w-4 h-4"  />
                    通知设置
                  </div>
                ),
                children: (
                  <Row gutter={[24, 16]}>
                    <Col span={12}>
                      <FormItem
                        name={['notifications', 'enabled']}
                        label="启用通知"
                        valuePropName="checked">
                        <Switch />
                      </FormItem>
                      
                      <FormItem
                        name={['notifications', 'queryCompletion']}
                        label="查询完成通知"
                        valuePropName="checked">
                        <Switch />
                      </FormItem>
                      
                      <FormItem
                        name={['notifications', 'connectionStatus']}
                        label="连接状态通知"
                        valuePropName="checked">
                        <Switch />
                      </FormItem>
                      
                      <FormItem
                        name={['notifications', 'systemAlerts']}
                        label="系统警报通知"
                        valuePropName="checked">
                        <Switch />
                      </FormItem>
                    </Col>
                    <Col span={12}>
                      <FormItem
                        name={['notifications', 'sound']}
                        label="声音提醒"
                        valuePropName="checked">
                        <Switch />
                      </FormItem>
                      
                      <FormItem
                        name={['notifications', 'desktop']}
                        label="桌面通知"
                        valuePropName="checked">
                        <Switch />
                      </FormItem>
                      
                      <FormItem
                        name={['notifications', 'position']}
                        label="通知位置">
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="选择通知位置" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="topRight">右上角</SelectItem>
                            <SelectItem value="topLeft">左上角</SelectItem>
                            <SelectItem value="bottomRight">右下角</SelectItem>
                            <SelectItem value="bottomLeft">左下角</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    </Col>
                  </Row>
                )},
              {
                key: 'accessibility',
                label: (
                  <div className="flex gap-2">
                    <Eye className="w-4 h-4"  />
                    无障碍
                  </div>
                ),
                children: (
                  <Row gutter={[24, 16]}>
                    <Col span={12}>
                      <FormItem
                        name={['accessibility', 'highContrast']}
                        label="高对比度模式"
                        valuePropName="checked">
                        <Switch />
                      </FormItem>
                      
                      <FormItem
                        name={['accessibility', 'fontSize']}
                        label="字体大小">
                        <Radio.Group>
                          <Radio value="small">小</Radio>
                          <Radio value="medium">中</Radio>
                          <Radio value="large">大</Radio>
                          <Radio value="extraLarge">特大</Radio>
                        </Radio.Group>
                      </FormItem>
                      
                      <FormItem
                        name={['accessibility', 'reducedMotion']}
                        label="减少动画效果"
                        valuePropName="checked">
                        <Switch />
                      </FormItem>
                    </Col>
                    <Col span={12}>
                      <FormItem
                        name={['accessibility', 'screenReader']}
                        label="屏幕阅读器支持"
                        valuePropName="checked">
                        <Switch />
                      </FormItem>
                      
                      <FormItem
                        name={['accessibility', 'keyboardNavigation']}
                        label="键盘导航增强"
                        valuePropName="checked">
                        <Switch />
                      </FormItem>
                    </Col>
                  </Row>
                )},
              {
                key: 'workspace',
                label: (
                  <div className="flex gap-2">
                    <LayoutOutlined />
                    工作区
                  </div>
                ),
                children: (
                  <Row gutter={[24, 16]}>
                    <Col span={12}>
                      <FormItem
                        name={['workspace', 'layout']}
                        label="布局模式">
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="选择布局模式" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="default">默认</SelectItem>
                            <SelectItem value="compact">紧凑</SelectItem>
                            <SelectItem value="wide">宽屏</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                      
                      <FormItem
                        name={['workspace', 'openTabs']}
                        label="启动时恢复标签页"
                        valuePropName="checked">
                        <Switch />
                      </FormItem>
                    </Col>
                    <Col span={12}>
                      <FormItem
                        name={['workspace', 'pinnedQueries']}
                        label="固定常用查询"
                        valuePropName="checked">
                        <Switch />
                      </FormItem>
                      
                      <FormItem
                        name={['workspace', 'recentFiles']}
                        label="显示最近文件"
                        valuePropName="checked">
                        <Switch />
                      </FormItem>
                    </Col>
                  </Row>
                )},
            ]}
          />
        </Form>
      </div>

      {/* 快捷键编辑模态框 */}
      <Modal
        title="编辑快捷键"
        open={showShortcutModal}
        onOpenChange={(open) => {
          if (!open) {
            setShowShortcutModal(false);
            setEditingShortcut(null);
            shortcutForm.resetFields();
          }
        }}
        width={500}>
        {editingShortcut && (
          <Form
            form={shortcutForm}
            layout="vertical"
            onFinish={(values) => {
              const updatedShortcut: KeyboardShortcut = {
                ...editingShortcut,
                keys: values.keys.split('+').map((k: string) => k.trim()),
                enabled: values.enabled};
              updateShortcut(updatedShortcut);
              setShowShortcutModal(false);
              setEditingShortcut(null);
              shortcutForm.resetFields();
            }}>
            <div style={{ marginBottom: 16 }}>
              <Text strong>{editingShortcut.name}</Text>
              <br />
              <Text type="secondary">{editingShortcut.description}</Text>
            </div>
            
            <FormItem name="keys"
              label="快捷键组合"
              rules={[{ required: true, message: '请输入快捷键组合' }]}
              extra="使用 + 号分隔多个按键，例如: Ctrl+Shift+P">
              <Input placeholder="例如: Ctrl+Enter" />
            </FormItem>
            
            <FormItem name="enabled"
              label="启用此快捷键"
              valuePropName="checked">
              <Switch />
            </FormItem>
          </Form>
        )}
      </Modal>
    </div>
  );
};

export default UserExperienceSettings;
