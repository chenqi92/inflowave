/**
 * InfluxQL 语法验证器 - 重构版本
 * 
 * 这个文件现在使用新的查询引擎抽象层，同时保持向后兼容的接口。
 */

import { InfluxQLValidator as NewInfluxQLValidator } from '../services/query/influxdb/InfluxQLValidator';
import type { ValidationResult as NewValidationResult, ValidationError as NewValidationError } from '../types/database/base';

// 保持向后兼容的接口
export interface ValidationError {
  line: number;
  column: number;
  endLine: number;
  endColumn: number;
  message: string;
  severity: 'error' | 'warning' | 'info';
  code: string;
  quickFix?: {
    title: string;
    newText: string;
  };
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  suggestions: ValidationError[];
}

/**
 * 适配器类：将新的验证器接口适配到旧的接口
 */
class InfluxQLValidator {
  private newValidator: NewInfluxQLValidator;

  constructor() {
    this.newValidator = new NewInfluxQLValidator();
  }

  /**
   * 验证 InfluxQL 查询 - 使用新的验证器
   */
  async validate(query: string): Promise<ValidationResult> {
    if (!query.trim()) {
      return { isValid: true, errors: [], warnings: [], suggestions: [] };
    }

    try {
      // 使用新的验证器
      const newResult = await this.newValidator.validate(query);
      
      // 转换结果格式
      return this.convertValidationResult(newResult);
    } catch (error) {
      return {
        isValid: false,
        errors: [{
          line: 1,
          column: 1,
          endLine: 1,
          endColumn: query.length,
          message: `验证失败: ${error}`,
          severity: 'error',
          code: 'VALIDATION_ERROR',
        }],
        warnings: [],
        suggestions: [],
      };
    }
  }

  /**
   * 同步版本的验证方法（向后兼容）
   */
  validateSync(query: string): ValidationResult {
    // 对于同步调用，我们提供基础的验证
    if (!query.trim()) {
      return { isValid: true, errors: [], warnings: [], suggestions: [] };
    }

    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    const suggestions: ValidationError[] = [];

    // 基础语法检查
    if (!this.hasValidStructure(query)) {
      errors.push({
        line: 1,
        column: 1,
        endLine: 1,
        endColumn: query.length,
        message: 'InfluxQL 查询结构无效',
        severity: 'error',
        code: 'INVALID_STRUCTURE',
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions,
    };
  }

  /**
   * 转换新验证结果到旧格式
   */
  private convertValidationResult(newResult: NewValidationResult): ValidationResult {
    const convertError = (error: NewValidationError): ValidationError => ({
      line: error.line,
      column: error.column,
      endLine: error.line,
      endColumn: error.column + 1,
      message: error.message,
      severity: error.severity as 'error' | 'warning' | 'info',
      code: error.errorType.toUpperCase(),
    });

    return {
      isValid: newResult.valid,
      errors: newResult.errors.filter(e => e.severity === 'error').map(convertError),
      warnings: newResult.warnings.map(convertError),
      suggestions: newResult.suggestions?.map(suggestion => ({
        line: 1,
        column: 1,
        endLine: 1,
        endColumn: 1,
        message: suggestion,
        severity: 'info' as const,
        code: 'SUGGESTION',
      })) || [],
    };
  }

  /**
   * 基础结构检查
   */
  private hasValidStructure(query: string): boolean {
    const upperQuery = query.toUpperCase().trim();
    const validStarts = ['SELECT', 'SHOW', 'CREATE', 'DROP', 'DELETE', 'GRANT', 'REVOKE'];
    return validStarts.some(start => upperQuery.startsWith(start));
  }
}

// 导出实例
export const influxqlValidator = new InfluxQLValidator();
export default influxqlValidator;
