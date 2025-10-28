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
          className='h-10 w-14 p-1 flex flex-col items-center justify-center gap-1 relative'
          title='快速设置'
        >
          <Shield className='w-4 h-4' />
          <span className='text-xs'>安全设置</span>
          {dangerousOpsCount > 0 && (
            <Badge
              variant='destructive'
              className='absolute -top-1 -right-1 h-4 w-4 p-0 text-[10px] flex items-center justify-center min-w-[16px] rounded-full'
            >
              {dangerousOpsCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-80' align='end'>
        <div className='space-y-4'>
          {/* 标题和安全状态 */}
          <div className='space-y-2'>
            <div className='flex items-center justify-between'>
              <h4 className='font-semibold text-sm'>快速设置</h4>
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
                {safetyLevel === 'safe' && '安全模式'}
                {safetyLevel === 'warning' && '警告'}
                {safetyLevel === 'danger' && '危险'}
              </div>
            </div>
            <p className='text-xs text-muted-foreground'>
              快速切换常用的查询和安全设置
            </p>
          </div>

          <Separator />

          {/* 语句权限控制 */}
          <div className='space-y-3'>
            <div className='flex items-center gap-2'>
              <Database className='w-4 h-4 text-muted-foreground' />
              <span className='text-sm font-medium'>语句权限</span>
            </div>

            {/* DELETE 语句 */}
            <div className='flex items-center justify-between pl-6'>
              <div className='space-y-0.5'>
                <div className='flex items-center gap-1.5'>
                  <Trash2 className='w-3.5 h-3.5 text-red-500' />
                  <label className='text-sm font-medium cursor-pointer'>
                    DELETE 语句
                  </label>
                </div>
                <p className='text-xs text-muted-foreground'>
                  允许执行删除数据的语句
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
                    DROP 语句
                  </label>
                </div>
                <p className='text-xs text-muted-foreground'>
                  允许删除数据库/表结构
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
          </div>

          <Separator />

          {/* 安全确认 */}
          <div className='space-y-3'>
            <div className='flex items-center gap-2'>
              <AlertTriangle className='w-4 h-4 text-muted-foreground' />
              <span className='text-sm font-medium'>安全确认</span>
            </div>

            {/* DELETE 确认 */}
            <div className='flex items-center justify-between pl-6'>
              <div className='space-y-0.5'>
                <label className='text-sm font-medium cursor-pointer'>
                  DELETE 操作确认
                </label>
                <p className='text-xs text-muted-foreground'>
                  执行前显示确认对话框
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
                  DROP 操作确认
                </label>
                <p className='text-xs text-muted-foreground'>
                  执行前显示确认对话框
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
              <span className='text-sm font-medium'>查询优化</span>
            </div>

            {/* 懒加载模式 */}
            <div className='flex items-center justify-between pl-6'>
              <div className='space-y-0.5'>
                <div className='flex items-center gap-1.5'>
                  <CheckCircle2 className='w-3.5 h-3.5 text-green-500' />
                  <label className='text-sm font-medium cursor-pointer'>
                    懒加载模式
                  </label>
                </div>
                <p className='text-xs text-muted-foreground'>
                  分批加载大量数据，提升性能
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
              <label className='text-sm font-medium'>批次大小</label>
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
                  条/批次
                </span>
              </div>
              <p className='text-xs text-muted-foreground'>
                每批加载的数据行数 (100-10000)
              </p>
            </div>
          </div>

          {/* 底部提示 */}
          <div className='pt-2 border-t'>
            <p className='text-xs text-muted-foreground text-center'>
              更多设置请前往{' '}
              <span className='text-primary font-medium'>偏好设置</span> 面板
            </p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default QuickSettings;

