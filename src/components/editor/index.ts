/**
 * 编辑器模块导出
 * 
 * 这个模块包含了重构后的TabEditor相关组件：
 * - TabManager: 标签页管理
 * - EditorManager: Monaco编辑器管理
 * - QueryExecutor: 查询执行逻辑
 * - FileOperations: 文件操作功能
 */

// 主要组件
export { TabManager, useTabManager } from './TabManager';
export { EditorManager } from './EditorManager';
export { useQueryExecutor } from './QueryExecutor';
export { useFileOperations } from './FileOperations';

// 类型定义
export type { EditorTab } from './TabManager';

// 重构后的主组件
export { default as TabEditorRefactored } from '../layout/TabEditorRefactored';
export type { TabEditorRef } from '../layout/TabEditorRefactored';
