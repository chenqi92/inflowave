import React, { useState, useMemo } from 'react';
import {
  Button,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Switch,
  Badge,
  Separator,
  Input,
} from '@/components/ui';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Database,
  Zap,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { useQueryControllerSettings } from '@/hooks/useQueryControllerSettings';
import { useSettingsTranslation, useCommonTranslation } from '@/hooks/useTranslation';
import { cn } from '@/lib/utils';

/**
 * 工具栏快速设置组件
 * 
 * 提供常用设置的快速访问入口，包括：
 * - DELETE/DROP 语句权限控制
 * - 安全确认设置
 * - 查询懒加载模式
 */
const QuickSettings: React.FC = () => {
  const [open, setOpen] = useState(false);
  const { t } = useSettingsTranslation();
  const { t: tCommon } = useCommonTranslation();
  const {
    settings,
    loading,
    updateControllerSettings,
    updateQuerySettings,
  } = useQueryControllerSettings();

  // 计算危险操作启用数量（用于徽章显示）
  const dangerousOpsCount = useMemo(() => {
    let count = 0;
    if (settings.controller.allow_delete_statements) count++;
    if (settings.controller.allow_drop_statements) count++;
    return count;
  }, [settings.controller]);

  // 计算安全级别
  const safetyLevel = useMemo(() => {
    if (dangerousOpsCount === 0) return 'safe';
    if (dangerousOpsCount === 1) return 'warning';
    return 'danger';
  }, [dangerousOpsCount]);

  // 安全级别配置
  const safetyConfig = {
    safe: {
      icon: ShieldCheck,
      color: 'text-green-600',
      bgColor: 'bg-green-50 dark:bg-green-950',
      borderColor: 'border-green-200 dark:border-green-800',
    },
    warning: {
      icon: ShieldAlert,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50 dark:bg-amber-950',
      borderColor: 'border-amber-200 dark:border-amber-800',
    },
    danger: {
      icon: ShieldAlert,
      color: 'text-red-600',
      bgColor: 'bg-red-50 dark:bg-red-950',
      borderColor: 'border-red-200 dark:border-red-800',
    },
  };

  const currentSafetyConfig = safetyConfig[safetyLevel];
  const SafetyIcon = currentSafetyConfig.icon;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant='ghost'
          size='sm'
          className='h-8 min-w-12 px-1.5 py-0.5 flex flex-col items-center justify-center gap-0.5 relative'
          title={t('quick_settings')}
        >
          {dangerousOpsCount > 0 && (
            <Badge
              variant='destructive'
              className='absolute top-0 right-0 h-3.5 w-3.5 p-0 text-[9px] rounded-full -translate-y-1/2 translate-x-1/2 z-10 justify-center'
            >
              {dangerousOpsCount}
            </Badge>
          )}
          <Shield className='w-3.5 h-3.5' />
          <span className='text-[10px] whitespace-nowrap'>{t('quick_settings_panel.title')}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-80' align='end'>
        <div className='space-y-4'>
          {/* 标题和安全状态 */}
          <div className='space-y-2'>
            <div className='flex items-center justify-between'>
              <h4 className='font-semibold text-sm'>{t('quick_settings')}</h4>
              <div
                className={cn(
                  'flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium',
                  currentSafetyConfig.bgColor,
                  currentSafetyConfig.borderColor,
                  currentSafetyConfig.color,
                  'border'
                )}
              >
                <SafetyIcon className='w-3.5 h-3.5' />
                {safetyLevel === 'safe' && t('safety_mode')}
                {safetyLevel === 'warning' && t('warning_mode')}
                {safetyLevel === 'danger' && t('danger_mode')}
              </div>
            </div>
            <p className='text-xs text-muted-foreground'>
              {t('quick_settings_description')}
            </p>
          </div>

          <Separator />

          {/* 语句权限控制 */}
          <div className='space-y-3'>
            <div className='flex items-center gap-2'>
              <Database className='w-4 h-4 text-muted-foreground' />
              <span className='text-sm font-medium'>{t('statement_permissions')}</span>
            </div>

            {/* DELETE 语句 */}
            <div className='flex items-center justify-between pl-6'>
              <div className='space-y-0.5'>
                <div className='flex items-center gap-1.5'>
                  <Trash2 className='w-3.5 h-3.5 text-red-500' />
                  <label className='text-sm font-medium cursor-pointer'>
                    {t('delete_statement')}
                  </label>
                </div>
                <p className='text-xs text-muted-foreground'>
                  {t('delete_statement_description')}
                </p>
              </div>
              <Switch
                checked={settings.controller.allow_delete_statements}
                onCheckedChange={(checked) =>
                  updateControllerSettings({ allow_delete_statements: checked })
                }
                disabled={loading}
              />
            </div>

            {/* DROP 语句 */}
            <div className='flex items-center justify-between pl-6'>
              <div className='space-y-0.5'>
                <div className='flex items-center gap-1.5'>
                  <Database className='w-3.5 h-3.5 text-red-600' />
                  <label className='text-sm font-medium cursor-pointer'>
                    {t('drop_statement')}
                  </label>
                </div>
                <p className='text-xs text-muted-foreground'>
                  {t('drop_statement_description')}
                </p>
              </div>
              <Switch
                checked={settings.controller.allow_drop_statements}
                onCheckedChange={(checked) =>
                  updateControllerSettings({ allow_drop_statements: checked })
                }
                disabled={loading}
              />
            </div>

            {/* 允许危险操作 */}
            <div className='flex items-center justify-between pl-6'>
              <div className='space-y-0.5'>
                <div className='flex items-center gap-1.5'>
                  <ShieldAlert className='w-3.5 h-3.5 text-orange-600' />
                  <label className='text-sm font-medium cursor-pointer'>
                    {t('quick_settings_panel.allow_dangerous_operations')}
                  </label>
                </div>
                <p className='text-xs text-muted-foreground'>
                  {t('quick_settings_panel.allow_dangerous_operations_description')}
                </p>
              </div>
              <Switch
                checked={settings.controller.allow_dangerous_operations}
                onCheckedChange={(checked) =>
                  updateControllerSettings({ allow_dangerous_operations: checked })
                }
                disabled={loading}
              />
            </div>
          </div>

          <Separator />

          {/* 安全确认 */}
          <div className='space-y-3'>
            <div className='flex items-center gap-2'>
              <AlertTriangle className='w-4 h-4 text-muted-foreground' />
              <span className='text-sm font-medium'>{t('security')}</span>
            </div>

            {/* DELETE 确认 */}
            <div className='flex items-center justify-between pl-6'>
              <div className='space-y-0.5'>
                <label className='text-sm font-medium cursor-pointer'>
                  {t('delete_statement')} {tCommon('confirm')}
                </label>
                <p className='text-xs text-muted-foreground'>
                  {t('show_confirmation_dialog')}
                </p>
              </div>
              <Switch
                checked={settings.controller.require_confirmation_for_delete}
                onCheckedChange={(checked) =>
                  updateControllerSettings({
                    require_confirmation_for_delete: checked,
                  })
                }
                disabled={
                  loading || !settings.controller.allow_delete_statements
                }
              />
            </div>

            {/* DROP 确认 */}
            <div className='flex items-center justify-between pl-6'>
              <div className='space-y-0.5'>
                <label className='text-sm font-medium cursor-pointer'>
                  {t('drop_statement')} {tCommon('confirm')}
                </label>
                <p className='text-xs text-muted-foreground'>
                  {t('show_confirmation_dialog')}
                </p>
              </div>
              <Switch
                checked={settings.controller.require_confirmation_for_drop}
                onCheckedChange={(checked) =>
                  updateControllerSettings({
                    require_confirmation_for_drop: checked,
                  })
                }
                disabled={loading || !settings.controller.allow_drop_statements}
              />
            </div>
          </div>

          <Separator />

          {/* 查询优化 */}
          <div className='space-y-3'>
            <div className='flex items-center gap-2'>
              <Zap className='w-4 h-4 text-muted-foreground' />
              <span className='text-sm font-medium'>{t('query_settings_title')}</span>
            </div>

            {/* 懒加载模式 */}
            <div className='flex items-center justify-between pl-6'>
              <div className='space-y-0.5'>
                <div className='flex items-center gap-1.5'>
                  <CheckCircle2 className='w-3.5 h-3.5 text-green-500' />
                  <label className='text-sm font-medium cursor-pointer'>
                    {t('lazy_load_mode')}
                  </label>
                </div>
                <p className='text-xs text-muted-foreground'>
                  {t('lazy_load_description')}
                </p>
              </div>
              <Switch
                checked={settings.query.enable_lazy_loading}
                onCheckedChange={(checked) =>
                  updateQuerySettings({ enable_lazy_loading: checked })
                }
                disabled={loading}
              />
            </div>

            {/* 懒加载批次大小 */}
            <div className='pl-6 space-y-2'>
              <label className='text-sm font-medium'>{t('lazy_load_threshold')}</label>
              <div className='flex items-center gap-2'>
                <Input
                  type='number'
                  min={100}
                  max={10000}
                  step={100}
                  value={settings.query.lazy_loading_batch_size}
                  onChange={(e) => {
                    const value = e.target.value;
                    // 允许空值或正在输入的中间状态
                    if (value === '') {
                      updateQuerySettings({ lazy_loading_batch_size: 100 });
                      return;
                    }
                    const numValue = parseInt(value);
                    // 只要是有效数字就允许输入
                    if (!isNaN(numValue)) {
                      updateQuerySettings({ lazy_loading_batch_size: numValue });
                    }
                  }}
                  onBlur={(e) => {
                    // 失焦时确保值在有效范围内
                    const value = parseInt(e.target.value);
                    if (isNaN(value) || value < 100) {
                      updateQuerySettings({ lazy_loading_batch_size: 100 });
                    } else if (value > 10000) {
                      updateQuerySettings({ lazy_loading_batch_size: 10000 });
                    }
                  }}
                  disabled={loading || !settings.query.enable_lazy_loading}
                  className='h-8 text-sm'
                />
                <span className='text-xs text-muted-foreground whitespace-nowrap'>
                  {t('rows')}
                </span>
              </div>
              <p className='text-xs text-muted-foreground'>
                {t('lazy_load_threshold_description')}
              </p>
            </div>
          </div>

          {/* 底部提示 */}
          <div className='pt-2 border-t'>
            <p className='text-xs text-muted-foreground text-center'>
              {t('quick_settings_panel.more_settings_hint')}{' '}
              <span className='text-primary font-medium'>{t('quick_settings_panel.preferences_panel')}</span> {tCommon('panel')}
            </p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default QuickSettings;

