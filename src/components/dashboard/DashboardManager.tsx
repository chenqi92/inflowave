import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
  Button,
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Typography,
  Tag,
  Row,
  Col,
  InputNumber,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  List,
} from '@/components/ui';
import { showMessage } from '@/utils/message';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui';
import { Plus, Edit, Trash2, Copy, BarChart, Eye } from 'lucide-react';
import { safeTauriInvoke } from '@/utils/tauri';
import type { DashboardConfig } from '@/types';

import { Textarea } from '@/components/ui';
const { Text } = Typography;

interface DashboardManagerProps {
  onOpenDashboard: (dashboardId: string) => void;
}

const DashboardManager: React.FC<DashboardManagerProps> = ({
  onOpenDashboard,
}) => {
  const [dashboards, setDashboards] = useState<DashboardConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedDashboard, setSelectedDashboard] =
    useState<DashboardConfig | null>(null);
  const form = useForm();

  // 加载仪表板列表
  const loadDashboards = async () => {
    setLoading(true);
    try {
      const result = (await safeTauriInvoke(
        'get_dashboards'
      )) as DashboardConfig[];
      setDashboards(result);
    } catch (error) {
      console.error('加载仪表板失败:', error);
      showMessage.error('加载仪表板失败');
    } finally {
      setLoading(false);
    }
  };

  // 创建仪表板
  const createDashboard = async (values: any) => {
    try {
      const dashboardId = (await safeTauriInvoke('create_dashboard', {
        request: {
          name: values.name,
          description: values.description,
          layout: {
            columns: values.columns || 12,
            rows: values.rows || 8,
            gap: values.gap || 16,
          },
          refresh_interval: values.refreshInterval || 30000,
          time_range: {
            start: values.timeStart || 'now() - 1h',
            end: values.timeEnd || 'now()',
          },
        },
      })) as string;

      showMessage.success('仪表板创建成功');
      setCreateModalVisible(false);
      form.reset();
      loadDashboards();

      // 自动打开新创建的仪表板
      onOpenDashboard(dashboardId);
    } catch (error) {
      console.error('创建仪表板失败:', error);
      showMessage.error('创建仪表板失败');
    }
  };

  // 更新仪表板
  const updateDashboard = async (values: any) => {
    if (!selectedDashboard) return;

    try {
      await safeTauriInvoke('update_dashboard', {
        request: {
          id: selectedDashboard.id,
          name: values.name,
          description: values.description,
          layout: {
            columns: values.columns,
            rows: values.rows,
            gap: values.gap,
          },
          refresh_interval: values.refreshInterval,
          time_range: {
            start: values.timeStart,
            end: values.timeEnd,
          },
        },
      });

      showMessage.success('仪表板更新成功');
      setEditModalVisible(false);
      setSelectedDashboard(null);
      form.reset();
      loadDashboards();
    } catch (error) {
      console.error('更新仪表板失败:', error);
      showMessage.error('更新仪表板失败');
    }
  };

  // 删除仪表板
  const deleteDashboard = async (dashboardId: string) => {
    try {
      await safeTauriInvoke('delete_dashboard', { dashboardId });
      showMessage.success('仪表板删除成功');
      loadDashboards();
    } catch (error) {
      console.error('删除仪表板失败:', error);
      showMessage.error('删除仪表板失败');
    }
  };

  // 复制仪表板
  const duplicateDashboard = async (dashboard: DashboardConfig) => {
    try {
      const newName = `${dashboard.name} - 副本`;
      const newDashboardId = (await safeTauriInvoke('duplicate_dashboard', {
        dashboardId: dashboard.id,
        newName,
      })) as string;

      showMessage.success('仪表板复制成功');
      loadDashboards();
      onOpenDashboard(newDashboardId);
    } catch (error) {
      console.error('复制仪表板失败:', error);
      showMessage.error('复制仪表板失败');
    }
  };

  // 打开编辑对话框
  const openEditModal = (dashboard: DashboardConfig) => {
    setSelectedDashboard(dashboard);
    form.setFieldsValue({
      name: dashboard.name,
      description: dashboard.description,
      columns: dashboard.layout.columns,
      rows: dashboard.layout.rows,
      gap: dashboard.layout.gap,
      refreshInterval: dashboard.refreshInterval,
      timeStart: dashboard.timeRange.start,
      timeEnd: dashboard.timeRange.end,
    });
    setEditModalVisible(true);
  };

  // 格式化时间
  const formatTime = (dateTime: string | Date) => {
    return new Date(dateTime).toLocaleString();
  };

  // 获取刷新间隔标签
  const getRefreshIntervalLabel = (interval: number) => {
    if (interval < 1000) return `${interval}ms`;
    if (interval < 60000) return `${interval / 1000}s`;
    return `${interval / 60000}m`;
  };

  useEffect(() => {
    loadDashboards();
  }, []);

  return (
    <div className='dashboard-manager'>
      <div
        title='仪表板管理'
        extra={
          <Button
            type='primary'
            icon={<Plus className='w-4 h-4' />}
            onClick={() => setCreateModalVisible(true)}
          >
            创建仪表板
          </Button>
        }
      >
        <List
          disabled={loading}
          dataSource={dashboards}
          locale={{ emptyText: '暂无仪表板' }}
          renderItem={dashboard => (
            <List.Item
              actions={[
                <Button
                  type='text'
                  icon={<Eye className='w-4 h-4' />}
                  onClick={() => onOpenDashboard(dashboard.id)}
                >
                  查看
                </Button>,
                <Button
                  type='text'
                  icon={<Edit className='w-4 h-4' />}
                  onClick={() => openEditModal(dashboard)}
                >
                  编辑
                </Button>,
                <Button
                  type='text'
                  icon={<Copy className='w-4 h-4' />}
                  onClick={() => duplicateDashboard(dashboard)}
                >
                  复制
                </Button>,
                <Popconfirm
                  title='确定要删除这个仪表板吗？'
                  onConfirm={() => deleteDashboard(dashboard.id)}
                >
                  <Button
                    type='text'
                    danger
                    icon={<Trash2 className='w-4 h-4' />}
                  >
                    删除
                  </Button>
                </Popconfirm>,
              ]}
            >
              <List.Item.Meta
                avatar={
                  <BarChart
                    className='w-4 h-4'
                    style={{ fontSize: 24, color: '#1890ff' }}
                  />
                }
                title={
                  <div className='flex gap-2'>
                    <Text strong>{dashboard.name}</Text>
                    <Tag color='blue'>{dashboard.widgets.length} 个组件</Tag>
                    <Tag color='green'>
                      {getRefreshIntervalLabel(dashboard.refreshInterval)}
                    </Tag>
                  </div>
                }
                description={
                  <div>
                    {dashboard.description && (
                      <Text type='secondary'>{dashboard.description}</Text>
                    )}
                    <div style={{ marginTop: 4 }}>
                      <div className='flex gap-2' size='small'>
                        <Text type='secondary' style={{ fontSize: 12 }}>
                          布局: {dashboard.layout.columns}x
                          {dashboard.layout.rows}
                        </Text>
                        <Text type='secondary' style={{ fontSize: 12 }}>
                          创建时间: {formatTime(dashboard.createdAt)}
                        </Text>
                        <Text type='secondary' style={{ fontSize: 12 }}>
                          更新时间: {formatTime(dashboard.updatedAt)}
                        </Text>
                      </div>
                    </div>
                  </div>
                }
              />
            </List.Item>
          )}
        />
      </div>

      {/* 创建仪表板对话框 */}
      <Dialog
        open={createModalVisible}
        onOpenChange={open => {
          if (!open) {
            setCreateModalVisible(false);
            form.reset();
          }
        }}
      >
        <DialogContent className='max-w-2xl'>
          <DialogHeader>
            <DialogTitle>创建仪表板</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(createDashboard)}
              className='space-y-6'
            >
              <FormField
                control={form.control}
                name='name'
                rules={{ required: '请输入仪表板名称' }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>仪表板名称</FormLabel>
                    <FormControl>
                      <Input placeholder='输入仪表板名称' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='description'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>描述</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={3}
                        placeholder='输入仪表板描述（可选）'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className='border-t border-gray-200 my-4 pt-4'>
                <h4 className='text-sm font-medium mb-4'>布局设置</h4>
              </div>

              <Row gutter={16}>
                <Col span={8}>
                  <FormField
                    control={form.control}
                    name='columns'
                    defaultValue={12}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>列数</FormLabel>
                        <FormControl>
                          <InputNumber
                            min={1}
                            max={24}
                            className='w-full'
                            value={field.value}
                            onChange={field.onChange}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </Col>
                <Col span={8}>
                  <FormField
                    control={form.control}
                    name='rows'
                    defaultValue={8}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>行数</FormLabel>
                        <FormControl>
                          <InputNumber
                            min={1}
                            max={20}
                            className='w-full'
                            value={field.value}
                            onChange={field.onChange}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </Col>
                <Col span={8}>
                  <FormField
                    control={form.control}
                    name='gap'
                    defaultValue={16}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>间距</FormLabel>
                        <FormControl>
                          <InputNumber
                            min={0}
                            max={50}
                            className='w-full'
                            value={field.value}
                            onChange={field.onChange}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </Col>
              </Row>

              <div className='border-t border-gray-200 my-4 pt-4'>
                <h4 className='text-sm font-medium mb-4'>时间和刷新设置</h4>
              </div>

              <Row gutter={16}>
                <Col span={12}>
                  <FormField
                    control={form.control}
                    name='timeStart'
                    defaultValue='now() - 1h'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>开始时间</FormLabel>
                        <FormControl>
                          <Input placeholder='now() - 1h' {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </Col>
                <Col span={12}>
                  <FormField
                    control={form.control}
                    name='timeEnd'
                    defaultValue='now()'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>结束时间</FormLabel>
                        <FormControl>
                          <Input placeholder='now()' {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </Col>
              </Row>

              <FormField
                control={form.control}
                name='refreshInterval'
                defaultValue={30000}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>刷新间隔 (毫秒)</FormLabel>
                    <Select
                      onValueChange={value => field.onChange(Number(value))}
                      defaultValue={String(field.value)}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value='5000'>5 秒</SelectItem>
                        <SelectItem value='10000'>10 秒</SelectItem>
                        <SelectItem value='30000'>30 秒</SelectItem>
                        <SelectItem value='60000'>1 分钟</SelectItem>
                        <SelectItem value='300000'>5 分钟</SelectItem>
                        <SelectItem value='600000'>10 分钟</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type='submit' disabled={loading}>
                  {loading ? '创建中...' : '创建仪表板'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* 编辑仪表板对话框 */}
      <Dialog
        open={editModalVisible}
        onOpenChange={open => {
          if (!open) {
            setEditModalVisible(false);
            setSelectedDashboard(null);
            form.reset();
          }
        }}
      >
        <DialogContent className='max-w-2xl'>
          <DialogHeader>
            <DialogTitle>编辑仪表板</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(updateDashboard)}
              className='space-y-6'
            >
              <FormField
                control={form.control}
                name='name'
                rules={{ required: '请输入仪表板名称' }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>仪表板名称</FormLabel>
                    <FormControl>
                      <Input placeholder='输入仪表板名称' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='description'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>描述</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={3}
                        placeholder='输入仪表板描述（可选）'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className='border-t border-gray-200 my-4 pt-4'>
                <h4 className='text-sm font-medium mb-4'>布局设置</h4>
              </div>

              <Row gutter={16}>
                <Col span={8}>
                  <FormField
                    control={form.control}
                    name='columns'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>列数</FormLabel>
                        <FormControl>
                          <InputNumber
                            min={1}
                            max={24}
                            className='w-full'
                            value={field.value}
                            onChange={field.onChange}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </Col>
                <Col span={8}>
                  <FormField
                    control={form.control}
                    name='rows'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>行数</FormLabel>
                        <FormControl>
                          <InputNumber
                            min={1}
                            max={20}
                            className='w-full'
                            value={field.value}
                            onChange={field.onChange}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </Col>
                <Col span={8}>
                  <FormField
                    control={form.control}
                    name='gap'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>间距</FormLabel>
                        <FormControl>
                          <InputNumber
                            min={0}
                            max={50}
                            className='w-full'
                            value={field.value}
                            onChange={field.onChange}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </Col>
              </Row>

              <div className='border-t border-gray-200 my-4 pt-4'>
                <h4 className='text-sm font-medium mb-4'>时间和刷新设置</h4>
              </div>

              <Row gutter={16}>
                <Col span={12}>
                  <FormField
                    control={form.control}
                    name='timeStart'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>开始时间</FormLabel>
                        <FormControl>
                          <Input placeholder='now() - 1h' {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </Col>
                <Col span={12}>
                  <FormField
                    control={form.control}
                    name='timeEnd'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>结束时间</FormLabel>
                        <FormControl>
                          <Input placeholder='now()' {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </Col>
              </Row>

              <FormField
                control={form.control}
                name='refreshInterval'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>刷新间隔 (毫秒)</FormLabel>
                    <Select
                      onValueChange={value => field.onChange(Number(value))}
                      defaultValue={String(field.value)}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value='5000'>5 秒</SelectItem>
                        <SelectItem value='10000'>10 秒</SelectItem>
                        <SelectItem value='30000'>30 秒</SelectItem>
                        <SelectItem value='60000'>1 分钟</SelectItem>
                        <SelectItem value='300000'>5 分钟</SelectItem>
                        <SelectItem value='600000'>10 分钟</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type='submit' disabled={loading}>
                  {loading ? '更新中...' : '更新仪表板'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DashboardManager;
