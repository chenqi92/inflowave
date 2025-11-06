/**
 * 主题自定义对话框
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Button,
  Label,
  Badge,
  ScrollArea,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
} from '@/components/ui';
import {
  Palette,
  Sun,
  Moon,
  Monitor,
  Type,
  Circle,
  Download,
  Upload,
  RotateCcw,
  Save,
  Trash2,
  Eye,
  Check,
} from 'lucide-react';
import { themeManager } from '@/utils/themeManager';
import { useTheme } from '@/components/providers/ThemeProvider';
import { colorSchemes } from '@/types/theme';
import type { ThemeMode, ColorScheme, FontSize, BorderRadius, ThemePreset } from '@/types/theme';
import { showMessage } from '@/utils/message';
import { saveAs } from 'file-saver';
import { useSettingsTranslation } from '@/hooks/useTranslation';

/**
 * 组件属性
 */
export interface ThemeCustomDialogProps {
  /** 是否打开 */
  open: boolean;
  /** 关闭回调 */
  onClose: () => void;
}

/**
 * 主题自定义对话框组件
 */
export const ThemeCustomDialog: React.FC<ThemeCustomDialogProps> = ({
  open,
  onClose,
}) => {
  const { t } = useSettingsTranslation();
  const { theme, setTheme, colorScheme, setColorScheme } = useTheme();
  const [currentTab, setCurrentTab] = useState('appearance');
  const [presets, setPresets] = useState<ThemePreset[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [presetName, setPresetName] = useState('');

  // 加载预设
  useEffect(() => {
    if (open) {
      setPresets(themeManager.getAllPresets());
    }
  }, [open]);

  // 主题模式选项
  const themeModes: { value: ThemeMode; label: string; icon: any }[] = [
    { value: 'light', label: t('theme_mode_light') || '浅色模式', icon: Sun },
    { value: 'dark', label: t('theme_mode_dark') || '深色模式', icon: Moon },
    { value: 'system', label: t('theme_mode_system') || '跟随系统', icon: Monitor },
  ];

  // 字体大小选项
  const fontSizes: { value: FontSize; label: string; size: string }[] = [
    { value: 'xs', label: t('font_size_xs') || '极小', size: '12px' },
    { value: 'sm', label: t('font_size_sm') || '小', size: '14px' },
    { value: 'base', label: t('font_size_base') || '标准', size: '16px' },
    { value: 'lg', label: t('font_size_lg') || '大', size: '18px' },
    { value: 'xl', label: t('font_size_xl') || '极大', size: '20px' },
  ];

  // 圆角大小选项
  const borderRadiuses: { value: BorderRadius; label: string }[] = [
    { value: 'none', label: t('border_radius_none') || '无圆角' },
    { value: 'sm', label: t('border_radius_sm') || '小圆角' },
    { value: 'md', label: t('border_radius_md') || '中圆角' },
    { value: 'lg', label: t('border_radius_lg') || '大圆角' },
    { value: 'xl', label: t('border_radius_xl') || '超大圆角' },
  ];

  // 处理主题模式变化
  const handleModeChange = (mode: ThemeMode) => {
    setTheme(mode);
    themeManager.setMode(mode);
  };

  // 处理颜色方案变化
  const handleColorSchemeChange = (scheme: ColorScheme) => {
    setColorScheme(scheme);
    themeManager.setColorScheme(scheme);
  };

  // 处理字体大小变化
  const handleFontSizeChange = (size: FontSize) => {
    themeManager.setFontSize(size);
    showMessage.success(t('font_size_updated') || '字体大小已更新');
  };

  // 处理圆角大小变化
  const handleBorderRadiusChange = (radius: BorderRadius) => {
    themeManager.setBorderRadius(radius);
    showMessage.success(t('border_radius_updated') || '圆角大小已更新');
  };

  // 应用预设
  const handleApplyPreset = (presetId: string) => {
    if (themeManager.applyPreset(presetId)) {
      const preset = themeManager.getPreset(presetId);
      if (preset) {
        setTheme(preset.config.mode);
        setColorScheme(preset.config.colorScheme);
        setSelectedPreset(presetId);
        showMessage.success(t('preset_applied', { name: preset.name }) || `已应用预设：${preset.name}`);
      }
    }
  };

  // 保存为预设
  const handleSavePreset = () => {
    if (!presetName.trim()) {
      showMessage.error(t('preset_name_required') || '请输入预设名称');
      return;
    }

    const config = themeManager.getConfig();
    const preset: ThemePreset = {
      id: `custom-${Date.now()}`,
      name: presetName,
      description: t('custom_theme_preset') || '自定义主题预设',
      config,
      builtin: false,
    };

    themeManager.addPreset(preset);
    setPresets(themeManager.getAllPresets());
    setPresetName('');
    showMessage.success(t('preset_saved') || '预设已保存');
  };

  // 删除预设
  const handleDeletePreset = (presetId: string) => {
    if (confirm(t('confirm_delete_preset') || '确定要删除此预设吗？')) {
      if (themeManager.deletePreset(presetId)) {
        setPresets(themeManager.getAllPresets());
        if (selectedPreset === presetId) {
          setSelectedPreset(null);
        }
        showMessage.success(t('preset_deleted') || '预设已删除');
      } else {
        showMessage.error(t('cannot_delete_builtin') || '无法删除内置预设');
      }
    }
  };

  // 重置主题
  const handleReset = () => {
    if (confirm(t('confirm_reset_theme') || '确定要重置主题到默认设置吗？')) {
      themeManager.reset();
      const config = themeManager.getConfig();
      setTheme(config.mode);
      setColorScheme(config.colorScheme);
      showMessage.success(t('theme_reset') || '主题已重置');
    }
  };

  // 导出主题
  const handleExport = () => {
    const data = themeManager.export(t('my_theme') || '我的主题', t('custom_theme_config') || '自定义主题配置');
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    saveAs(blob, `inflowave-theme-${Date.now()}.json`);
    showMessage.success(t('theme_exported') || '主题配置已导出');
  };

  // 导入主题
  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target?.result as string);
          if (themeManager.import(data)) {
            const config = themeManager.getConfig();
            setTheme(config.mode);
            setColorScheme(config.colorScheme);
            showMessage.success(t('theme_imported') || '主题配置已导入');
          } else {
            showMessage.error(t('import_failed') || '导入失败');
          }
        } catch (error) {
          showMessage.error(t('file_format_error') || '文件格式错误');
        }
      };
      reader.readAsText(file);
    };

    input.click();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5" />
            {t('theme_customization') || '主题自定义'}
          </DialogTitle>
          <DialogDescription>
            {t('theme_customization_desc') || '自定义应用外观，打造专属主题'}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={currentTab} onValueChange={setCurrentTab} className="flex-1 min-h-0 flex flex-col">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="appearance">{t('appearance_settings') || '外观设置'}</TabsTrigger>
            <TabsTrigger value="presets">{t('theme_presets') || '主题预设'}</TabsTrigger>
            <TabsTrigger value="advanced">{t('advanced_settings') || '高级设置'}</TabsTrigger>
          </TabsList>

          {/* 外观设置 */}
          <TabsContent value="appearance" className="flex-1 min-h-0">
            <ScrollArea className="h-full">
              <div className="space-y-6 p-1">
                {/* 主题模式 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">{t('theme_mode') || '主题模式'}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                      {themeModes.map((mode) => {
                        const Icon = mode.icon;
                        const isActive = theme === mode.value;

                        return (
                          <button
                            key={mode.value}
                            onClick={() => handleModeChange(mode.value)}
                            className={`p-4 border-2 rounded-lg transition-all ${
                              isActive
                                ? 'border-primary bg-primary/10'
                                : 'border-border hover:border-primary/50'
                            }`}
                          >
                            <Icon className="w-8 h-8 mx-auto mb-2" />
                            <div className="text-sm font-medium">{mode.label}</div>
                            {isActive && (
                              <Check className="w-4 h-4 mx-auto mt-2 text-primary" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* 颜色方案 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">{t('color_scheme') || '颜色方案'}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-4 gap-4">
                      {colorSchemes.map((scheme) => {
                        const isActive = colorScheme === scheme.id;

                        return (
                          <button
                            key={scheme.id}
                            onClick={() => handleColorSchemeChange(scheme.id)}
                            className={`p-3 border-2 rounded-lg transition-all ${
                              isActive
                                ? 'border-primary bg-primary/10'
                                : 'border-border hover:border-primary/50'
                            }`}
                          >
                            <div
                              className="w-full h-12 rounded mb-2"
                              style={{ background: scheme.primaryColor }}
                            />
                            <div className="text-sm font-medium">{t(`theme_style_${scheme.id}`) || scheme.label}</div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {scheme.description}
                            </div>
                            {isActive && (
                              <Check className="w-4 h-4 mx-auto mt-2 text-primary" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* 字体大小 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Type className="w-4 h-4" />
                      {t('font_size') || '字体大小'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-5 gap-4">
                      {fontSizes.map((size) => (
                        <button
                          key={size.value}
                          onClick={() => handleFontSizeChange(size.value)}
                          className="p-3 border-2 rounded-lg hover:border-primary/50 transition-all"
                        >
                          <div className="text-sm font-medium mb-1">{size.label}</div>
                          <div className="text-xs text-muted-foreground">{size.size}</div>
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* 圆角大小 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Circle className="w-4 h-4" />
                      {t('border_radius') || '圆角大小'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-5 gap-4">
                      {borderRadiuses.map((radius) => (
                        <button
                          key={radius.value}
                          onClick={() => handleBorderRadiusChange(radius.value)}
                          className="p-3 border-2 rounded-lg hover:border-primary/50 transition-all"
                        >
                          <div className="text-sm font-medium">{radius.label}</div>
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* 主题预设 */}
          <TabsContent value="presets" className="flex-1 min-h-0">
            <ScrollArea className="h-full">
              <div className="space-y-6 p-1">
                {/* 保存当前配置为预设 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">{t('save_as_preset') || '保存为预设'}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      <Input
                        placeholder={t('preset_name_placeholder') || '输入预设名称'}
                        value={presetName}
                        onChange={(e) => setPresetName(e.target.value)}
                      />
                      <Button onClick={handleSavePreset}>
                        <Save className="w-4 h-4 mr-2" />
                        {t('save') || '保存'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* 预设列表 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">{t('available_presets') || '可用预设'}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      {presets.map((preset) => {
                        const isActive = selectedPreset === preset.id;

                        return (
                          <div
                            key={preset.id}
                            className={`p-4 border-2 rounded-lg ${
                              isActive
                                ? 'border-primary bg-primary/10'
                                : 'border-border'
                            }`}
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <div className="font-medium">{preset.name}</div>
                                <div className="text-sm text-muted-foreground">
                                  {preset.description}
                                </div>
                              </div>
                              {preset.builtin && (
                                <Badge variant="secondary" className="text-xs">
                                  {t('builtin') || '内置'}
                                </Badge>
                              )}
                            </div>

                            <div className="flex gap-2 mt-3">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleApplyPreset(preset.id)}
                                className="flex-1"
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                {t('apply') || '应用'}
                              </Button>
                              {!preset.builtin && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDeletePreset(preset.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* 高级设置 */}
          <TabsContent value="advanced" className="flex-1 min-h-0">
            <ScrollArea className="h-full">
              <div className="space-y-6 p-1">
                {/* 导入导出 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">{t('import_export') || '导入/导出'}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <Label className="mb-2 block">{t('export_theme_config') || '导出主题配置'}</Label>
                        <Button variant="outline" onClick={handleExport} className="w-full">
                          <Download className="w-4 h-4 mr-2" />
                          {t('export_as_json') || '导出为 JSON 文件'}
                        </Button>
                      </div>

                      <div>
                        <Label className="mb-2 block">{t('import_theme_config') || '导入主题配置'}</Label>
                        <Button variant="outline" onClick={handleImport} className="w-full">
                          <Upload className="w-4 h-4 mr-2" />
                          {t('import_from_json') || '从 JSON 文件导入'}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 重置 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">{t('reset_theme') || '重置主题'}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        {t('reset_theme_desc') || '将所有主题设置重置为默认值'}
                      </p>
                      <Button variant="destructive" onClick={handleReset} className="w-full">
                        <RotateCcw className="w-4 h-4 mr-2" />
                        {t('reset_to_default') || '重置到默认设置'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* 当前配置信息 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">当前配置</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">主题模式:</span>
                        <span className="font-medium">{theme}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">颜色方案:</span>
                        <span className="font-medium">{colorScheme}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">字体大小:</span>
                        <span className="font-medium">
                          {themeManager.getConfig().fontSize}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">圆角大小:</span>
                        <span className="font-medium">
                          {themeManager.getConfig().borderRadius}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {/* 操作按钮 */}
        <div className="flex items-center justify-end pt-4 border-t">
          <Button onClick={onClose}>关闭</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ThemeCustomDialog;

