import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Form, Input, Alert, Select, Typography, Switch, InputNumber, Popconfirm, Tooltip } from '@/components/ui';
import { Dialog, DialogContent, DialogHeader, DialogTitle, toast, Button } from '@/components/ui';
import { Info, HelpCircle } from 'lucide-react';
import { safeTauriInvoke } from '@/utils/tauri';
import type { RetentionPolicy } from '@/types';


const { Option } = Select;
const { Paragraph } = Typography;

interface RetentionPolicyDialogProps {
  visible: boolean;
  mode: 'create' | 'edit';
  policy?: RetentionPolicy;
  database: string;
  connectionId: string;
  onClose: () => void;
  onSuccess?: () => void;
}

interface RetentionPolicyForm {
  name: string;
  duration: string;
  shardDuration?: string;
  replicaN?: number;
  default?: boolean;
}

const RetentionPolicyDialog: React.FC<RetentionPolicyDialogProps> = ({
  visible,
  mode,
  policy,
  database,
  connectionId,
  onClose,
  onSuccess}) => {
  const form = useForm<RetentionPolicyForm>();
  const [loading, setLoading] = useState(false);

  // 初始化表单值
  useEffect(() => {
    if (visible) {
      if (mode === 'edit' && policy) {
        form.setFieldsValue({
          name: policy.name,
          duration: policy.duration,
          shardDuration: policy.shardGroupDuration,
          replicaN: policy.replicaN,
          default: policy.default});
      } else {
        form.resetFields();
        form.setFieldsValue({
          duration: '30d',
          shardDuration: '1h',
          replicaN: 1,
          default: false});
      }
    }
  }, [visible, mode, policy, form]);

  // 提交表单
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const config = {
        name: values.name,
        database,
        duration: values.duration,
        shard_duration: values.shardDuration,
        replica_n: values.replicaN,
        default: values.default};

      if (mode === 'create') {
        await safeTauriInvoke('create_retention_policy', {
          connectionId,
          config});
        toast({ title: "成功", description: `保留策略 "${values.name}" 创建成功` });
      } else {
        await safeTauriInvoke('alter_retention_policy', {
          connectionId,
          config});
        toast({ title: "成功", description: `保留策略 "${values.name}" 修改成功` });
      }

      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (error) {
      toast({ title: "错误", description: `${mode === 'create' ? '创建' : '修改'}保留策略失败: ${error}`, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // 删除保留策略
  const handleDelete = async () => {
    if (!policy) return;

    try {
      setLoading(true);
      await safeTauriInvoke('drop_retention_policy', {
        connectionId,
        database,
        policyName: policy.name});
      toast({ title: "成功", description: `保留策略 "${policy.name}" 删除成功` });
      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (error) {
      toast({ title: "错误", description: `删除保留策略失败: ${error}`, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // 持续时间选项
  const durationOptions = [
    { label: '1小时', value: '1h' },
    { label: '1天', value: '1d' },
    { label: '1周', value: '7d' },
    { label: '1个月', value: '30d' },
    { label: '3个月', value: '90d' },
    { label: '6个月', value: '180d' },
    { label: '1年', value: '365d' },
    { label: '永久', value: '0s' },
  ];

  // 分片持续时间选项
  const shardDurationOptions = [
    { label: '1小时', value: '1h' },
    { label: '6小时', value: '6h' },
    { label: '12小时', value: '12h' },
    { label: '1天', value: '1d' },
    { label: '7天', value: '7d' },
  ];

  return (
    <Dialog open={visible} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Info className="w-4 h-4" />
            {mode === 'create' ? '创建保留策略' : '编辑保留策略'}
          </DialogTitle>
        </DialogHeader>
      <div className="space-y-6">
        {/* 说明信息 */}
        <Alert
          message="保留策略说明"
          description="保留策略定义了数据在 InfluxDB 中的存储时间和分片策略。删除默认策略可能会影响数据写入。"
          type="info"
          showIcon
        />

        {/* 表单 */}
        <Form
          form={form}
          layout="vertical"
          requiredMark={false}
        >
          <Form.Item
            label="策略名称"
            name="name"
            rules={[
              { required: true, message: '请输入策略名称' },
              { pattern: /^[a-zA-Z_][a-zA-Z0-9_]*$/, message: '策略名称只能包含字母、数字和下划线，且不能以数字开头' },
            ]}
          >
            <Input
              placeholder="请输入策略名称"
              disabled={mode === 'edit'}
            />
          </Form.Item>

          <Form.Item
            label={
              <div className="flex gap-2">
                保留时间
                <Tooltip title="数据在数据库中保留的时间，超过此时间的数据将被自动删除">
                  <HelpCircle className="w-4 h-4"  />
                </Tooltip>
              </div>
            }
            name="duration"
            rules={[{ required: true, message: '请选择保留时间' }]}
          >
            <Select
              placeholder="选择保留时间"
              showSearch
              allowClear
              mode="combobox"
            >
              {durationOptions.map(option => (
                <Option key={option.value} value={option.value}>
                  {option.label}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label={
              <div className="flex gap-2">
                分片组持续时间
                <Tooltip title="每个分片组覆盖的时间范围，影响查询性能和存储效率">
                  <HelpCircle className="w-4 h-4"  />
                </Tooltip>
              </div>
            }
            name="shardDuration"
          >
            <Select
              placeholder="选择分片组持续时间"
              showSearch
              allowClear
              mode="combobox"
            >
              {shardDurationOptions.map(option => (
                <Option key={option.value} value={option.value}>
                  {option.label}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label={
              <div className="flex gap-2">
                副本数
                <Tooltip title="数据副本的数量，用于高可用性部署">
                  <HelpCircle className="w-4 h-4"  />
                </Tooltip>
              </div>
            }
            name="replicaN"
          >
            <InputNumber
              min={1}
              max={10}
              placeholder="副本数"
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Form.Item
            label={
              <div className="flex gap-2">
                设为默认策略
                <Tooltip title="将此策略设为数据库的默认保留策略">
                  <HelpCircle className="w-4 h-4"  />
                </Tooltip>
              </div>
            }
            name="default"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        </Form>

        {/* 格式说明 */}
        <Alert
          message="时间格式说明"
          description={
            <div>
              <Paragraph>
                <strong>持续时间格式:</strong> 支持 ns(纳秒)、us(微秒)、ms(毫秒)、s(秒)、m(分钟)、h(小时)、d(天)、w(周)
              </Paragraph>
              <Paragraph>
                <strong>示例:</strong> 1h30m (1小时30分钟)、7d (7天)、0s (永久保留)
              </Paragraph>
            </div>
          }
          type="info"
          showIcon
        />
      </div>

      {/* Footer */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button onClick={onClose}>
          取消
        </Button>
        {mode === 'edit' && policy && !policy.default && (
          <Popconfirm
            title="确认删除保留策略"
            description={`确定要删除保留策略 "${policy.name}" 吗？此操作不可撤销！`}
            onConfirm={handleDelete}
            okText="删除"
            cancelText="取消"
            okType="danger"
          >
            <Button
              variant="destructive"
              loading={loading}
            >
              删除
            </Button>
          </Popconfirm>
        )}
        <Button
          variant="default"
          loading={loading}
          onClick={handleSubmit}
        >
          {mode === 'create' ? '创建' : '保存'}
        </Button>
      </div>
      </DialogContent>
    </Dialog>
  );
};

export default RetentionPolicyDialog;
