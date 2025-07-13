import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Form, Select, Button, Table, Input, Typography, Tag, Row, Col, Switch, Slider } from '@/components/ui';
import { Card, Space, toast, Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui';


import { NotificationOutlined, LayoutOutlined } from '@/components/ui';
import { Settings, Eye, Edit, Trash2, Plus } from 'lucide-react';
import { safeTauriInvoke } from '@/utils/tauri';
import type { UserPreferences, KeyboardShortcut } from '@/types';


const { Option } = Select;

const UserPreferencesComponent: React.FC = () => {
  const form = useForm();
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(false);
  const [shortcutModalVisible, setShortcutModalVisible] = useState(false);
  const [editingShortcut, setEditingShortcut] = useState<KeyboardShortcut | null>(null);
  const shortcutForm = useForm();

  // 加载用户偏好
  const loadPreferences = async () => {
    setLoading(true);
    try {
      const result = await safeTauriInvoke('get_user_preferences') as UserPreferences;
      setPreferences(result);
      form.setFieldsValue(result);
    } catch (error) {
      console.error('加载用户偏好失败:', error);
      toast({ title: "错误", description: "加载用户偏好失败", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // 保存用户偏好
  const savePreferences = async (values: any) => {
    setLoading(true);
    try {
      const updatedPreferences = { ...preferences, ...values };
      await safeTauriInvoke('update_user_preferences', { preferences: updatedPreferences });
      setPreferences(updatedPreferences);
      toast({ title: "成功", description: "偏好设置已保存" });
    } catch (error) {
      console.error('保存用户偏好失败:', error);
      toast({ title: "错误", description: "保存用户偏好失败", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // 加载默认快捷键
  const loadDefaultShortcuts = async () => {
    try {
      const shortcuts = await safeTauriInvoke('get_default_shortcuts') as KeyboardShortcut[];
      if (preferences) {
        const updatedPreferences = { ...preferences, shortcuts };
        setPreferences(updatedPreferences);
        form.setFieldsValue(updatedPreferences);
      }
    } catch (error) {
      console.error('加载默认快捷键失败:', error);
      toast({ title: "错误", description: "加载默认快捷键失败", variant: "destructive" });
    }
  };

  // 编辑快捷键
  const editShortcut = (shortcut: KeyboardShortcut) => {
    setEditingShortcut(shortcut);
    shortcutForm.setFieldsValue(shortcut);
    setShortcutModalVisible(true);
  };

  // 保存快捷键
  const saveShortcut = async (values: any) => {
    if (!preferences) return;

    const updatedShortcuts = preferences.shortcuts.map(s =>
      s.id === editingShortcut?.id ? { ...s, ...values } : s
    );

    const updatedPreferences = { ...preferences, shortcuts: updatedShortcuts };
    await savePreferences(updatedPreferences);
    setShortcutModalVisible(false);
    setEditingShortcut(null);
    shortcutForm.resetFields();
  };

  // 快捷键表格列
  const shortcutColumns = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name'},
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description'},
    {
      title: '快捷键',
      dataIndex: 'keys',
      key: 'keys',
      render: (keys: string[]) => (
        <div className="flex gap-2">
          {keys.map((key, index) => (
            <Tag key={index}>{key}</Tag>
          ))}
        </div>
      )},
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      render: (category: string) => <Tag color="blue">{category}</Tag>},
    {
      title: '状态',
      dataIndex: 'enabled',
      key: 'enabled',
      render: (enabled: boolean) => (
        <Tag color={enabled ? 'green' : 'red'}>
          {enabled ? '启用' : '禁用'}
        </Tag>
      )},
    {
      title: '操作',
      key: 'actions',
      render: (record: KeyboardShortcut) => (
        <div className="flex gap-2">
          <Button
            type="text"
            size="small"
            icon={<Edit className="w-4 h-4"  />}
            onClick={() => editShortcut(record)}
          />
        </div>
      )},
  ];

  useEffect(() => {
    loadPreferences();
  }, []);

  if (!preferences) {
    return <div>加载中...</div>;
  }

  return (
    <div className="user-preferences p-4">
      <div className="mb-6">
        <Typography.Title level={3} className="mb-2">用户偏好设置</Typography.Title>
        <Typography.Text type="secondary" className="text-base">
          个性化您的工作环境，提高使用效率和舒适度
        </Typography.Text>
      </div>
      
      <Form
        form={form}
        layout="vertical"
        onFinish={savePreferences}
        initialValues={preferences}
      >
        {/* 通知设置 */}
        <Card 
          title={<><NotificationOutlined /> 通知设置</>} 
          className="mb-6 shadow-sm hover:shadow-md transition-shadow"
          extra={<Typography.Text type="secondary">管理各类提醒和通知</Typography.Text>}
        >
          <Row gutter={[16, 16]}>
            <Col span={12}>
              <Form.Item name={['notifications', 'enabled']} label="启用通知" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name={['notifications', 'desktop']} label="桌面通知" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col span={12}>
              <Form.Item name={['notifications', 'queryCompletion']} label="查询完成通知" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name={['notifications', 'connectionStatus']} label="连接状态通知" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col span={12}>
              <Form.Item name={['notifications', 'systemAlerts']} label="系统警报" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name={['notifications', 'exportCompletion']} label="导出完成通知" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col span={12}>
              <Form.Item name={['notifications', 'sound']} label="声音提醒" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name={['notifications', 'position']} label="通知位置">
                <Select>
                  <Option value="topRight">右上角</Option>
                  <Option value="topLeft">左上角</Option>
                  <Option value="bottomRight">右下角</Option>
                  <Option value="bottomLeft">左下角</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* 无障碍设置 */}
        <Card 
          title={<><Eye className="w-4 h-4"  /> 无障碍设置</>} 
          className="mb-6 shadow-sm hover:shadow-md transition-shadow"
          extra={<Typography.Text type="secondary">优化界面可访问性</Typography.Text>}
        >
          <Row gutter={[16, 16]}>
            <Col span={12}>
              <Form.Item name={['accessibility', 'highContrast']} label="高对比度" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name={['accessibility', 'reducedMotion']} label="减少动画" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col span={12}>
              <Form.Item name={['accessibility', 'fontSize']} label="字体大小">
                <Select>
                  <Option value="small">小</Option>
                  <Option value="medium">中</Option>
                  <Option value="large">大</Option>
                  <Option value="extraLarge">特大</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name={['accessibility', 'keyboardNavigation']} label="键盘导航" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name={['accessibility', 'screenReader']} label="屏幕阅读器支持" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Card>

        {/* 工作区设置 */}
        <Card 
          title={<><LayoutOutlined /> 工作区设置</>} 
          className="mb-6 shadow-sm hover:shadow-md transition-shadow"
          extra={<Typography.Text type="secondary">自定义工作区布局</Typography.Text>}
        >
          <Row gutter={[16, 16]}>
            <Col span={12}>
              <Form.Item name={['workspace', 'layout']} label="布局模式">
                <Select>
                  <Option value="default">默认</Option>
                  <Option value="compact">紧凑</Option>
                  <Option value="wide">宽屏</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name={['workspace', 'openTabs']} label="启动时恢复标签页" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
          </Row>
          
          <Row gutter={[16, 16]}>
            <Col span={12}>
              <Form.Item name={['workspace', 'pinnedQueries']} label="固定常用查询" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name={['workspace', 'recentFiles']} label="显示最近文件" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* 键盘快捷键 */}
        <Card
          title={<><Settings /> 键盘快捷键</>}
          className="mb-6 shadow-sm hover:shadow-md transition-shadow flex gap-2"
          extra={
            <div >
              <Typography.Text type="secondary">自定义快捷键</Typography.Text>
              <Button onClick={loadDefaultShortcuts} size="small">
                重置为默认
              </Button>
            </div>
          }
        >
          <Table
            dataSource={preferences.shortcuts}
            columns={shortcutColumns}
            rowKey="id"
            size="small"
            pagination={{ pageSize: 10 }}
          />
        </Card>

        {/* 保存按钮 */}
        <div className="pt-6 border-t border-gray-200">
          <div className="flex justify-end">
            <div className="flex gap-2" size="large">
              <Button onClick={() => form.resetFields()} size="large">
                重置
              </Button>
              <Button type="primary" htmlType="submit" loading={loading} size="large" icon={<Settings className="w-4 h-4"  />}>
                保存设置
              </Button>
            </div>
          </div>
        </div>
      </Form>

      {/* 编辑快捷键对话框 */}
      <Modal
        title="编辑快捷键"
        open={shortcutModalVisible}
        width={600}
        onCancel={() => {
          setShortcutModalVisible(false);
          setEditingShortcut(null);
          shortcutForm.resetFields();
        }}
        onOk={() => shortcutForm.submit()}
        okText="保存"
        cancelText="取消"
        width={600}
        centered
      >
        <Form
          form={shortcutForm}
          layout="vertical"
          onFinish={saveShortcut}
        >
          <Form.Item name="name" label="名称" rules={[{ required: true }]}>
            <Input />
          </Form.Item>

          <Form.Item name="description" label="描述">
            <Input.TextArea rows={2} />
          </Form.Item>

          <Form.Item 
            name="keys" 
            label="快捷键" 
            rules={[{ required: true }]}
            extra="示例: ['Ctrl', 'Shift', 'P'] 或 ['F5']"
          >
            <Select mode="tags" placeholder="输入快捷键组合">
              <Option value="Ctrl">Ctrl</Option>
              <Option value="Shift">Shift</Option>
              <Option value="Alt">Alt</Option>
              <Option value="Cmd">Cmd</Option>
              <Option value="Enter">Enter</Option>
              <Option value="Space">Space</Option>
              <Option value="Tab">Tab</Option>
              <Option value="Escape">Escape</Option>
              <Option value="F1">F1</Option>
              <Option value="F2">F2</Option>
              <Option value="F3">F3</Option>
              <Option value="F4">F4</Option>
              <Option value="F5">F5</Option>
              <Option value="F6">F6</Option>
              <Option value="F7">F7</Option>
              <Option value="F8">F8</Option>
              <Option value="F9">F9</Option>
              <Option value="F10">F10</Option>
              <Option value="F11">F11</Option>
              <Option value="F12">F12</Option>
            </Select>
          </Form.Item>

          <Form.Item name="category" label="分类">
            <Select>
              <Option value="连接">连接</Option>
              <Option value="查询">查询</Option>
              <Option value="界面">界面</Option>
              <Option value="搜索">搜索</Option>
              <Option value="数据">数据</Option>
            </Select>
          </Form.Item>

          <Form.Item name="enabled" label="启用" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default UserPreferencesComponent;
