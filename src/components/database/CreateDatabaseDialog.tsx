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
}

interface CreateDatabaseForm {
  name: string;
  description?: string;
}

const CreateDatabaseDialog: React.FC<CreateDatabaseDialogProps> = ({
  open,
  onClose,
  onSuccess,
  connectionId: propConnectionId,
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

    const dbType = connection.db_type?.toLowerCase() || 'influxdb';
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
      // 🔧 修复：使用 camelCase 参数名称以匹配后端 #[tauri::command(rename_all = "camelCase")]
      await safeTauriInvoke('create_database', {
        connectionId: effectiveConnectionId,
        databaseName: values.name,
      });

      const successMessage = connection?.db_type === 'iotdb'
        ? '存储组创建成功'
        : connection?.version?.includes('2.')
          ? '存储桶创建成功'
          : '数据库创建成功';

      showMessage.success(successMessage);
      form.reset();
      onClose();
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      const errorMessage = connection?.db_type === 'iotdb'
        ? '创建存储组失败'
        : connection?.version?.includes('2.')
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
