import React, { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Input,
  Textarea,
} from '@/components/ui';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { safeTauriInvoke } from '@/utils/tauri';
import { showMessage } from '@/utils/message';
import { useConnectionStore } from '@/store/connection';
import type { ConnectionConfig } from '@/types';

interface CreateDatabaseDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  connectionId?: string; // 新增：从右键菜单传入的连接ID
  metadata?: {
    organization?: string; // InfluxDB 2.x 组织名称
  };
}

interface CreateDatabaseForm {
  name: string;
  description?: string;
  retentionPeriod?: string; // InfluxDB 2.x 保留策略（如 "30d", "7d", "0" 表示永久）
}

const CreateDatabaseDialog: React.FC<CreateDatabaseDialogProps> = ({
  open,
  onClose,
  onSuccess,
  connectionId: propConnectionId,
  metadata,
}) => {
  const { activeConnectionId, getConnection } = useConnectionStore();
  const [loading, setLoading] = useState(false);
  const form = useForm<CreateDatabaseForm>();

  // 使用传入的 connectionId 或 activeConnectionId
  const effectiveConnectionId = propConnectionId || activeConnectionId;

  // 获取连接配置
  const connection = useMemo(() => {
    if (!effectiveConnectionId) return null;
    return getConnection(effectiveConnectionId);
  }, [effectiveConnectionId, getConnection]);

  // 检查是否为 InfluxDB 2.x
  const isInfluxDB2x = useMemo(() => {
    if (!connection) return false;
    const dbType = connection.dbType?.toLowerCase() || '';
    const version = connection.version || '';
    return dbType === 'influxdb' && (version.includes('2.') || version.includes('2x'));
  }, [connection]);

  // 根据连接类型确定对话框标题和描述
  const dialogInfo = useMemo(() => {
    if (!connection) {
      return {
        title: '创建数据库',
        description: '请先选择一个连接',
        placeholder: '例如: my_database',
        nameLabel: '数据库名称',
        canCreate: false,
        errorMessage: '请先选择一个连接',
      };
    }

    const dbType = connection.dbType?.toLowerCase() || 'influxdb';
    const version = connection.version || '';

    if (dbType === 'influxdb') {
      if (version.includes('2.') || version.includes('2x')) {
        return {
          title: '创建存储桶 (Bucket)',
          description: '在 InfluxDB 2.x 中创建一个新的存储桶',
          placeholder: '例如: sensor_data',
          nameLabel: '存储桶名称',
          canCreate: true,
          errorMessage: null,
        };
      } else if (version.includes('3.') || version.includes('3x')) {
        return {
          title: '创建数据库',
          description: 'InfluxDB 3.x 暂不支持通过此界面创建数据库',
          placeholder: '',
          nameLabel: '数据库名称',
          canCreate: false,
          errorMessage: 'InfluxDB 3.x 暂不支持通过此界面创建数据库，请使用命令行工具或 API',
        };
      } else {
        // InfluxDB 1.x
        return {
          title: '创建数据库',
          description: '创建一个新的 InfluxDB 数据库',
          placeholder: '例如: sensor_data',
          nameLabel: '数据库名称',
          canCreate: true,
          errorMessage: null,
        };
      }
    } else if (dbType === 'iotdb') {
      return {
        title: '创建存储组 (Storage Group)',
        description: '在 IoTDB 中创建一个新的存储组',
        placeholder: '例如: sensor_data (将创建为 root.sensor_data)',
        nameLabel: '存储组名称',
        canCreate: true,
        errorMessage: null,
      };
    }

    return {
      title: '创建数据库',
      description: '创建一个新的数据库',
      placeholder: '例如: my_database',
      nameLabel: '数据库名称',
      canCreate: true,
      errorMessage: null,
    };
  }, [connection]);

  const handleSubmit = async (values: CreateDatabaseForm) => {
    if (!effectiveConnectionId) {
      showMessage.error('请先选择一个连接');
      return;
    }

    if (!dialogInfo.canCreate) {
      showMessage.error(dialogInfo.errorMessage || '当前数据库类型不支持创建');
      return;
    }

    try {
      setLoading(true);

      // InfluxDB 2.x 使用专门的 Bucket 创建命令
      if (isInfluxDB2x) {
        // 获取组织信息
        const organizationName = metadata?.organization;
        if (!organizationName) {
          showMessage.error('缺少组织信息，无法创建存储桶');
          return;
        }

        // 获取组织 ID
        const orgInfo = await safeTauriInvoke<any>('get_organization_info', {
          connectionId: effectiveConnectionId,
          orgName: organizationName,
        });

        // 解析保留策略（转换为秒）
        let retentionPeriod: number | null = null;
        if (values.retentionPeriod && values.retentionPeriod !== '0') {
          const match = values.retentionPeriod.match(/^(\d+)([dhms])$/);
          if (match) {
            const value = parseInt(match[1]);
            const unit = match[2];
            switch (unit) {
              case 'd': retentionPeriod = value * 86400; break;
              case 'h': retentionPeriod = value * 3600; break;
              case 'm': retentionPeriod = value * 60; break;
              case 's': retentionPeriod = value; break;
            }
          }
        }

        // 创建存储桶
        await safeTauriInvoke('create_influxdb2_bucket', {
          connectionId: effectiveConnectionId,
          request: {
            name: values.name,
            orgId: orgInfo.id,
            retentionPeriod,
            description: values.description || null,
          },
        });

        showMessage.success('存储桶创建成功');
      } else {
        // 其他数据库类型使用通用的 create_database 命令
        await safeTauriInvoke('create_database', {
          connectionId: effectiveConnectionId,
          databaseName: values.name,
        });

        const successMessage = connection?.dbType === 'iotdb'
          ? '存储组创建成功'
          : '数据库创建成功';

        showMessage.success(successMessage);
      }

      form.reset();
      onClose();
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      const errorMessage = connection?.dbType === 'iotdb'
        ? '创建存储组失败'
        : isInfluxDB2x
          ? '创建存储桶失败'
          : '创建数据库失败';

      showMessage.error(`${errorMessage}: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  // 当对话框打开时，重置表单
  useEffect(() => {
    if (open) {
      form.reset();
    }
  }, [open, form]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{dialogInfo.title}</DialogTitle>
          <DialogDescription>
            {dialogInfo.description}
          </DialogDescription>
        </DialogHeader>

        {dialogInfo.errorMessage && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {dialogInfo.errorMessage}
            </AlertDescription>
          </Alert>
        )}

        {dialogInfo.canCreate && (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                rules={{
                  required: `请输入${dialogInfo.nameLabel}`,
                  pattern: {
                    value: /^[a-zA-Z_][a-zA-Z0-9_]*$/,
                    message: '名称只能包含字母、数字和下划线，且不能以数字开头',
                  },
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{dialogInfo.nameLabel} *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={dialogInfo.placeholder}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>描述（可选）</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="用途说明..."
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* InfluxDB 2.x 保留策略字段 */}
              {isInfluxDB2x && (
                <FormField
                  control={form.control}
                  name="retentionPeriod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>保留策略（可选）</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="例如: 30d, 7d, 24h, 0 (永久保留)"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                      <p className="text-xs text-muted-foreground">
                        格式: 数字+单位 (d=天, h=小时, m=分钟, s=秒)，0 表示永久保留
                      </p>
                    </FormItem>
                  )}
                />
              )}

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={loading}
                >
                  取消
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? '创建中...' : '创建'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}

        {!dialogInfo.canCreate && (
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
            >
              关闭
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CreateDatabaseDialog;
