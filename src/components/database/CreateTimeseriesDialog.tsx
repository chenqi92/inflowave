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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui';
import { safeTauriInvoke } from '@/utils/tauri';
import { showMessage } from '@/utils/message';
import { useDatabaseExplorerTranslation } from '@/hooks/useTranslation';

interface CreateTimeseriesDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  connectionId: string;
  devicePath: string;
}

interface CreateTimeseriesForm {
  timeseriesName: string;
  dataType: string;
  encoding: string;
  compression: string;
}

/**
 * IoTDB 时间序列创建对话框
 *
 * 在已有设备上创建新的时间序列
 */
const CreateTimeseriesDialog: React.FC<CreateTimeseriesDialogProps> = ({
  open,
  onClose,
  onSuccess,
  connectionId,
  devicePath,
}) => {
  const { t: tExplorer } = useDatabaseExplorerTranslation();
  const [loading, setLoading] = useState(false);
  const form = useForm<CreateTimeseriesForm>({
    defaultValues: {
      timeseriesName: '',
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

  const handleSubmit = async (values: CreateTimeseriesForm) => {
    if (!values.timeseriesName.trim()) {
      showMessage.error('时间序列名称不能为空');
      return;
    }

    try {
      setLoading(true);

      // 构建完整的时间序列路径: devicePath.timeseriesName
      const timeseriesPath = `${devicePath}.${values.timeseriesName}`;

      await safeTauriInvoke('create_iotdb_timeseries', {
        connectionId,
        timeseriesPath,
        dataType: values.dataType,
        encoding: values.encoding,
        compression: values.compression,
      });

      showMessage.success(`时间序列 ${values.timeseriesName} 创建成功`);

      form.reset();
      onClose();
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      showMessage.error(`创建时间序列失败: ${error}`);
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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>创建时间序列</DialogTitle>
          <DialogDescription>
            在设备 {devicePath} 上创建新的时间序列
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="timeseriesName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>时间序列名称</FormLabel>
                  <FormControl>
                    <Input placeholder="例如: temperature" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />




            <FormField
              control={form.control}
              name="dataType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>数据类型</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="选择数据类型" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {dataTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="encoding"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>编码方式</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="选择编码方式" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {encodings.map((enc) => (
                        <SelectItem key={enc} value={enc}>
                          {enc}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="compression"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>压缩方式</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="选择压缩方式" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {compressions.map((comp) => (
                        <SelectItem key={comp} value={comp}>
                          {comp}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
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

export default CreateTimeseriesDialog;
