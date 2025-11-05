/**
 * 语言资源验证脚本
 * 检查语言包的完整性和一致性
 */

import { resourceManager } from './config';

export interface ValidationReport {
  isValid: boolean;
  totalKeys: number;
  missingTranslations: MissingTranslation[];
  extraKeys: ExtraKey[];
  formatErrors: FormatError[];
  suggestions: ValidationSuggestion[];
}

export interface MissingTranslation {
  language: string;
  namespace: string;
  key: string;
  referenceValue?: string;
}

export interface ExtraKey {
  language: string;
  namespace: string;
  key: string;
  value: string;
}

export interface FormatError {
  language: string;
  namespace: string;
  key: string;
  error: string;
  value: string;
}

export interface ValidationSuggestion {
  type: 'missing' | 'format' | 'consistency';
  message: string;
  action: string;
}

/**
 * 验证所有语言资源
 */
export async function validateAllResources(): Promise<ValidationReport> {
  console.log('开始验证语言资源...');
  
  try {
    // 获取完整性检查结果
    const integrityResults = await resourceManager.checkIntegrity();
    
    // 加载所有语言资源进行详细检查
    const zhCNResource = await resourceManager.loadLanguage('zh-CN');
    const enUSResource = await resourceManager.loadLanguage('en-US');
    
    // 提取所有键
    const zhCNKeys = extractAllKeys(zhCNResource);
    const enUSKeys = extractAllKeys(enUSResource);
    
    // 检查缺失的翻译
    const missingTranslations = findMissingTranslations(zhCNKeys, enUSKeys, zhCNResource, enUSResource);
    
    // 检查多余的键
    const extraKeys = findExtraKeys(zhCNKeys, enUSKeys, zhCNResource, enUSResource);
    
    // 检查格式错误
    const formatErrors = checkFormatErrors(zhCNResource, enUSResource);
    
    // 生成建议
    const suggestions = generateSuggestions(missingTranslations, extraKeys, formatErrors);
    
    const report: ValidationReport = {
      isValid: missingTranslations.length === 0 && formatErrors.length === 0,
      totalKeys: Math.max(zhCNKeys.size, enUSKeys.size),
      missingTranslations,
      extraKeys,
      formatErrors,
      suggestions,
    };
    
    // 输出报告
    printValidationReport(report);
    
    return report;
  } catch (error) {
    console.error('验证过程中发生错误:', error);
    throw error;
  }
}

/**
 * 提取资源中的所有键
 */
function extractAllKeys(resource: any, prefix = ''): Set<string> {
  const keys = new Set<string>();
  
  for (const [key, value] of Object.entries(resource)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    
    if (typeof value === 'string') {
      keys.add(fullKey);
    } else if (typeof value === 'object' && value !== null) {
      const nestedKeys = extractAllKeys(value, fullKey);
      for (const nestedKey of nestedKeys) {
        keys.add(nestedKey);
      }
    }
  }
  
  return keys;
}

/**
 * 查找缺失的翻译
 */
function findMissingTranslations(
  zhCNKeys: Set<string>,
  enUSKeys: Set<string>,
  zhCNResource: any,
  enUSResource: any
): MissingTranslation[] {
  const missing: MissingTranslation[] = [];
  
  // 检查英文中缺失的键（以中文为基准）
  for (const key of zhCNKeys) {
    if (!enUSKeys.has(key)) {
      const [namespace, ...keyParts] = key.split('.');
      const keyName = keyParts.join('.');
      const referenceValue = getValueByPath(zhCNResource, key);
      
      missing.push({
        language: 'en-US',
        namespace,
        key: keyName,
        referenceValue: typeof referenceValue === 'string' ? referenceValue : undefined,
      });
    }
  }
  
  // 检查中文中缺失的键（以英文为基准）
  for (const key of enUSKeys) {
    if (!zhCNKeys.has(key)) {
      const [namespace, ...keyParts] = key.split('.');
      const keyName = keyParts.join('.');
      const referenceValue = getValueByPath(enUSResource, key);
      
      missing.push({
        language: 'zh-CN',
        namespace,
        key: keyName,
        referenceValue: typeof referenceValue === 'string' ? referenceValue : undefined,
      });
    }
  }
  
  return missing;
}

/**
 * 查找多余的键
 */
function findExtraKeys(
  zhCNKeys: Set<string>,
  enUSKeys: Set<string>,
  zhCNResource: any,
  enUSResource: any
): ExtraKey[] {
  const extra: ExtraKey[] = [];
  
  // 这里可以根据需要实现查找多余键的逻辑
  // 目前我们认为两种语言应该保持一致，所以多余的键就是缺失翻译的反面
  
  return extra;
}

/**
 * 检查格式错误
 */
function checkFormatErrors(zhCNResource: any, enUSResource: any): FormatError[] {
  const errors: FormatError[] = [];
  
  // 检查中文资源
  const zhCNErrors = validateResourceFormat(zhCNResource, 'zh-CN');
  errors.push(...zhCNErrors);
  
  // 检查英文资源
  const enUSErrors = validateResourceFormat(enUSResource, 'en-US');
  errors.push(...enUSErrors);
  
  return errors;
}

/**
 * 验证资源格式
 */
function validateResourceFormat(resource: any, language: string, path = ''): FormatError[] {
  const errors: FormatError[] = [];
  
  for (const [key, value] of Object.entries(resource)) {
    const currentPath = path ? `${path}.${key}` : key;
    const [namespace, ...keyParts] = currentPath.split('.');
    const keyName = keyParts.join('.');
    
    if (typeof value === 'string') {
      // 检查空字符串
      if (value.trim() === '') {
        errors.push({
          language,
          namespace,
          key: keyName,
          error: 'Empty translation',
          value,
        });
      }
      
      // 检查插值语法
      const interpolationMatches = value.match(/\{\{[^}]+\}\}/g);
      if (interpolationMatches) {
        for (const match of interpolationMatches) {
          if (!match.match(/^\{\{[a-zA-Z_][a-zA-Z0-9_]*\}\}$/)) {
            errors.push({
              language,
              namespace,
              key: keyName,
              error: `Invalid interpolation syntax: ${match}`,
              value,
            });
          }
        }
      }
      
      // 检查 HTML 标签（如果不应该包含）
      if (value.includes('<') && value.includes('>')) {
        const htmlMatches = value.match(/<[^>]+>/g);
        if (htmlMatches) {
          // 只允许安全的 HTML 标签
          const allowedTags = ['br', 'strong', 'em', 'i', 'b', 'span'];
          for (const tag of htmlMatches) {
            const tagName = tag.match(/<\/?([a-zA-Z]+)/)?.[1];
            if (tagName && !allowedTags.includes(tagName.toLowerCase())) {
              errors.push({
                language,
                namespace,
                key: keyName,
                error: `Potentially unsafe HTML tag: ${tag}`,
                value,
              });
            }
          }
        }
      }
    } else if (typeof value === 'object' && value !== null) {
      errors.push(...validateResourceFormat(value, language, currentPath));
    } else {
      errors.push({
        language,
        namespace,
        key: keyName,
        error: `Invalid value type: ${typeof value}`,
        value: String(value),
      });
    }
  }
  
  return errors;
}

/**
 * 根据路径获取值
 */
function getValueByPath(obj: any, path: string): any {
  const keys = path.split('.');
  let current = obj;
  
  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = current[key];
    } else {
      return undefined;
    }
  }
  
  return current;
}

/**
 * 生成验证建议
 */
function generateSuggestions(
  missingTranslations: MissingTranslation[],
  extraKeys: ExtraKey[],
  formatErrors: FormatError[]
): ValidationSuggestion[] {
  const suggestions: ValidationSuggestion[] = [];
  
  if (missingTranslations.length > 0) {
    suggestions.push({
      type: 'missing',
      message: `Found ${missingTranslations.length} missing translations`,
      action: 'Add missing translations to maintain consistency between languages',
    });
  }
  
  if (formatErrors.length > 0) {
    suggestions.push({
      type: 'format',
      message: `Found ${formatErrors.length} format errors`,
      action: 'Fix format errors to ensure proper translation functionality',
    });
  }
  
  if (extraKeys.length > 0) {
    suggestions.push({
      type: 'consistency',
      message: `Found ${extraKeys.length} extra keys`,
      action: 'Remove unused keys or add corresponding translations',
    });
  }
  
  return suggestions;
}

/**
 * 打印验证报告
 */
function printValidationReport(report: ValidationReport): void {
  console.log('\n=== 语言资源验证报告 ===');
  console.log(`状态: ${report.isValid ? '✅ 通过' : '❌ 失败'}`);
  console.log(`总键数: ${report.totalKeys}`);
  
  if (report.missingTranslations.length > 0) {
    console.log(`\n❌ 缺失翻译 (${report.missingTranslations.length}):`);
    const byLanguage = report.missingTranslations.reduce((groups, missing) => {
      if (!groups[missing.language]) {
        groups[missing.language] = [];
      }
      groups[missing.language].push(missing);
      return groups;
    }, {} as Record<string, MissingTranslation[]>);
    
    for (const [language, missing] of Object.entries(byLanguage)) {
      console.log(`  ${language}:`);
      missing.forEach(m => {
        console.log(`    ${m.namespace}.${m.key}${m.referenceValue ? ` (参考: "${m.referenceValue}")` : ''}`);
      });
    }
  }
  
  if (report.formatErrors.length > 0) {
    console.log(`\n❌ 格式错误 (${report.formatErrors.length}):`);
    report.formatErrors.forEach(error => {
      console.log(`  ${error.language}/${error.namespace}.${error.key}: ${error.error}`);
      console.log(`    值: "${error.value}"`);
    });
  }
  
  if (report.extraKeys.length > 0) {
    console.log(`\n⚠️ 多余键 (${report.extraKeys.length}):`);
    report.extraKeys.forEach(extra => {
      console.log(`  ${extra.language}/${extra.namespace}.${extra.key}: "${extra.value}"`);
    });
  }
  
  if (report.suggestions.length > 0) {
    console.log(`\n💡 建议:`);
    report.suggestions.forEach((suggestion, index) => {
      console.log(`  ${index + 1}. ${suggestion.message}`);
      console.log(`     ${suggestion.action}`);
    });
  }
  
  if (report.isValid) {
    console.log('\n🎉 所有语言资源验证通过！');
  } else {
    console.log('\n⚠️ 请修复上述问题以确保国际化功能正常工作。');
  }
}

/**
 * 自动修复常见问题
 */
export async function autoFixCommonIssues(): Promise<void> {
  console.log('开始自动修复常见问题...');
  
  const report = await validateAllResources();
  
  // 这里可以实现自动修复逻辑
  // 例如：自动添加缺失的翻译占位符
  
  console.log('自动修复完成。');
}

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  validateAllResources().catch(console.error);
}