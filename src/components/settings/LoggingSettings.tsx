/**
 * 日志设置组件
 */

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  Button,
  Switch,
  Alert,
  AlertDescription,
  Badge,
  Title,
  Text,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui';
import { showMessage } from '@/utils/message';
import {
  FileText,
  Save,
  RefreshCw,
  FolderOpen,
  Info,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { useUserPreferencesStore, type LoggingSettings } from '@/stores/userPreferencesStore';
import { open } from '@tauri-apps/plugin-shell';
import { logger, LogLevel } from '@/utils/logger';
import { invoke } from '@tauri-apps/api/core';
import { toast } from 'sonner';

interface LogFileInfo {
  name: string;
  path: string;
  size: number;
  modified: string;
  created: string;
}

const LoggingSettingsComponent: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const { preferences, updateLogging } = useUserPreferencesStore();
  const [logFiles, setLogFiles] = useState<LogFileInfo[]>([]);
  const [totalSize, setTotalSize] = useState(0);

  const form = useForm<LoggingSettings>({
    defaultValues: preferences.logging,
  });

  // 当 store 中的设置变化时，更新表单
  useEffect(() => {
    if (preferences.logging) {
      form.reset(preferences.logging);
    }
  }, [preferences.logging, form]);

  // 加载日志文件列表
  const loadLogFiles = async () => {
    try {
      const files = await invoke<LogFileInfo[]>('list_log_files');
      setLogFiles(files);
      const total = files.reduce((sum, file) => sum + file.size, 0);
      setTotalSize(total);
    } catch (error) {
      console.error('加载日志文件列表失败:', error);
    }
  };

  // 初始加载
  useEffect(() => {
    loadLogFiles();
  }, []);

  // 保存日志设置
  const saveSettings = async (values: LoggingSettings) => {
    setLoading(true);
    try {
      await updateLogging(values);
      
      // 立即更新 logger 配置
      const logLevel = stringToLogLevel(values.level);
      logger.setLevel(logLevel);
      
      showMessage.success('日志设置已保存');
    } catch (error) {
      console.error('保存日志设置失败:', error);
      showMessage.error('保存日志设置失败');
    } finally {
      setLoading(false);
    }
  };

  // 字符串转 LogLevel
  const stringToLogLevel = (level: string): LogLevel => {
    switch (level.toUpperCase()) {
      case 'ERROR':
        return LogLevel.ERROR;
      case 'WARN':
        return LogLevel.WARN;
      case 'INFO':
        return LogLevel.INFO;
      case 'DEBUG':
        return LogLevel.DEBUG;
      default:
        return LogLevel.INFO;
    }
  };

  // 重置为默认值
  const handleReset = () => {
    form.reset({
      level: 'INFO',
      enable_file_logging: true,
      max_file_size_mb: 10,
      max_files: 5,
    });
    showMessage.success('已重置为默认值');
  };

  // 清理旧日志文件
  const handleCleanupOldLogs = async () => {
    try {
      const maxFiles = form.getValues('max_files');
      const deletedCount = await invoke<number>('cleanup_old_log_files', { keepCount: maxFiles });
      toast.success(`已清理 ${deletedCount} 个旧日志文件`);
      await loadLogFiles();
    } catch (error) {
      console.error('清理日志文件失败:', error);
      toast.error('清理日志文件失败');
    }
  };

  // 删除所有日志文件
  const handleDeleteAllLogs = async () => {
    if (!confirm('确定要删除所有日志文件吗？此操作不可恢复。')) {
      return;
    }

    try {
      for (const file of logFiles) {
        await invoke('delete_log_file', { path: file.path });
      }
      toast.success('已删除所有日志文件');
      await loadLogFiles();
    } catch (error) {
      console.error('删除日志文件失败:', error);
      toast.error('删除日志文件失败');
    }
  };

  // 格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  // 打开日志文件夹
  const handleOpenLogFolder = async () => {
    try {
      // 使用 Tauri shell 插件打开日志文件夹
      await open('logs');
      showMessage.success('已打开日志文件夹');
    } catch (error) {
      console.error('打开日志文件夹失败:', error);
      showMessage.error('打开日志文件夹失败');
    }
  };

  const currentLevel = form.watch('level');

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(saveSettings)} className="space-y-6">
        {/* 标题 */}
        <div className="flex items-center gap-3 mb-4">
          <FileText className="w-6 h-6 text-blue-600" />
          <div>
            <Title className="text-2xl font-bold">日志设置</Title>
            <Text className="text-muted-foreground">
              配置应用程序的日志级别和文件存储
            </Text>
          </div>
        </div>

        {/* 日志级别说明 */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">日志级别说明：</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li><strong>ERROR</strong>: 仅显示错误信息（生产环境推荐）</li>
                <li><strong>WARN</strong>: 显示警告和错误信息</li>
                <li><strong>INFO</strong>: 显示一般信息、警告和错误（默认）</li>
                <li><strong>DEBUG</strong>: 显示所有日志，包括调试信息（开发调试用）</li>
              </ul>
            </div>
          </AlertDescription>
        </Alert>

        {/* 日志级别选择 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">控制台日志</CardTitle>
            <CardDescription>
              控制在浏览器控制台中显示的日志级别
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="level"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>日志级别</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="选择日志级别" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="ERROR">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-red-500" />
                          <span>ERROR - 仅错误</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="WARN">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-yellow-500" />
                          <span>WARN - 警告及以上</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="INFO">
                        <div className="flex items-center gap-2">
                          <Info className="w-4 h-4 text-blue-500" />
                          <span>INFO - 信息及以上（推荐）</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="DEBUG">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                          <span>DEBUG - 所有日志</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    当前级别: <Badge variant="outline">{currentLevel}</Badge>
                    {currentLevel === 'DEBUG' && (
                      <span className="text-yellow-600 ml-2">
                        ⚠️ DEBUG 级别会产生大量日志，可能影响性能
                      </span>
                    )}
                  </FormDescription>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* 文件日志设置 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">文件日志</CardTitle>
            <CardDescription>
              将日志保存到文件，便于问题排查和分析
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="enable_file_logging"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">启用文件日志</FormLabel>
                    <FormDescription>
                      将日志保存到 logs 文件夹
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="max_file_size_mb"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>单个文件最大大小 (MB)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>
                    超过此大小后会自动创建新的日志文件
                  </FormDescription>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="max_files"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>保留文件数量</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      max={20}
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>
                    最多保留的历史日志文件数量，超过后自动删除最旧的文件
                  </FormDescription>
                </FormItem>
              )}
            />

            <Button
              type="button"
              variant="outline"
              onClick={handleOpenLogFolder}
              className="w-full"
            >
              <FolderOpen className="w-4 h-4 mr-2" />
              打开日志文件夹
            </Button>
          </CardContent>
        </Card>

        {/* 日志文件管理 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              日志文件管理
            </CardTitle>
            <CardDescription>
              查看和管理日志文件
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 统计信息 */}
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div>
                <div className="text-sm text-muted-foreground">日志文件数量</div>
                <div className="text-2xl font-bold">{logFiles.length}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">总大小</div>
                <div className="text-2xl font-bold">{formatFileSize(totalSize)}</div>
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={loadLogFiles}
                className="flex-1"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                刷新列表
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleCleanupOldLogs}
                className="flex-1"
              >
                清理旧文件
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleDeleteAllLogs}
                className="flex-1"
              >
                删除全部
              </Button>
            </div>

            {/* 文件列表 */}
            {logFiles.length > 0 && (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {logFiles.map((file) => (
                  <div
                    key={file.path}
                    className="flex items-center justify-between p-2 border rounded hover:bg-accent/50"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{file.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatFileSize(file.size)} • {new Date(file.modified).toLocaleString()}
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        try {
                          await invoke('delete_log_file', { path: file.path });
                          toast.success('文件已删除');
                          await loadLogFiles();
                        } catch (error) {
                          console.error('删除文件失败:', error);
                          toast.error('删除文件失败');
                        }
                      }}
                    >
                      删除
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 操作按钮 */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={handleReset}
            disabled={loading}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            重置为默认
          </Button>
          <Button type="submit" disabled={loading}>
            <Save className="w-4 h-4 mr-2" />
            保存设置
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default LoggingSettingsComponent;

