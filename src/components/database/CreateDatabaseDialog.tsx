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
import { useDatabaseExplorerTranslation } from '@/hooks/useTranslation';

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
  const { t: tExplorer } = useDatabaseExplorerTranslation();
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
        title: tExplorer('createDatabase.title'),
        description: tExplorer('createDatabase.descriptionNoConnection'),
        placeholder: tExplorer('createDatabase.placeholderGeneric'),
        nameLabel: tExplorer('createDatabase.labelDatabase'),
        canCreate: false,
        errorMessage: tExplorer('createDatabase.errorNoConnection'),
      };
    }

    const dbType = connection.dbType?.toLowerCase() || 'influxdb';
    const version = connection.version || '';

    if (dbType === 'influxdb') {
      if (version.includes('2.') || version.includes('2x')) {
        return {
          title: tExplorer('createDatabase.titleBucket'),
          description: tExplorer('createDatabase.descriptionInfluxDB2'),
          placeholder: tExplorer('createDatabase.placeholderSensorData'),
          nameLabel: tExplorer('createDatabase.labelBucket'),
          canCreate: true,
          errorMessage: null,
        };
      } else if (version.includes('3.') || version.includes('3x')) {
        return {
          title: tExplorer('createDatabase.title'),
          description: tExplorer('createDatabase.descriptionInfluxDB3'),
          placeholder: '',
          nameLabel: tExplorer('createDatabase.labelDatabase'),
          canCreate: false,
          errorMessage: tExplorer('createDatabase.errorInfluxDB3'),
        };
      } else {
        // InfluxDB 1.x
        return {
          title: tExplorer('createDatabase.title'),
          description: tExplorer('createDatabase.descriptionInfluxDB1'),
          placeholder: tExplorer('createDatabase.placeholderSensorData'),
          nameLabel: tExplorer('createDatabase.labelDatabase'),
          canCreate: true,
          errorMessage: null,
        };
      }
    } else if (dbType === 'iotdb') {
      return {
        title: tExplorer('createDatabase.titleStorageGroup'),
        description: tExplorer('createDatabase.descriptionIoTDB'),
        placeholder: tExplorer('createDatabase.placeholderIoTDB'),
        nameLabel: tExplorer('createDatabase.labelStorageGroup'),
        canCreate: true,
        errorMessage: null,
      };
    }

    return {
      title: tExplorer('createDatabase.title'),
      description: tExplorer('createDatabase.descriptionGeneric'),
      placeholder: tExplorer('createDatabase.placeholderGeneric'),
      nameLabel: tExplorer('createDatabase.labelDatabase'),
      canCreate: true,
      errorMessage: null,
    };
  }, [connection, tExplorer]);

  const handleSubmit = async (values: CreateDatabaseForm) => {
    if (!effectiveConnectionId) {
      showMessage.error(tExplorer('createDatabase.errorNoConnection'));
      return;
    }

    if (!dialogInfo.canCreate) {
      showMessage.error(dialogInfo.errorMessage || tExplorer('createDatabase.errorNotSupported'));
      return;
    }

    try {
      setLoading(true);

      // InfluxDB 2.x 使用专门的 Bucket 创建命令
      if (isInfluxDB2x) {
        // 获取组织信息
        const organizationName = metadata?.organization;
        if (!organizationName) {
          showMessage.error(tExplorer('createDatabase.errorNoOrganization'));
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

        showMessage.success(tExplorer('createDatabase.successBucket'));
      } else {
        // 其他数据库类型使用通用的 create_database 命令
        await safeTauriInvoke('create_database', {
          connectionId: effectiveConnectionId,
          databaseName: values.name,
        });

        const successMessage = connection?.dbType === 'iotdb'
          ? tExplorer('createDatabase.successStorageGroup')
          : tExplorer('createDatabase.successDatabase');

        showMessage.success(successMessage);
      }

      form.reset();
      onClose();
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      const errorMessage = connection?.dbType === 'iotdb'
        ? tExplorer('createDatabase.failedStorageGroup')
        : isInfluxDB2x
          ? tExplorer('createDatabase.failedBucket')
          : tExplorer('createDatabase.failedDatabase');

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
                  required: tExplorer('createDatabase.errorNameRequired', { label: dialogInfo.nameLabel }),
                  pattern: {
                    value: /^[a-zA-Z_][a-zA-Z0-9_]*$/,
                    message: tExplorer('createDatabase.errorNamePattern'),
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
                    <FormLabel>{tExplorer('createDatabase.labelDescription')}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={tExplorer('createDatabase.placeholderDescription')}
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
                      <FormLabel>{tExplorer('createDatabase.labelRetentionPolicy')}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={tExplorer('createDatabase.placeholderRetentionPolicy')}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                      <p className="text-xs text-muted-foreground">
                        {tExplorer('createDatabase.retentionPolicyHelp')}
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
                  {tExplorer('createDatabase.buttonCancel')}
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? tExplorer('createDatabase.buttonCreating') : tExplorer('createDatabase.buttonCreate')}
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
              {tExplorer('createDatabase.buttonClose')}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CreateDatabaseDialog;
