/**
 * 快捷键管理工具
 */

import i18n from 'i18next';
import logger from '@/utils/logger';
import type {
  ShortcutDefinition,
  ShortcutConfig,
  ShortcutConflict,
  ShortcutValidation,
  ShortcutExportData,
  ShortcutStats,
  ShortcutFilter,
  ModifierKeys,
  ShortcutCategory,
} from '@/types/shortcuts';

/**
 * 快捷键管理器
 */
export class ShortcutManager {
  private shortcuts: Map<string, ShortcutDefinition> = new Map();
  private configs: Map<string, ShortcutConfig> = new Map();
  private storageKey = 'inflowave_shortcuts';

  /**
   * 注册快捷键
   */
  register(shortcut: ShortcutDefinition): void {
    this.shortcuts.set(shortcut.id, shortcut);

    // 如果没有配置，使用默认配置
    if (!this.configs.has(shortcut.id)) {
      this.configs.set(shortcut.id, {
        id: shortcut.id,
        key: shortcut.key,
        modifiers: shortcut.modifiers,
        enabled: shortcut.enabled,
      });
    }
  }

  /**
   * 批量注册快捷键
   */
  registerMany(shortcuts: ShortcutDefinition[]): void {
    shortcuts.forEach((shortcut) => this.register(shortcut));
  }

  /**
   * 获取快捷键定义
   */
  get(id: string): ShortcutDefinition | undefined {
    return this.shortcuts.get(id);
  }

  /**
   * 获取快捷键配置
   */
  getConfig(id: string): ShortcutConfig | undefined {
    return this.configs.get(id);
  }

  /**
   * 获取所有快捷键
   */
  getAll(): ShortcutDefinition[] {
    return Array.from(this.shortcuts.values());
  }

  /**
   * 获取所有配置
   */
  getAllConfigs(): ShortcutConfig[] {
    return Array.from(this.configs.values());
  }

  /**
   * 按类别获取快捷键
   */
  getByCategory(category: ShortcutCategory): ShortcutDefinition[] {
    return this.getAll().filter((s) => s.category === category);
  }

  /**
   * 更新快捷键配置
   */
  updateConfig(id: string, config: Partial<ShortcutConfig>): boolean {
    const existing = this.configs.get(id);
    if (!existing) return false;

    this.configs.set(id, { ...existing, ...config });
    this.saveToStorage();
    return true;
  }

  /**
   * 重置快捷键到默认值
   */
  reset(id: string): boolean {
    const shortcut = this.shortcuts.get(id);
    if (!shortcut) return false;

    this.configs.set(id, {
      id: shortcut.id,
      key: shortcut.defaultKey || shortcut.key,
      modifiers: shortcut.defaultModifiers || shortcut.modifiers,
      enabled: shortcut.enabled,
    });

    this.saveToStorage();
    return true;
  }

  /**
   * 重置所有快捷键
   */
  resetAll(): void {
    this.shortcuts.forEach((shortcut) => {
      this.reset(shortcut.id);
    });
  }

  /**
   * 启用/禁用快捷键
   */
  setEnabled(id: string, enabled: boolean): boolean {
    return this.updateConfig(id, { enabled });
  }

  /**
   * 生成快捷键组合字符串
   */
  static getCombination(key: string, modifiers: ModifierKeys): string {
    const parts: string[] = [];

    if (modifiers.ctrl) parts.push('Ctrl');
    if (modifiers.shift) parts.push('Shift');
    if (modifiers.alt) parts.push('Alt');
    if (modifiers.meta) parts.push('Meta');

    parts.push(key);

    return parts.join('+');
  }

  /**
   * 解析快捷键组合字符串
   */
  static parseCombination(combination: string): {
    key: string;
    modifiers: ModifierKeys;
  } {
    const parts = combination.split('+').map((p) => p.trim());
    const key = parts[parts.length - 1];

    const modifiers: ModifierKeys = {
      ctrl: parts.includes('Ctrl'),
      shift: parts.includes('Shift'),
      alt: parts.includes('Alt'),
      meta: parts.includes('Meta'),
    };

    return { key, modifiers };
  }

  /**
   * 检测快捷键冲突
   */
  detectConflicts(): ShortcutConflict[] {
    const conflicts: ShortcutConflict[] = [];
    const combinationMap = new Map<string, string[]>();

    // 构建组合键映射
    this.configs.forEach((config) => {
      if (!config.enabled) return;

      const combination = ShortcutManager.getCombination(
        config.key,
        config.modifiers
      );

      if (!combinationMap.has(combination)) {
        combinationMap.set(combination, []);
      }

      combinationMap.get(combination)!.push(config.id);
    });

    // 找出冲突
    combinationMap.forEach((ids, combination) => {
      if (ids.length > 1) {
        conflicts.push({ combination, conflictingIds: ids });
      }
    });

    return conflicts;
  }

  /**
   * 验证快捷键配置
   */
  validate(id: string, key: string, modifiers: ModifierKeys): ShortcutValidation {
    // 检查按键是否有效
    if (!key || key.trim() === '') {
      return {
        valid: false,
        error: '按键不能为空',
      };
    }

    // 检查是否与其他快捷键冲突
    const combination = ShortcutManager.getCombination(key, modifiers);
    const conflicts: ShortcutConflict[] = [];

    this.configs.forEach((config) => {
      if (config.id === id || !config.enabled) return;

      const existingCombination = ShortcutManager.getCombination(
        config.key,
        config.modifiers
      );

      if (existingCombination === combination) {
        conflicts.push({
          combination,
          conflictingIds: [id, config.id],
        });
      }
    });

    if (conflicts.length > 0) {
      return {
        valid: false,
        error: '快捷键冲突',
        conflicts,
      };
    }

    return { valid: true };
  }

  /**
   * 获取统计信息
   */
  getStats(): ShortcutStats {
    const all = this.getAllConfigs();
    const enabled = all.filter((c) => c.enabled);
    const disabled = all.filter((c) => !c.enabled);

    const customized = all.filter((c) => {
      const shortcut = this.shortcuts.get(c.id);
      if (!shortcut) return false;

      const defaultKey = shortcut.defaultKey || shortcut.key;
      const defaultModifiers = shortcut.defaultModifiers || shortcut.modifiers;

      return (
        c.key !== defaultKey ||
        JSON.stringify(c.modifiers) !== JSON.stringify(defaultModifiers)
      );
    });

    const conflicts = this.detectConflicts();

    return {
      total: all.length,
      enabled: enabled.length,
      disabled: disabled.length,
      customized: customized.length,
      conflicts: conflicts.length,
    };
  }

  /**
   * 过滤快捷键
   */
  filter(filter: ShortcutFilter): ShortcutDefinition[] {
    let results = this.getAll();

    // 搜索过滤
    if (filter.search) {
      const search = filter.search.toLowerCase();
      results = results.filter(
        (s) =>
          s.name.toLowerCase().includes(search) ||
          s.description.toLowerCase().includes(search) ||
          ShortcutManager.getCombination(s.key, s.modifiers)
            .toLowerCase()
            .includes(search)
      );
    }

    // 类别过滤
    if (filter.category) {
      results = results.filter((s) => s.category === filter.category);
    }

    // 启用状态过滤
    if (filter.enabledOnly) {
      results = results.filter((s) => {
        const config = this.configs.get(s.id);
        return config?.enabled ?? s.enabled;
      });
    }

    // 自定义过滤
    if (filter.customizedOnly) {
      results = results.filter((s) => {
        const config = this.configs.get(s.id);
        if (!config) return false;

        const defaultKey = s.defaultKey || s.key;
        const defaultModifiers = s.defaultModifiers || s.modifiers;

        return (
          config.key !== defaultKey ||
          JSON.stringify(config.modifiers) !== JSON.stringify(defaultModifiers)
        );
      });
    }

    // 冲突过滤
    if (filter.conflictsOnly) {
      const conflicts = this.detectConflicts();
      const conflictIds = new Set(
        conflicts.flatMap((c) => c.conflictingIds)
      );
      results = results.filter((s) => conflictIds.has(s.id));
    }

    return results;
  }

  /**
   * 导出配置
   */
  export(): ShortcutExportData {
    return {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      shortcuts: this.getAllConfigs(),
    };
  }

  /**
   * 导入配置
   */
  import(data: ShortcutExportData): boolean {
    try {
      data.shortcuts.forEach((config) => {
        if (this.shortcuts.has(config.id)) {
          this.configs.set(config.id, config);
        }
      });

      this.saveToStorage();
      return true;
    } catch (error) {
      logger.error((i18n.t as any)('logs:shortcut.import_failed'), error);
      return false;
    }
  }

  /**
   * 保存到本地存储
   */
  saveToStorage(): void {
    try {
      const data = this.export();
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (error) {
      logger.error((i18n.t as any)('logs:shortcut.save_failed'), error);
    }
  }

  /**
   * 从本地存储加载
   */
  loadFromStorage(): void {
    try {
      const data = localStorage.getItem(this.storageKey);
      if (data) {
        const parsed = JSON.parse(data) as ShortcutExportData;
        this.import(parsed);
      }
    } catch (error) {
      logger.error((i18n.t as any)('logs:shortcut.load_failed'), error);
    }
  }
}

// 全局快捷键管理器实例
export const shortcutManager = new ShortcutManager();

