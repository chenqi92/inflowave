import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Button,
  Alert,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Separator,
  CustomDialog,
  Label,
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui';
import { useDialog } from '@/hooks/useDialog';
import { showMessage } from '@/utils/message';
import {
  Save,
  RefreshCw,
  Settings,
  Database,
  Bell,
  FileDown,
  FileUp,
  Monitor,
  User,
  Shield,
  Info,
  Download,
  ExternalLink,
  FileText,
  Globe,
  Keyboard,
} from 'lucide-react';
import { safeTauriInvoke, isBrowserEnvironment } from '@/utils/tauri';
import { saveJsonFile } from '@/utils/nativeDownload';
import { useAppStore } from '@/store/app';
import { useConnectionStore } from '@/store/connection';
import { useTheme } from '@/components/providers/ThemeProvider';
import { ThemeColorSelectorWithPreview } from '@/components/ui/theme-color-selector';
import UserPreferencesComponent from '@/components/settings/UserPreferences';
import ControllerSettings from '@/components/settings/ControllerSettings';
import LoggingSettings from '@/components/settings/LoggingSettings';
import UserGuideModal from '@/components/common/UserGuideModal';
import LanguageManagement from '@/components/settings/LanguageManagement';
import KeyboardShortcuts from '@/components/settings/KeyboardShortcuts';
import { useNoticeStore } from '@/store/notice';
import { UpdateSettings } from '@/components/updater/UpdateSettings';
import { openExternalLink } from '@/utils/externalLinks';
import { dataExplorerRefresh } from '@/utils/refreshEvents';
import type { AppConfig } from '@/types';
import { getAppVersion } from '@/utils/version';
import { useTranslation, useSettingsTranslation, useCommonTranslation } from '@/hooks/useTranslation';
import { useLanguageSwitcher } from '@/hooks/useLanguageSwitcher';
import { LanguageSelector } from '@/components/settings/LanguageSelector';
import logger from '@/utils/logger';

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
  initialTab?: string;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ visible, onClose, initialTab = 'general' }) => {
  const dialog = useDialog();
  const [loading, setLoading] = useState(false);
  const form = useForm();
  const [userGuideVisible, setUserGuideVisible] = useState(false);
  const { config, setConfig, setLanguage, resetConfig } = useAppStore();
  const { clearConnections } = useConnectionStore();
  const { resetNoticeSettings, browserModeNoticeDismissed } = useNoticeStore();
  const { theme, setTheme, colorScheme, setColorScheme } = useTheme();

  // 国际化 hooks
  const { t: tSettings } = useSettingsTranslation();
  const { t: tCommon } = useCommonTranslation();
  const { switchLanguage } = useLanguageSwitcher();

  // 菜单面板宽度状态（使用百分比）
  const [menuPanelSize, setMenuPanelSize] = useState<number>(() => {
    const saved = localStorage.getItem('settings-menu-panel-size');
    return saved ? parseFloat(saved) : 20; // 默认 20%
  });

  // 保存菜单面板宽度
  const handleMenuPanelResize = (size: number) => {
    setMenuPanelSize(size);
    localStorage.setItem('settings-menu-panel-size', size.toString());
  };

  // 即时保存单个设置项
  const saveSettingImmediately = async (key: keyof AppConfig, value: any) => {
    try {
      const updatedConfig = { ...config, [key]: value };

      // 更新本地状态
      setConfig(updatedConfig);

      // 保存到后端
      try {
        const appSettings = {
          general: {
            theme: updatedConfig.theme || 'system',
            language: updatedConfig.language || 'zh-CN',
            startup_connection: null,
          },
          editor: {
            font_size: 14,
            font_family: "Monaco, 'Courier New', monospace",
            tab_size: 2,
            word_wrap: true,
            line_numbers: true,
            minimap: true,
          },
          query: {
            timeout: 30000,
            max_results: 10000,
            auto_complete: true,
            syntax_highlight: true,
            format_on_save: false,
          },
          visualization: {
            default_chart_type: 'line',
            refresh_interval: 5000,
            max_data_points: 1000,
            color_scheme: updatedConfig.colorScheme || 'default',
          },
          security: {
            encrypt_connections: true,
            session_timeout: 3600,
            require_confirmation: true,
            controller: {
              allow_delete_statements: false,
              allow_drop_statements: false,
              allow_dangerous_operations: false,
              require_confirmation_for_delete: true,
              require_confirmation_for_drop: true,
            },
          },
        };

        await safeTauriInvoke('update_app_settings', {
          newSettings: appSettings,
        });
      } catch (saveError) {
        logger.warn('保存配置到后端失败:', saveError);
      }
    } catch (error) {
      logger.error('保存设置失败:', error);
      showMessage.error(`${tCommon('error')}: ${error}`);
    }
  };



  // 导出配置
  const exportSettings = async () => {
    try {
      if (isBrowserEnvironment()) {
        // 浏览器环境：使用浏览器API导出
        const settings = {
          version: '1.0.0',
          exportTime: new Date().toISOString(),
          appSettings: config,
          connections: useConnectionStore.getState().connections,
          metadata: {
            application: 'InfloWave',
            description: 'InfloWave应用配置文件'
          }
        };

        try {
          // 尝试使用现代浏览器的文件系统访问API
          if ('showSaveFilePicker' in window) {
            const fileHandle = await (window as any).showSaveFilePicker({
              suggestedName: `inflowave-config-${new Date().toISOString().split('T')[0]}.json`,
              types: [
                {
                  description: 'JSON files',
                  accept: { 'application/json': ['.json'] },
                },
              ],
            });
            const writable = await fileHandle.createWritable();
            await writable.write(JSON.stringify(settings, null, 2));
            await writable.close();
            showMessage.success(tSettings('export_config'));
          } else {
            // 使用原生文件保存对话框作为降级方案
            const success = await saveJsonFile(settings, {
              filename: `inflowave-config-${new Date().toISOString().split('T')[0]}.json`,
              filters: [
                { name: '配置文件', extensions: ['json'] },
                { name: '所有文件', extensions: ['*'] }
              ]
            });

            if (success) {
              showMessage.success(tSettings('export_config'));
            }
          }
        } catch (exportError) {
          if ((exportError as Error).name === 'AbortError') {
            showMessage.info(tCommon('cancel'));
          } else {
            throw exportError;
          }
        }
      } else {
        // Tauri 环境：调用后端导出命令
        await safeTauriInvoke('export_settings');
        showMessage.success(tSettings('export_config'));
      }
    } catch (error) {
      logger.error('导出配置失败:', error);
      if (String(error).includes('取消') || String(error).includes('cancel')) {
        showMessage.info(tCommon('cancel'));
      } else {
        showMessage.error(`${tCommon('error')}: ${error}`);
      }
    }
  };

  // 导入配置
  const importSettings = async () => {
    try {
      if (isBrowserEnvironment()) {
        // 浏览器环境：使用文件输入
        showMessage.info('Browser import feature in development...');
        return;
      }

      // Tauri 环境：调用后端导入命令
      const importedSettings = await safeTauriInvoke('import_settings');
      if (importedSettings) {
        // 更新应用配置
        setConfig(importedSettings);

        // 刷新连接列表（因为后端已经处理了连接配置的导入）
        try {
          // 触发连接列表刷新
          window.dispatchEvent(new CustomEvent('refresh-connections'));
          showMessage.success(tSettings('import_config'));
        } catch (refreshError) {
          logger.warn('刷新连接列表失败:', refreshError);
          showMessage.success(tSettings('import_config'));
        }
      }
    } catch (error) {
      logger.error('导入配置失败:', error);
      if (String(error).includes('取消') || String(error).includes('cancel')) {
        showMessage.info(tCommon('cancel'));
      } else {
        showMessage.error(`${tCommon('error')}: ${error}`);
      }
    }
  };



  const tabItems = [
    {
      key: 'general',
      icon: <Settings className='w-4 h-4' />,
      label: tSettings('general'),
      children: (
        <div className='space-y-6 settings-content'>
          <div>
            <div className='flex items-center gap-3 mb-4'>
              <Monitor className='w-5 h-5 text-blue-600' />
              <div>
                <h2 className='text-lg font-semibold'>{tSettings('interface_settings')}</h2>
                <p className='text-xs text-muted-foreground'>
                  {tSettings('interface_settings_description')}
                </p>
              </div>
            </div>
            <div className='space-y-4'>
              <div className='grid grid-cols-2 gap-4 items-start'>
                <div className='space-y-2'>
                  <Label htmlFor='theme' className='flex items-center gap-2'>
                    <Monitor className='w-4 h-4' />
                    {tSettings('theme')}
                  </Label>
                  <Select
                    value={theme}
                    onValueChange={value => {
                      const newTheme = value as 'light' | 'dark' | 'system';
                      setTheme(newTheme);
                      saveSettingImmediately('theme', newTheme);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={tSettings('select_theme')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='light'>{tSettings('light_theme')}</SelectItem>
                      <SelectItem value='dark'>{tSettings('dark_theme')}</SelectItem>
                      <SelectItem value='system'>{tSettings('system_theme')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <LanguageSelector
                  showProgress={false}
                  showNativeName={true}
                  showFlag={true}
                  showLabel={true}
                />
              </div>

              {/* 软件风格设置 */}
              <div className='space-y-4'>
                <div>
                  <Label className='text-base font-medium'>{tSettings('software_style')}</Label>
                  <p className='text-sm text-muted-foreground'>
                    {tSettings('software_style_description')}
                  </p>
                </div>
                <ThemeColorSelectorWithPreview
                  value={colorScheme}
                  onChange={(value) => {
                    setColorScheme(value);
                    saveSettingImmediately('colorScheme', value);
                  }}
                />
              </div>

            </div>
          </div>

        </div>
      ),
    },
    {
      key: 'query',
      icon: <Shield className='w-4 h-4' />,
      label: tSettings('query_settings'),
      children: <ControllerSettings />,
    },
    {
      key: 'preferences',
      icon: <User className='w-4 h-4' />,
      label: tSettings('user_preferences'),
      children: <UserPreferencesComponent />,
    },
    {
      key: 'keyboard-shortcuts',
      icon: <Keyboard className='w-4 h-4' />,
      label: tSettings('keyboard_shortcuts_title'),
      children: <KeyboardShortcuts />,
    },
    {
      key: 'config',
      icon: <Database className='w-4 h-4' />,
      label: tSettings('config_management'),
      children: (
        <div className='space-y-6'>
          {/* 标准标题格式 */}
          <div className='flex items-center gap-3 mb-4'>
            <Database className='w-5 h-5 text-blue-600' />
            <div>
              <h2 className='text-lg font-semibold'>{tSettings('config_management')}</h2>
              <p className='text-xs text-muted-foreground'>
                {tSettings('config_management_description')}
              </p>
            </div>
          </div>

          <div>
            <h4 className='text-sm font-medium mb-3'>{tSettings('config_backup_restore')}</h4>
            <div className='flex flex-wrap gap-3'>
              <Button
                variant='outline'
                onClick={exportSettings}
              >
                <FileDown className='w-4 h-4 mr-2' />
                {tSettings('export_config')}
              </Button>
              <Button
                variant='outline'
                onClick={importSettings}
              >
                <FileUp className='w-4 h-4 mr-2' />
                {tSettings('import_config')}
              </Button>
            </div>
            <Alert className='mt-4'>
              <Info className='h-4 w-4' />
              <div>
                <h5 className='font-medium'>{tSettings('config_description')}</h5>
                <p className='text-sm text-muted-foreground mt-1'>
                  • <strong>{tSettings('export_config')}</strong>：{tSettings('export_config_description')}<br/>
                  • <strong>{tSettings('import_config')}</strong>：{tSettings('import_config_description')}
                </p>
              </div>
            </Alert>
          </div>
        </div>
      ),
    },

    {
      key: 'user-guide',
      icon: <Bell className='w-4 h-4' />,
      label: tSettings('user_guide'),
      children: (
        <div className='space-y-6'>
          {/* 页面标题 */}
          <div className='flex items-center gap-3 mb-4'>
            <Bell className='w-5 h-5 text-blue-600' />
            <div>
              <h2 className='text-lg font-semibold'>{tSettings('user_guide_title')}</h2>
              <p className='text-xs text-muted-foreground'>{tSettings('user_guide_description')}</p>
            </div>
          </div>

          {/* User guide settings */}
          <div className='space-y-4'>
            <div className='p-4 border rounded-lg'>
              <div className='mb-4'>
                <h4 className='text-base font-medium'>{tSettings('startup_guide')}</h4>
                <p className='text-sm text-muted-foreground'>
                  {tSettings('startup_guide_description')}
                </p>
              </div>
              <div className='flex items-center justify-between'>
                <div className='space-y-0.5'>
                  <Label className='text-sm'>{tSettings('enable_startup_guide')}</Label>
                  <p className='text-xs text-muted-foreground'>
                    {tSettings('enable_startup_guide_description')}
                  </p>
                </div>
                <Switch
                  checked={!browserModeNoticeDismissed}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      resetNoticeSettings();
                      showMessage.success(tSettings('startup_guide_enabled'));
                    } else {
                      useNoticeStore.getState().dismissBrowserModeNotice();
                      showMessage.success(tSettings('startup_guide_disabled'));
                    }
                  }}
                />
              </div>
            </div>

            <div className='flex flex-wrap gap-3'>
              <Button
                variant='outline'
                onClick={() => setUserGuideVisible(true)}
              >
                <Info className='w-4 h-4 mr-2' />
                {tSettings('view_user_guide')}
              </Button>
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'logging',
      icon: <FileText className='w-4 h-4' />,
      label: tSettings('logging'),
      children: <LoggingSettings />,
    },
    {
      key: 'language-management',
      icon: <Globe className='w-4 h-4' />,
      label: tSettings('language_management'),
      children: <LanguageManagement />,
    },
    {
      key: 'updates',
      icon: <Download className='w-4 h-4' />,
      label: tSettings('updates'),
      children: <UpdateSettings />,
    },
    {
      key: 'about-app',
      icon: <Info className='w-4 h-4' />,
      label: tSettings('about_app'),
      children: (
        <div className='space-y-6'>
          <div>
            <div className='flex items-center gap-3 mb-4'>
              <Info className='w-5 h-5 text-blue-600' />
              <div>
                <h2 className='text-lg font-semibold'>{tSettings('about_inflowave')}</h2>
                <p className='text-xs text-muted-foreground'>
                  {tSettings('about_inflowave_description')}
                </p>
              </div>
            </div>
          </div>

          <div className='space-y-4'>
            <div className='p-4 border rounded-lg'>
              <h4 className='font-medium mb-2'>{tSettings('app_info')}</h4>
              <div className='space-y-2 text-sm'>
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>{tSettings('app_name')}:</span>
                  <span>InfloWave</span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>{tSettings('version')}:</span>
                  <span>{getAppVersion()}</span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>{tSettings('build_time')}:</span>
                  <span>{new Date().toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            <div className='p-4 border rounded-lg'>
              <h4 className='font-medium mb-2'>{tSettings('open_source_project')}</h4>
              <p className='text-sm text-muted-foreground mb-3'>
                {tSettings('open_source_description')}
              </p>
              <Button
                variant='outline'
                onClick={async () => {
                  await openExternalLink('https://github.com/chenqi92/inflowave', {
                    showSuccessMessage: true,
                    successMessage: '正在打开GitHub项目页面',
                    showErrorMessage: true,
                    errorMessage: '打开GitHub页面失败'
                  });
                }}
              >
                <ExternalLink className='w-4 h-4 mr-2' />
                {tSettings('visit_github')}
              </Button>
            </div>

            <div className='p-4 border rounded-lg'>
              <h4 className='font-medium mb-2'>{tSettings('tech_stack')}</h4>
              <div className='grid grid-cols-2 gap-2 text-sm'>
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>{tSettings('frontend')}:</span>
                  <span>React + TypeScript</span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>{tSettings('backend')}:</span>
                  <span>Rust + Tauri</span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>{tSettings('ui_framework')}:</span>
                  <span>Shadcn/ui</span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>{tSettings('database')}:</span>
                  <span>InfluxDB</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <>
      <Dialog
        open={visible}
        onOpenChange={open => {
          if (!open) onClose();
        }}
      >
        <DialogContent className='max-w-5xl w-full h-[90vh] p-0 flex flex-col gap-0 settings-modal'>
          <DialogHeader className='px-6 py-3 border-b shrink-0 space-y-0'>
            <DialogTitle className='flex items-center gap-2'>
              <Settings className='w-5 h-5' />
              {tSettings('title')}
            </DialogTitle>
            <DialogDescription className='sr-only'>
              {tSettings('description')}
            </DialogDescription>
          </DialogHeader>
          <div className='flex flex-1 min-h-0'>
            <Tabs
              defaultValue={initialTab}
              orientation='vertical'
              className='flex flex-1 h-full'
            >
              <ResizablePanelGroup direction='horizontal' className='flex-1'>
                {/* 左侧菜单面板 - 可调整大小 */}
                <ResizablePanel
                  defaultSize={menuPanelSize}
                  minSize={15}
                  maxSize={35}
                  onResize={handleMenuPanelResize}
                  className='overflow-hidden'
                >
                  <TabsList className='flex flex-col h-fit w-full bg-muted/50 py-4 px-2 items-start justify-start rounded-none space-y-1'>
                    {tabItems.map(item => (
                      <TabsTrigger
                        key={item.key}
                        value={item.key}
                        className='w-full justify-start p-3 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-sm h-auto overflow-hidden'
                      >
                        <div className='flex items-center gap-2 min-w-0'>
                          <div className='shrink-0'>{item.icon}</div>
                          <span className='text-sm truncate'>{item.label}</span>
                        </div>
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </ResizablePanel>

                {/* 可拖动的分割线 */}
                <ResizableHandle
                  withHandle
                  className='w-1 bg-border hover:bg-primary/50 transition-colors cursor-col-resize'
                />

                {/* 右侧内容面板 */}
                <ResizablePanel defaultSize={100 - menuPanelSize} minSize={50}>
                  <div className='flex-1 min-w-0 overflow-hidden h-full'>
                    {tabItems.map(item => (
                      <TabsContent
                        key={item.key}
                        value={item.key}
                        className='h-full mt-0 px-6 py-4 data-[state=inactive]:hidden overflow-y-auto'
                      >
                        <div className='max-w-3xl pb-4'>{item.children}</div>
                      </TabsContent>
                    ))}
                  </div>
                </ResizablePanel>
              </ResizablePanelGroup>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>

      {/* 用户指引弹框 */}
      <UserGuideModal
        isOpen={userGuideVisible}
        onClose={() => setUserGuideVisible(false)}
      />

      {/* 对话框组件 */}
      <CustomDialog
        isOpen={dialog.isOpen}
        onClose={dialog.hideDialog}
        options={{
          ...dialog.dialogState.options,
          onConfirm: dialog.handleConfirm,
          onCancel: dialog.handleCancel,
        }}
      />
    </>
  );
};

export default SettingsModal;
