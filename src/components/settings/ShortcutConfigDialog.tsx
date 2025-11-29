/**
 * 快捷键配置对话框
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Button,
  Input,
  Label,
  Badge,
  Alert,
  AlertDescription,
  ScrollArea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
} from '@/components/ui';
import { SearchInput } from '@/components/ui/search-input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Keyboard,
  Download,
  Upload,
  RotateCcw,
  AlertTriangle,
  Edit2,
  Save,
  X,
  Info,
} from 'lucide-react';
import { shortcutManager, ShortcutManager } from '@/utils/shortcutManager';
import { defaultShortcuts, shortcutCategoryInfo } from '@/config/defaultShortcuts';
import { ShortcutCategory } from '@/types/shortcuts';
import type { ShortcutDefinition, ModifierKeys } from '@/types/shortcuts';
import { showMessage } from '@/utils/message';
import { saveAs } from 'file-saver';

/**
 * 组件属性
 */
export interface ShortcutConfigDialogProps {
  /** 是否打开 */
  open: boolean;
  /** 关闭回调 */
  onClose: () => void;
}

/**
 * 快捷键配置对话框组件
 */
export const ShortcutConfigDialog: React.FC<ShortcutConfigDialogProps> = ({
  open,
  onClose,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ShortcutCategory | 'all'>('all');
  const [showConflictsOnly, setShowConflictsOnly] = useState(false);
  const [showCustomizedOnly, setShowCustomizedOnly] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingKey, setEditingKey] = useState('');
  const [editingModifiers, setEditingModifiers] = useState<ModifierKeys>({});
  const [isRecording, setIsRecording] = useState(false);

  // 初始化快捷键管理器
  useEffect(() => {
    if (open) {
      shortcutManager.registerMany(defaultShortcuts);
      shortcutManager.loadFromStorage();
    }
  }, [open]);

  // 获取统计信息
  const stats = useMemo(() => shortcutManager.getStats(), [open]);

  // 获取冲突列表
  const conflicts = useMemo(() => shortcutManager.detectConflicts(), [open]);

  // 过滤快捷键
  const filteredShortcuts = useMemo(() => {
    return shortcutManager.filter({
      search: searchQuery,
      category: selectedCategory === 'all' ? undefined : selectedCategory,
      conflictsOnly: showConflictsOnly,
      customizedOnly: showCustomizedOnly,
    });
  }, [searchQuery, selectedCategory, showConflictsOnly, showCustomizedOnly]);

  // 按类别分组
  const groupedShortcuts = useMemo(() => {
    const groups = new Map<ShortcutCategory, ShortcutDefinition[]>();

    filteredShortcuts.forEach((shortcut) => {
      if (!groups.has(shortcut.category)) {
        groups.set(shortcut.category, []);
      }
      groups.get(shortcut.category)!.push(shortcut);
    });

    return groups;
  }, [filteredShortcuts]);

  // 开始编辑
  const handleStartEdit = (shortcut: ShortcutDefinition) => {
    if (!shortcut.customizable) {
      showMessage.warning('此快捷键不可自定义');
      return;
    }

    const config = shortcutManager.getConfig(shortcut.id);
    if (config) {
      setEditingId(shortcut.id);
      setEditingKey(config.key);
      setEditingModifiers(config.modifiers);
    }
  };

  // 取消编辑
  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingKey('');
    setEditingModifiers({});
    setIsRecording(false);
  };

  // 保存编辑
  const handleSaveEdit = () => {
    if (!editingId) return;

    const validation = shortcutManager.validate(
      editingId,
      editingKey,
      editingModifiers
    );

    if (!validation.valid) {
      showMessage.error(validation.error || '快捷键无效');
      return;
    }

    shortcutManager.updateConfig(editingId, {
      key: editingKey,
      modifiers: editingModifiers,
    });

    showMessage.success('快捷键已更新');
    handleCancelEdit();
  };

  // 开始录制快捷键
  const handleStartRecording = () => {
    setIsRecording(true);
    setEditingKey('');
    setEditingModifiers({});
  };

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isRecording) return;

    e.preventDefault();
    e.stopPropagation();

    // 忽略单独的修饰键
    if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) {
      return;
    }

    setEditingKey(e.key);
    setEditingModifiers({
      ctrl: e.ctrlKey,
      shift: e.shiftKey,
      alt: e.altKey,
      meta: e.metaKey,
    });

    setIsRecording(false);
  };

  // 重置快捷键
  const handleReset = (id: string) => {
    shortcutManager.reset(id);
    showMessage.success('快捷键已重置');
  };

  // 重置所有快捷键
  const handleResetAll = () => {
    if (confirm('确定要重置所有快捷键到默认值吗？')) {
      shortcutManager.resetAll();
      showMessage.success('所有快捷键已重置');
    }
  };

  // 启用/禁用快捷键
  const handleToggleEnabled = (id: string, enabled: boolean) => {
    shortcutManager.setEnabled(id, enabled);
  };

  // 导出配置
  const handleExport = () => {
    const data = shortcutManager.export();
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    saveAs(blob, `inflowave-shortcuts-${Date.now()}.json`);
    showMessage.success('快捷键配置已导出');
  };

  // 导入配置
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
          if (shortcutManager.import(data)) {
            showMessage.success('快捷键配置已导入');
          } else {
            showMessage.error('导入失败');
          }
        } catch (error) {
          showMessage.error('文件格式错误');
        }
      };
      reader.readAsText(file);
    };

    input.click();
  };

  // 渲染快捷键组合
  const renderShortcutCombination = (key: string, modifiers: ModifierKeys) => {
    const parts: string[] = [];

    if (modifiers.ctrl) parts.push('Ctrl');
    if (modifiers.shift) parts.push('Shift');
    if (modifiers.alt) parts.push('Alt');
    if (modifiers.meta) parts.push('Meta');
    parts.push(key);

    return (
      <div className="flex items-center gap-1">
        {parts.map((part, index) => (
          <React.Fragment key={index}>
            {index > 0 && <span className="text-muted-foreground">+</span>}
            <Badge variant="secondary" className="font-mono text-xs">
              {part}
            </Badge>
          </React.Fragment>
        ))}
      </div>
    );
  };

  // 检查是否有冲突
  const hasConflict = (id: string): boolean => {
    return conflicts.some((c) => c.conflictingIds.includes(id));
  };

  // 检查是否已自定义
  const isCustomized = (shortcut: ShortcutDefinition): boolean => {
    const config = shortcutManager.getConfig(shortcut.id);
    if (!config) return false;

    const defaultKey = shortcut.defaultKey || shortcut.key;
    const defaultModifiers = shortcut.defaultModifiers || shortcut.modifiers;

    return (
      config.key !== defaultKey ||
      JSON.stringify(config.modifiers) !== JSON.stringify(defaultModifiers)
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="w-5 h-5" />
            快捷键配置
          </DialogTitle>
          <DialogDescription>
            自定义应用快捷键，提升工作效率
          </DialogDescription>
        </DialogHeader>

        {/* 统计信息 */}
        <div className="grid grid-cols-5 gap-4">
          <div className="p-3 border rounded-lg">
            <div className="text-xl font-semibold">{stats.total}</div>
            <div className="text-xs text-muted-foreground">总快捷键</div>
          </div>
          <div className="p-3 border rounded-lg">
            <div className="text-xl font-semibold text-green-600">{stats.enabled}</div>
            <div className="text-xs text-muted-foreground">已启用</div>
          </div>
          <div className="p-3 border rounded-lg">
            <div className="text-xl font-semibold text-gray-600">{stats.disabled}</div>
            <div className="text-xs text-muted-foreground">已禁用</div>
          </div>
          <div className="p-3 border rounded-lg">
            <div className="text-xl font-semibold text-blue-600">{stats.customized}</div>
            <div className="text-xs text-muted-foreground">已自定义</div>
          </div>
          <div className="p-3 border rounded-lg">
            <div className="text-xl font-semibold text-red-600">{stats.conflicts}</div>
            <div className="text-xs text-muted-foreground">冲突</div>
          </div>
        </div>

        {/* 冲突警告 */}
        {conflicts.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription>
              检测到 {conflicts.length} 个快捷键冲突，请修改冲突的快捷键
            </AlertDescription>
          </Alert>
        )}

        {/* 过滤器 */}
        <div className="flex items-center gap-4">
          <SearchInput
            className="flex-1"
            placeholder="搜索快捷键..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onClear={() => setSearchQuery('')}
          />

          <Select
            value={selectedCategory}
            onValueChange={(value: any) => setSelectedCategory(value)}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="选择类别" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部类别</SelectItem>
              {Object.entries(shortcutCategoryInfo).map(([key, info]) => (
                <SelectItem key={key} value={key}>
                  {info.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2">
            <Switch
              checked={showConflictsOnly}
              onCheckedChange={setShowConflictsOnly}
            />
            <Label>仅冲突</Label>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              checked={showCustomizedOnly}
              onCheckedChange={setShowCustomizedOnly}
            />
            <Label>仅自定义</Label>
          </div>
        </div>

        {/* 快捷键列表 */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="space-y-6">
            {Array.from(groupedShortcuts.entries()).map(([category, shortcuts]) => (
              <div key={category}>
                <h3 className="text-lg font-medium mb-3">
                  {shortcutCategoryInfo[category]?.label || category}
                </h3>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">启用</TableHead>
                      <TableHead className="w-1/4">名称</TableHead>
                      <TableHead className="w-1/3">描述</TableHead>
                      <TableHead className="w-1/4">快捷键</TableHead>
                      <TableHead className="w-32">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {shortcuts.map((shortcut) => {
                      const config = shortcutManager.getConfig(shortcut.id);
                      const isEditing = editingId === shortcut.id;
                      const conflict = hasConflict(shortcut.id);
                      const customized = isCustomized(shortcut);

                      return (
                        <TableRow key={shortcut.id}>
                          {/* 启用开关 */}
                          <TableCell>
                            <Switch
                              checked={config?.enabled ?? shortcut.enabled}
                              onCheckedChange={(enabled) =>
                                handleToggleEnabled(shortcut.id, enabled)
                              }
                            />
                          </TableCell>

                          {/* 名称 */}
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span>{shortcut.name}</span>
                              {customized && (
                                <Badge variant="outline" className="text-xs">
                                  自定义
                                </Badge>
                              )}
                              {conflict && (
                                <AlertTriangle className="w-4 h-4 text-red-500" />
                              )}
                            </div>
                          </TableCell>

                          {/* 描述 */}
                          <TableCell className="text-sm text-muted-foreground">
                            {shortcut.description}
                          </TableCell>

                          {/* 快捷键 */}
                          <TableCell>
                            {isEditing ? (
                              <div className="flex items-center gap-2">
                                <Input
                                  value={
                                    isRecording
                                      ? '按下快捷键...'
                                      : ShortcutManager.getCombination(
                                          editingKey,
                                          editingModifiers
                                        )
                                  }
                                  onKeyDown={handleKeyDown}
                                  onFocus={handleStartRecording}
                                  placeholder="按下快捷键"
                                  className="font-mono text-sm"
                                  readOnly
                                />
                              </div>
                            ) : (
                              renderShortcutCombination(
                                config?.key || shortcut.key,
                                config?.modifiers || shortcut.modifiers
                              )
                            )}
                          </TableCell>

                          {/* 操作 */}
                          <TableCell>
                            {isEditing ? (
                              <div className="flex items-center gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={handleSaveEdit}
                                >
                                  <Save className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={handleCancelEdit}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleStartEdit(shortcut)}
                                  disabled={!shortcut.customizable}
                                >
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                                {customized && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleReset(shortcut.id)}
                                  >
                                    <RotateCcw className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ))}

            {filteredShortcuts.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Info className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>没有找到匹配的快捷键</p>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* 操作按钮 */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" />
              导出配置
            </Button>
            <Button variant="outline" onClick={handleImport}>
              <Upload className="w-4 h-4 mr-2" />
              导入配置
            </Button>
            <Button variant="outline" onClick={handleResetAll}>
              <RotateCcw className="w-4 h-4 mr-2" />
              重置全部
            </Button>
          </div>

          <Button onClick={onClose}>关闭</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShortcutConfigDialog;

