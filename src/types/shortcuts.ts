/**
 * 快捷键类型定义
 */

/**
 * 快捷键类别
 */
export enum ShortcutCategory {
  FILE = 'file',
  EDIT = 'edit',
  VIEW = 'view',
  DATABASE = 'database',
  QUERY = 'query',
  TOOLS = 'tools',
  WINDOW = 'window',
  NAVIGATION = 'navigation',
  SEARCH = 'search',
  DEVELOPER = 'developer',
  GENERAL = 'general',
}

/**
 * 修饰键
 */
export interface ModifierKeys {
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
}

/**
 * 快捷键定义
 */
export interface ShortcutDefinition {
  /** 唯一标识符 */
  id: string;
  /** 快捷键名称 */
  name: string;
  /** 描述 */
  description: string;
  /** 类别 */
  category: ShortcutCategory;
  /** 按键 */
  key: string;
  /** 修饰键 */
  modifiers: ModifierKeys;
  /** 是否启用 */
  enabled: boolean;
  /** 是否可自定义 */
  customizable: boolean;
  /** 默认快捷键 */
  defaultKey?: string;
  /** 默认修饰键 */
  defaultModifiers?: ModifierKeys;
  /** 回调函数 */
  action?: () => void;
  /** 是否阻止默认行为 */
  preventDefault?: boolean;
  /** 是否阻止事件传播 */
  stopPropagation?: boolean;
}

/**
 * 快捷键配置
 */
export interface ShortcutConfig {
  /** 快捷键ID */
  id: string;
  /** 按键 */
  key: string;
  /** 修饰键 */
  modifiers: ModifierKeys;
  /** 是否启用 */
  enabled: boolean;
}

/**
 * 快捷键冲突
 */
export interface ShortcutConflict {
  /** 快捷键组合 */
  combination: string;
  /** 冲突的快捷键ID列表 */
  conflictingIds: string[];
}

/**
 * 快捷键验证结果
 */
export interface ShortcutValidation {
  /** 是否有效 */
  valid: boolean;
  /** 错误信息 */
  error?: string;
  /** 冲突信息 */
  conflicts?: ShortcutConflict[];
}

/**
 * 快捷键导出数据
 */
export interface ShortcutExportData {
  /** 版本 */
  version: string;
  /** 导出时间 */
  exportedAt: string;
  /** 快捷键配置列表 */
  shortcuts: ShortcutConfig[];
}

/**
 * 快捷键类别信息
 */
export interface ShortcutCategoryInfo {
  /** 类别 */
  category: ShortcutCategory;
  /** 显示名称 */
  label: string;
  /** 描述 */
  description: string;
  /** 图标 */
  icon?: string;
}

/**
 * 快捷键统计
 */
export interface ShortcutStats {
  /** 总数 */
  total: number;
  /** 启用数 */
  enabled: number;
  /** 禁用数 */
  disabled: number;
  /** 自定义数 */
  customized: number;
  /** 冲突数 */
  conflicts: number;
}

/**
 * 快捷键搜索过滤器
 */
export interface ShortcutFilter {
  /** 搜索关键词 */
  search?: string;
  /** 类别过滤 */
  category?: ShortcutCategory;
  /** 是否只显示启用的 */
  enabledOnly?: boolean;
  /** 是否只显示自定义的 */
  customizedOnly?: boolean;
  /** 是否只显示有冲突的 */
  conflictsOnly?: boolean;
}

/**
 * 快捷键组合字符串
 */
export type ShortcutCombination = string;

/**
 * 快捷键映射表
 */
export type ShortcutMap = Map<string, ShortcutDefinition>;

/**
 * 快捷键配置映射表
 */
export type ShortcutConfigMap = Map<string, ShortcutConfig>;

