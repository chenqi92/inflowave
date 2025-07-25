import React, { useState } from 'react';
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
import { safeTauriInvoke } from '@/utils/tauri';
import { showMessage } from '@/utils/message';
import { useConnectionStore } from '@/store/connection';

interface CreateDatabaseDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface CreateDatabaseForm {
  name: string;
  description?: string;
}

const CreateDatabaseDialog: React.FC<CreateDatabaseDialogProps> = ({
  open,
  onClose,
  onSuccess,
}) => {
  const { activeConnectionId } = useConnectionStore();
  const [loading, setLoading] = useState(false);
  const form = useForm<CreateDatabaseForm>();

  const handleSubmit = async (values: CreateDatabaseForm) => {
    if (!activeConnectionId) {
      showMessage.error('请先选择一个连接');
      return;
    }

    try {
      setLoading(true);
      await safeTauriInvoke('create_database', {
        connection_id: activeConnectionId,
        database_name: values.name,
      });

      showMessage.success('数据库创建成功');
      form.reset();
      onClose();
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      showMessage.error(`创建数据库失败: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>创建数据库</DialogTitle>
          <DialogDescription>
            创建一个新的 InfluxDB 数据库
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              rules={{
                required: '请输入数据库名称',
                pattern: {
                  value: /^[a-zA-Z_][a-zA-Z0-9_]*$/,
                  message: '数据库名称只能包含字母、数字和下划线，且不能以数字开头',
                },
              }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>数据库名称 *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="例如: sensor_data"
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
                      placeholder="数据库用途说明..."
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
      </DialogContent>
    </Dialog>
  );
};

export default CreateDatabaseDialog;
