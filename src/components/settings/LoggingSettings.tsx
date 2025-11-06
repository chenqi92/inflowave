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
import { logger, LogLevel } from '@/utils/logger';
import { invoke } from '@tauri-apps/api/core';
import { toast } from 'sonner';
import { useSettingsTranslation } from '@/hooks/useTranslation';

interface LogFileInfo {
  name: string;
  path: string;
  size: number;
  modified: string;
  created: string;
}

const LoggingSettingsComponent: React.FC = () => {
  const { t } = useSettingsTranslation();
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
      console.error(t('logging_settings.load_failed'), error);
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
      
      showMessage.success(t('logging_settings.settings_saved'));
    } catch (error) {
      console.error(t('logging_settings.settings_save_failed'), error);
      showMessage.error(t('logging_settings.settings_save_failed'));
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
    showMessage.success(t('logging_settings.reset_success'));
  };

  // 清理旧日志文件
  const handleCleanupOldLogs = async () => {
    try {
      const maxFiles = form.getValues('max_files');
      const deletedCount = await invoke<number>('cleanup_old_log_files', { keepCount: maxFiles });
      toast.success(t('logging_settings.cleanup_success', { count: deletedCount }));
      await loadLogFiles();
    } catch (error) {
      console.error(t('logging_settings.cleanup_failed'), error);
      toast.error(t('logging_settings.cleanup_failed'));
    }
  };

  // 删除所有日志文件
  const handleDeleteAllLogs = async () => {
    if (!confirm(t('logging_settings.delete_all_confirm'))) {
      return;
    }

    try {
      for (const file of logFiles) {
        await invoke('delete_log_file', { path: file.path });
      }
      toast.success(t('logging_settings.delete_all_success'));
      await loadLogFiles();
    } catch (error) {
      console.error(t('logging_settings.delete_all_failed'), error);
      toast.error(t('logging_settings.delete_all_failed'));
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
      await invoke('open_log_folder');
      showMessage.success(t('logging_settings.log_folder_opened'));
    } catch (error) {
      console.error(t('logging_settings.log_folder_open_failed'), error);
      showMessage.error(t('logging_settings.log_folder_open_failed'));
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
            <Title className="text-2xl font-bold">{t('logging_settings.title')}</Title>
            <Text className="text-muted-foreground">
              {t('logging_settings.description')}
            </Text>
          </div>
        </div>



        {/* 日志级别说明 */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">{t('logging_settings.log_level_info')}</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li><strong>{t('logging_settings.level_error')}</strong>: {t('logging_settings.level_error_desc')}</li>
                <li><strong>{t('logging_settings.level_warn')}</strong>: {t('logging_settings.level_warn_desc')}</li>
                <li><strong>{t('logging_settings.level_info')}</strong>: {t('logging_settings.level_info_desc')}</li>
                <li><strong>{t('logging_settings.level_debug')}</strong>: {t('logging_settings.level_debug_desc')}</li>
              </ul>
            </div>
          </AlertDescription>
        </Alert>

        {/* 日志级别选择 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('logging_settings.console_logging')}</CardTitle>
            <CardDescription>
              {t('logging_settings.console_logging_desc')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="level"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('logging_settings.log_level')}</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('logging_settings.select_log_level')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="ERROR">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-red-500" />
                          <span>{t('logging_settings.level_error')} - {t('logging_settings.error_only')}</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="WARN">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-yellow-500" />
                          <span>{t('logging_settings.level_warn')} - {t('logging_settings.warn_and_above')}</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="INFO">
                        <div className="flex items-center gap-2">
                          <Info className="w-4 h-4 text-blue-500" />
                          <span>{t('logging_settings.level_info')} - {t('logging_settings.info_and_above')}</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="DEBUG">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                          <span>{t('logging_settings.level_debug')} - {t('logging_settings.all_logs')}</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    {t('logging_settings.current_level')}: <Badge variant="outline">{currentLevel}</Badge>
                    {currentLevel === 'DEBUG' && (
                      <span className="text-yellow-600 ml-2">
                        {t('logging_settings.debug_warning')}
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
            <CardTitle className="text-lg">{t('logging_settings.file_logging')}</CardTitle>
            <CardDescription>
              {t('logging_settings.file_logging_desc')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="enable_file_logging"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">{t('logging_settings.enable_file_logging')}</FormLabel>
                    <FormDescription>
                      {t('logging_settings.enable_file_logging_desc')}
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
                  <FormLabel>{t('logging_settings.max_file_size')}</FormLabel>
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
                    {t('logging_settings.max_file_size_desc')}
                  </FormDescription>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="max_files"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('logging_settings.max_files')}</FormLabel>
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
                    {t('logging_settings.max_files_desc')}
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
              {t('logging_settings.open_log_folder')}
            </Button>
          </CardContent>
        </Card>

        {/* 日志文件管理 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              {t('logging_settings.log_file_management')}
            </CardTitle>
            <CardDescription>
              {t('logging_settings.log_file_management_desc')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 统计信息 */}
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div>
                <div className="text-sm text-muted-foreground">{t('logging_settings.log_file_count')}</div>
                <div className="text-2xl font-bold">{logFiles.length}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">{t('logging_settings.total_size')}</div>
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
                {t('logging_settings.refresh_list')}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleCleanupOldLogs}
                className="flex-1"
              >
                {t('logging_settings.cleanup_old_files')}
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleDeleteAllLogs}
                className="flex-1"
              >
                {t('logging_settings.delete_all')}
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
                          toast.success(t('logging_settings.file_deleted'));
                          await loadLogFiles();
                        } catch (error) {
                          console.error(t('logging_settings.delete_failed'), error);
                          toast.error(t('logging_settings.delete_failed'));
                        }
                      }}
                    >
                      {t('logging_settings.delete')}
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
            {t('controller_settings.reset_to_default')}
          </Button>
          <Button type="submit" disabled={loading}>
            <Save className="w-4 h-4 mr-2" />
            {t('controller_settings.save_settings')}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default LoggingSettingsComponent;

