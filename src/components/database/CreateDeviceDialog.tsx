import React, { useState, useEffect } from 'react';
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
} from '@/components/ui';
import { safeTauriInvoke } from '@/utils/tauri';
import { showMessage } from '@/utils/message';
import { useDatabaseExplorerTranslation } from '@/hooks/useTranslation';

interface CreateDeviceDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  connectionId: string;
  storageGroup: string;
}

interface CreateDeviceForm {
  deviceName: string;
  timeseriesName: string;
  dataType: string;
  encoding: string;
  compression: string;
}

/**
 * IoTDB 设备创建对话框
 *
 * 在 IoTDB 中，设备是通过创建时间序列隐式创建的。
 * 此对话框允许用户创建设备及其初始时间序列。
 */
const CreateDeviceDialog: React.FC<CreateDeviceDialogProps> = ({
  open,
  onClose,
  onSuccess,
  connectionId,
  storageGroup,
}) => {
  const { t: tExplorer } = useDatabaseExplorerTranslation();
  const [loading, setLoading] = useState(false);
  const form = useForm<CreateDeviceForm>({
    defaultValues: {
      deviceName: '',
      timeseriesName: 'status',
      dataType: 'FLOAT',
      encoding: 'PLAIN',
      compression: 'SNAPPY',
    },
  });

  // IoTDB 数据类型选项
  const dataTypes = ['BOOLEAN', 'INT32', 'INT64', 'FLOAT', 'DOUBLE', 'TEXT'];

  // IoTDB 编码选项
  const encodings = ['PLAIN', 'RLE', 'GORILLA', 'DICTIONARY', 'TS_2DIFF'];

  // IoTDB 压缩选项
  const compressions = ['UNCOMPRESSED', 'SNAPPY', 'GZIP', 'LZ4', 'ZSTD'];

  const handleSubmit = async (values: CreateDeviceForm) => {
    if (!connectionId || !storageGroup) {
      showMessage.error(tExplorer('createDevice.errorNoConnection'));
      return;
    }

    try {
      setLoading(true);

      // 构建完整的时间序列路径: storageGroup.deviceName.timeseriesName
      const timeseriesPath = `${storageGroup}.${values.deviceName}.${values.timeseriesName}`;

      // 使用现有的 create_iotdb_timeseries 命令创建时间序列
      // 这会隐式创建设备
      await safeTauriInvoke('create_iotdb_timeseries', {
        connectionId,
        timeseriesPath,
        dataType: values.dataType,
        encoding: values.encoding,
        compression: values.compression,
      });

      showMessage.success(tExplorer('createDevice.success', { deviceName: values.deviceName }));

      form.reset();
      onClose();
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      showMessage.error(`${tExplorer('createDevice.failed')}: ${error}`);
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
      form.reset({
        deviceName: '',
        timeseriesName: 'status',
        dataType: 'FLOAT',
        encoding: 'PLAIN',
        compression: 'SNAPPY',
      });
    }
  }, [open, form]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{tExplorer('createDevice.title')}</DialogTitle>
          <DialogDescription>
            {tExplorer('createDevice.description', { storageGroup })}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="deviceName"
              rules={{
                required: tExplorer('createDevice.errorDeviceNameRequired'),
                pattern: {
                  value: /^[a-zA-Z_][a-zA-Z0-9_]*$/,
                  message: tExplorer('createDevice.errorDeviceNamePattern'),
                },
              }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{tExplorer('createDevice.labelDeviceName')} *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={tExplorer('createDevice.placeholderDeviceName')}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="timeseriesName"
              rules={{
                required: tExplorer('createDevice.errorTimeseriesNameRequired'),
                pattern: {
                  value: /^[a-zA-Z_][a-zA-Z0-9_]*$/,
                  message: tExplorer('createDevice.errorTimeseriesNamePattern'),
                },
              }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{tExplorer('createDevice.labelTimeseriesName')} *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={tExplorer('createDevice.placeholderTimeseriesName')}
                      {...field}
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    {tExplorer('createDevice.timeseriesHelp')}
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="dataType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{tExplorer('createDevice.labelDataType')}</FormLabel>
                  <FormControl>
                    <select
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      {...field}
                    >
                      {dataTypes.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="encoding"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{tExplorer('createDevice.labelEncoding')}</FormLabel>
                  <FormControl>
                    <select
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      {...field}
                    >
                      {encodings.map((enc) => (
                        <option key={enc} value={enc}>
                          {enc}
                        </option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="compression"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{tExplorer('createDevice.labelCompression')}</FormLabel>
                  <FormControl>
                    <select
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      {...field}
                    >
                      {compressions.map((comp) => (
                        <option key={comp} value={comp}>
                          {comp}
                        </option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="p-3 bg-muted rounded-md text-sm">
              <p className="font-medium">{tExplorer('createDevice.preview')}</p>
              <code className="text-xs block mt-1 break-all">
                {storageGroup}.{form.watch('deviceName') || '<device>'}.{form.watch('timeseriesName') || '<timeseries>'}
              </code>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={loading}
              >
                {tExplorer('createDevice.buttonCancel')}
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? tExplorer('createDevice.buttonCreating') : tExplorer('createDevice.buttonCreate')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateDeviceDialog;
