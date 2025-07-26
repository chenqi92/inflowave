/**
 * Flux 查询验证器
 * 
 * 这个文件实现了 Flux 语法的验证逻辑。
 */

import { QueryValidator } from '../base/QueryValidator';
import { QueryLanguage, ValidationResult, ValidationError } from '../../../types/database/base';

/**
 * Flux 验证器实现
 */
export class FluxValidator extends QueryValidator {
  readonly language: QueryLanguage = 'flux';
  readonly displayName = 'Flux Validator';

  async validate(query: string): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // 基础语法检查
    const basicErrors = this.basicSyntaxCheck(query);
    errors.push(...basicErrors);

    if (errors.length > 0) {
      return { valid: false, errors, warnings };
    }

    // Flux 特定验证
    const fluxErrors = this.validateFluxSyntax(query);
    errors.push(...fluxErrors);

    // 管道检查
    const pipelineErrors = this.validatePipeline(query);
    errors.push(...pipelineErrors);

    // 性能建议
    const performanceWarnings = this.checkPerformance(query);
    warnings.push(...performanceWarnings);

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      suggestions: this.generateSuggestions(query, errors, warnings)
    };
  }

  getSupportedKeywords(): string[] {
    return [
      'from', 'range', 'filter', 'group', 'aggregateWindow', 'mean', 'sum', 'count',
      'map', 'reduce', 'sort', 'limit', 'drop', 'keep', 'rename',
      'union', 'join', 'pivot', 'duplicate',
      'yield', 'to', 'toBucket',
      'and', 'or', 'not',
      'if', 'then', 'else',
      'import', 'option', 'builtin'
    ];
  }

  getSupportedFunctions(): string[] {
    return [
      // 数学函数
      'math.abs', 'math.ceil', 'math.floor', 'math.round', 'math.sqrt', 'math.pow',
      // 字符串函数
      'strings.contains', 'strings.hasPrefix', 'strings.hasSuffix', 'strings.toLower', 'strings.toUpper',
      // 时间函数
      'time.now', 'time.truncate', 'date.hour', 'date.minute', 'date.second',
      // 类型转换函数
      'int', 'float', 'string', 'bool', 'time', 'duration',
      // 聚合函数
      'mean', 'sum', 'count', 'min', 'max', 'first', 'last', 'median', 'mode', 'stddev'
    ];
  }

  /**
   * 验证 Flux 特定语法
   */
  private validateFluxSyntax(query: string): ValidationError[] {
    const errors: ValidationError[] = [];
    const lines = query.split('\n');

    // 检查是否以 from() 开始
    const trimmedQuery = query.trim();
    if (!trimmedQuery.startsWith('from(') && !trimmedQuery.startsWith('import ') && !trimmedQuery.startsWith('option ')) {
      errors.push(this.createError(
        'Flux queries typically start with from() function',
        1,
        1,
        'syntax'
      ));
    }

    // 检查管道操作符
    const pipeErrors = this.validatePipeOperators(query, lines);
    errors.push(...pipeErrors);

    // 检查函数调用语法
    const functionErrors = this.validateFunctionCalls(query, lines);
    errors.push(...functionErrors);

    // 检查变量声明
    const variableErrors = this.validateVariables(query, lines);
    errors.push(...variableErrors);

    return errors;
  }

  /**
   * 验证管道操作符
   */
  private validatePipeOperators(query: string, lines: string[]): ValidationError[] {
    const errors: ValidationError[] = [];
    
    // 检查管道操作符的使用
    const pipeRegex = /\|>/g;
    let match;
    let pipeCount = 0;
    
    while ((match = pipeRegex.exec(query)) !== null) {
      pipeCount++;
      const lineNumber = query.substring(0, match.index).split('\n').length;
      const line = lines[lineNumber - 1];
      
      // 检查管道操作符前后是否有有效的表达式
      const beforePipe = line.substring(0, match.index - query.substring(0, match.index).lastIndexOf('\n') - 1).trim();
      const afterPipeIndex = match.index + 2;
      const afterPipe = query.substring(afterPipeIndex).trim();
      
      if (!beforePipe) {
        errors.push(this.createError(
          'Pipe operator |> must have an expression before it',
          lineNumber,
          match.index,
          'syntax'
        ));
      }
      
      if (!afterPipe) {
        errors.push(this.createError(
          'Pipe operator |> must have an expression after it',
          lineNumber,
          match.index + 2,
          'syntax'
        ));
      }
    }

    return errors;
  }

  /**
   * 验证函数调用
   */
  private validateFunctionCalls(query: string, lines: string[]): ValidationError[] {
    const errors: ValidationError[] = [];
    const supportedFunctions = this.getSupportedFunctions();
    const keywords = this.getSupportedKeywords();
    
    // 查找函数调用
    const functionRegex = /(\w+(?:\.\w+)?)\s*\(/g;
    let match;
    
    while ((match = functionRegex.exec(query)) !== null) {
      const functionName = match[1];
      
      // 跳过关键字
      if (keywords.includes(functionName)) {
        continue;
      }
      
      // 检查是否为支持的函数
      if (!supportedFunctions.includes(functionName) && !this.isBuiltinFunction(functionName)) {
        const lineNumber = query.substring(0, match.index).split('\n').length;
        errors.push(this.createError(
          `Unknown function: ${functionName}`,
          lineNumber,
          match.index,
          'reference'
        ));
      }
    }

    return errors;
  }

  /**
   * 验证变量声明
   */
  private validateVariables(query: string, lines: string[]): ValidationError[] {
    const errors: ValidationError[] = [];
    
    // 检查变量声明语法
    const variableRegex = /(\w+)\s*=\s*(.+)/g;
    let match;
    
    while ((match = variableRegex.exec(query)) !== null) {
      const variableName = match[1];
      const variableValue = match[2];
      
      // 检查变量名是否有效
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(variableName)) {
        const lineNumber = query.substring(0, match.index).split('\n').length;
        errors.push(this.createError(
          `Invalid variable name: ${variableName}. Variable names must start with a letter or underscore`,
          lineNumber,
          match.index,
          'syntax'
        ));
      }
    }

    return errors;
  }

  /**
   * 验证管道结构
   */
  private validatePipeline(query: string): ValidationError[] {
    const errors: ValidationError[] = [];
    
    // 检查管道的基本结构
    const lines = query.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // 检查每行是否以适当的函数或操作符结束
      if (line.includes('|>') && !line.endsWith('|>')) {
        const parts = line.split('|>');
        if (parts.length > 1 && parts[parts.length - 1].trim() === '') {
          errors.push(this.createError(
            'Pipe operator |> should not be at the end of a line without a following function',
            i + 1,
            line.length,
            'syntax'
          ));
        }
      }
    }

    return errors;
  }

  /**
   * 性能检查
   */
  private checkPerformance(query: string): ValidationError[] {
    const warnings: ValidationError[] = [];
    
    // 检查是否有时间范围过滤
    if (!query.includes('range(')) {
      warnings.push(this.createWarning(
        'Consider using range() function to limit the time range for better performance',
        1,
        1,
        'semantic'
      ));
    }

    // 检查是否有过滤条件
    if (!query.includes('filter(')) {
      warnings.push(this.createWarning(
        'Consider using filter() function to reduce the amount of data processed',
        1,
        1,
        'semantic'
      ));
    }

    // 检查聚合窗口
    if (query.includes('aggregateWindow(') && !query.includes('every:')) {
      warnings.push(this.createWarning(
        'aggregateWindow() should specify the every parameter for proper time grouping',
        1,
        1,
        'semantic'
      ));
    }

    return warnings;
  }

  /**
   * 生成建议
   */
  private generateSuggestions(query: string, errors: ValidationError[], warnings: ValidationError[]): string[] {
    const suggestions: string[] = [];

    if (errors.length > 0) {
      suggestions.push('Fix syntax errors before executing the query');
    }

    if (!query.includes('range(')) {
      suggestions.push('Add range() function to specify time bounds: range(start: -1h)');
    }

    if (!query.includes('yield(')) {
      suggestions.push('Consider adding yield() at the end to name your result');
    }

    if (query.includes('group(') && !query.includes('aggregateWindow(')) {
      suggestions.push('When using group(), consider adding aggregateWindow() for time-based aggregation');
    }

    return suggestions;
  }

  /**
   * 检查是否为内置函数
   */
  private isBuiltinFunction(functionName: string): boolean {
    const builtinFunctions = [
      'exists', 'length', 'contains', 'display', 'debug', 'experimental'
    ];
    return builtinFunctions.includes(functionName);
  }
}
