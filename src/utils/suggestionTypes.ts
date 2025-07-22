/**
 * 智能提示相关的类型定义
 */

// 提示项类型
export type SuggestionType = 'keyword' | 'function' | 'table' | 'field' | 'tag' | 'database';

// 数据源类型
export type DataSourceType = '1.x' | '2.x' | '3.x' | 'unknown';

// 提示项接口
export interface SuggestionItem {
  label: string;         // 显示文本
  value: string;         // 插入值
  type: SuggestionType;  // 类型
  detail?: string;       // 详细信息
  documentation?: string; // 文档说明
  sortText?: string;     // 排序文本
  insertText?: string;   // 插入文本（可能包含占位符）
  insertTextRules?: number; // 插入规则
  priority?: number;     // 优先级（数字越小优先级越高）
}

// 提示上下文
export interface SuggestionContext {
  text: string;          // 完整文本内容
  position: number;      // 光标位置
  lineText: string;      // 当前行文本
  wordBeforeCursor: string; // 光标前的单词
  lineNumber: number;    // 行号
  column: number;        // 列号
  wordStartColumn: number; // 单词开始列号
  wordEndColumn: number; // 单词结束列号
}

// 提示弹框位置
export interface SuggestionPosition {
  top: number;
  left: number;
  maxHeight?: number;
  maxWidth?: number;
}

// 提示配置
export interface SuggestionConfig {
  maxItems: number;      // 最大显示项数
  minChars: number;      // 最小触发字符数
  debounceMs: number;    // 防抖延迟
  caseSensitive: boolean; // 是否区分大小写
  fuzzyMatch: boolean;   // 是否启用模糊匹配
}

// 默认配置
export const DEFAULT_SUGGESTION_CONFIG: SuggestionConfig = {
  maxItems: 20,
  minChars: 1,
  debounceMs: 150,
  caseSensitive: false,
  fuzzyMatch: true,
};

// 提示项优先级常量
export const SUGGESTION_PRIORITY = {
  KEYWORD: 1,
  FUNCTION: 2,
  TABLE: 3,
  FIELD: 4,
  TAG: 5,
  DATABASE: 6,
} as const;

// 插入文本规则常量
export const INSERT_TEXT_RULES = {
  NONE: 0,
  KEEP_WHITESPACE: 1,
  INSERT_AS_SNIPPET: 4,
} as const;
