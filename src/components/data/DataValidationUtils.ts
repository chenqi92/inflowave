// 数据验证和清理工具类

export interface ValidationRule {
  type: 'required' | 'dataType' | 'range' | 'pattern' | 'custom';
  message: string;
  params?: any;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

export interface DataQualityReport {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  nullValues: number;
  duplicateRows: number;
  outliers: number;
  qualityScore: number;
  issues: QualityIssue[];
}

export interface QualityIssue {
  type: 'missing' | 'duplicate' | 'invalid' | 'outlier' | 'inconsistent';
  severity: 'low' | 'medium' | 'high';
  description: string;
  count: number;
  rows: number[];
  suggestion?: string;
}

export interface CleaningRule {
  type: 'fillMissing' | 'removeDuplicates' | 'removeOutliers' | 'standardize' | 'transform';
  field: string;
  params: any;
}

export class DataValidator {
  private rules: Map<string, ValidationRule[]> = new Map();
  
  /**
   * 添加验证规则
   */
  addRule(field: string, rule: ValidationRule): void {
    if (!this.rules.has(field)) {
      this.rules.set(field, []);
    }
    this.rules.get(field)!.push(rule);
  }

  /**
   * 验证单个值
   */
  validateValue(value: any, rules: ValidationRule[]): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    for (const rule of rules) {
      const result = this.applyRule(value, rule);
      if (!result.valid) {
        errors.push(result.message);
        if (result.suggestion) {
          suggestions.push(result.suggestion);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      suggestions};
  }

  /**
   * 应用验证规则
   */
  private applyRule(value: any, rule: ValidationRule): { valid: boolean; message: string; suggestion?: string } {
    switch (rule.type) {
      case 'required':
        return {
          valid: value !== null && value !== undefined && value !== '',
          message: rule.message || '字段不能为空'};

      case 'dataType':
        return this.validateDataType(value, rule);

      case 'range':
        return this.validateRange(value, rule);

      case 'pattern':
        return this.validatePattern(value, rule);

      case 'custom':
        return this.validateCustom(value, rule);

      default:
        return { valid: true, message: '' };
    }
  }

  /**
   * 验证数据类型
   */
  private validateDataType(value: any, rule: ValidationRule): { valid: boolean; message: string; suggestion?: string } {
    const { dataType } = rule.params || {};
    
    switch (dataType) {
      case 'number':
        const isNumber = !isNaN(Number(value)) && isFinite(Number(value));
        return {
          valid: isNumber,
          message: rule.message || '必须是数字',
          suggestion: isNumber ? undefined : '请输入有效的数字'};

      case 'integer':
        const isInteger = Number.isInteger(Number(value));
        return {
          valid: isInteger,
          message: rule.message || '必须是整数',
          suggestion: isInteger ? undefined : '请输入整数'};

      case 'boolean':
        const booleanValues = ['true', 'false', '1', '0', 'yes', 'no', 'on', 'off'];
        const isBoolean = booleanValues.includes(String(value).toLowerCase());
        return {
          valid: isBoolean,
          message: rule.message || '必须是布尔值',
          suggestion: isBoolean ? undefined : '请输入 true/false 或 1/0'};

      case 'timestamp':
        const isTimestamp = this.isValidTimestamp(value);
        return {
          valid: isTimestamp,
          message: rule.message || '必须是有效的时间戳',
          suggestion: isTimestamp ? undefined : '请使用 ISO 8601 格式或 Unix 时间戳'};

      default:
        return { valid: true, message: '' };
    }
  }

  /**
   * 验证范围
   */
  private validateRange(value: any, rule: ValidationRule): { valid: boolean; message: string; suggestion?: string } {
    const { min, max } = rule.params || {};
    const numValue = Number(value);
    
    if (isNaN(numValue)) {
      return {
        valid: false,
        message: '无法验证范围，值不是数字'};
    }

    if (min !== undefined && numValue < min) {
      return {
        valid: false,
        message: rule.message || `值必须大于等于 ${min}`,
        suggestion: `请输入大于等于 ${min} 的值`};
    }

    if (max !== undefined && numValue > max) {
      return {
        valid: false,
        message: rule.message || `值必须小于等于 ${max}`,
        suggestion: `请输入小于等于 ${max} 的值`};
    }

    return { valid: true, message: '' };
  }

  /**
   * 验证模式
   */
  private validatePattern(value: any, rule: ValidationRule): { valid: boolean; message: string; suggestion?: string } {
    const { pattern } = rule.params || {};
    const regex = new RegExp(pattern);
    const isValid = regex.test(String(value));
    
    return {
      valid: isValid,
      message: rule.message || '格式不正确',
      suggestion: isValid ? undefined : '请检查输入格式'};
  }

  /**
   * 自定义验证
   */
  private validateCustom(value: any, rule: ValidationRule): { valid: boolean; message: string; suggestion?: string } {
    const { validator } = rule.params || {};
    
    if (typeof validator === 'function') {
      try {
        const result = validator(value);
        return {
          valid: result.valid,
          message: result.message || rule.message,
          suggestion: result.suggestion};
      } catch (error) {
        return {
          valid: false,
          message: '验证函数执行失败'};
      }
    }

    return { valid: true, message: '' };
  }

  /**
   * 检查是否为有效时间戳
   */
  private isValidTimestamp(value: any): boolean {
    const str = String(value);
    
    // ISO 8601 格式
    const isoPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
    if (isoPattern.test(str)) {
      return !isNaN(Date.parse(str));
    }
    
    // Unix 时间戳 (秒)
    const unixPattern = /^\d{10}$/;
    if (unixPattern.test(str)) {
      const timestamp = Number(str);
      return timestamp > 0 && timestamp < 2147483647; // 2038年前
    }
    
    // Unix 时间戳 (毫秒)
    const unixMsPattern = /^\d{13}$/;
    if (unixMsPattern.test(str)) {
      const timestamp = Number(str);
      return timestamp > 0 && timestamp < 2147483647000;
    }
    
    // 其他日期格式
    const date = new Date(str);
    return !isNaN(date.getTime());
  }
}

export class DataQualityAnalyzer {
  /**
   * 分析数据质量
   */
  analyzeDataQuality(data: any[][], headers: string[]): DataQualityReport {
    const totalRows = data.length;
    const issues: QualityIssue[] = [];
    
    // 检查缺失值
    const missingValues = this.analyzeMissingValues(data, headers);
    if (missingValues.count > 0) {
      issues.push(missingValues);
    }

    // 检查重复行
    const duplicates = this.analyzeDuplicateRows(data);
    if (duplicates.count > 0) {
      issues.push(duplicates);
    }

    // 检查异常值
    const outliers = this.analyzeOutliers(data, headers);
    if (outliers.count > 0) {
      issues.push(outliers);
    }

    // 检查数据一致性
    const inconsistencies = this.analyzeConsistency(data, headers);
    inconsistencies.forEach(issue => {
      if (issue.count > 0) {
        issues.push(issue);
      }
    });

    // 计算质量分数
    const qualityScore = this.calculateQualityScore(totalRows, issues);

    return {
      totalRows,
      validRows: totalRows - issues.reduce((sum, issue) => sum + issue.count, 0),
      invalidRows: issues.reduce((sum, issue) => sum + issue.count, 0),
      nullValues: missingValues.count,
      duplicateRows: duplicates.count,
      outliers: outliers.count,
      qualityScore,
      issues};
  }

  /**
   * 分析缺失值
   */
  private analyzeMissingValues(data: any[][], headers: string[]): QualityIssue {
    const missingRows: number[] = [];
    let count = 0;

    data.forEach((row, rowIndex) => {
      row.forEach((cell, cellIndex) => {
        if (cell === null || cell === undefined || cell === '') {
          missingRows.push(rowIndex);
          count++;
        }
      });
    });

    return {
      type: 'missing',
      severity: count > data.length * 0.1 ? 'high' : count > data.length * 0.05 ? 'medium' : 'low',
      description: `发现 ${count} 个缺失值`,
      count,
      rows: [...new Set(missingRows)],
      suggestion: '考虑使用默认值填充或删除包含缺失值的行'};
  }

  /**
   * 分析重复行
   */
  private analyzeDuplicateRows(data: any[][]): QualityIssue {
    const seen = new Set<string>();
    const duplicateRows: number[] = [];

    data.forEach((row, index) => {
      const rowStr = row.join('|');
      if (seen.has(rowStr)) {
        duplicateRows.push(index);
      } else {
        seen.add(rowStr);
      }
    });

    return {
      type: 'duplicate',
      severity: duplicateRows.length > data.length * 0.1 ? 'high' : duplicateRows.length > data.length * 0.05 ? 'medium' : 'low',
      description: `发现 ${duplicateRows.length} 个重复行`,
      count: duplicateRows.length,
      rows: duplicateRows,
      suggestion: '考虑删除重复行或合并重复数据'};
  }

  /**
   * 分析异常值
   */
  private analyzeOutliers(data: any[][], headers: string[]): QualityIssue {
    const outlierRows: number[] = [];
    let count = 0;

    // 对每个数值列检查异常值
    headers.forEach((header, colIndex) => {
      const values = data.map(row => Number(row[colIndex])).filter(val => !isNaN(val));
      
      if (values.length > 10) {
        const outliers = this.detectOutliers(values);
        outliers.forEach(outlierValue => {
          data.forEach((row, rowIndex) => {
            if (Number(row[colIndex]) === outlierValue) {
              outlierRows.push(rowIndex);
              count++;
            }
          });
        });
      }
    });

    return {
      type: 'outlier',
      severity: count > data.length * 0.05 ? 'high' : count > data.length * 0.02 ? 'medium' : 'low',
      description: `发现 ${count} 个异常值`,
      count,
      rows: [...new Set(outlierRows)],
      suggestion: '检查异常值是否为数据输入错误'};
  }

  /**
   * 使用 IQR 方法检测异常值
   */
  private detectOutliers(values: number[]): number[] {
    const sorted = values.slice().sort((a, b) => a - b);
    const q1 = this.quantile(sorted, 0.25);
    const q3 = this.quantile(sorted, 0.75);
    const iqr = q3 - q1;
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;
    
    return values.filter(val => val < lowerBound || val > upperBound);
  }

  /**
   * 计算分位数
   */
  private quantile(sortedArray: number[], q: number): number {
    const index = q * (sortedArray.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;
    
    return sortedArray[lower] * (1 - weight) + sortedArray[upper] * weight;
  }

  /**
   * 分析数据一致性
   */
  private analyzeConsistency(data: any[][], headers: string[]): QualityIssue[] {
    const issues: QualityIssue[] = [];

    // 检查数据类型一致性
    headers.forEach((header, colIndex) => {
      const types = new Set<string>();
      const inconsistentRows: number[] = [];

      data.forEach((row, rowIndex) => {
        const cell = row[colIndex];
        if (cell !== null && cell !== undefined && cell !== '') {
          const type = this.getValueType(cell);
          types.add(type);
          
          if (types.size > 1) {
            inconsistentRows.push(rowIndex);
          }
        }
      });

      if (types.size > 1) {
        issues.push({
          type: 'inconsistent',
          severity: 'medium',
          description: `字段 "${header}" 包含多种数据类型: ${Array.from(types).join(', ')}`,
          count: inconsistentRows.length,
          rows: inconsistentRows,
          suggestion: '统一数据类型或重新定义字段类型'});
      }
    });

    return issues;
  }

  /**
   * 获取值的类型
   */
  private getValueType(value: any): string {
    if (typeof value === 'number') return 'number';
    if (typeof value === 'boolean') return 'boolean';
    
    const str = String(value);
    if (!isNaN(Number(str)) && isFinite(Number(str))) return 'number';
    if (['true', 'false'].includes(str.toLowerCase())) return 'boolean';
    if (this.isValidTimestamp(str)) return 'timestamp';
    
    return 'string';
  }

  /**
   * 检查是否为有效时间戳
   */
  private isValidTimestamp(value: string): boolean {
    const isoPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
    if (isoPattern.test(value)) {
      return !isNaN(Date.parse(value));
    }
    
    const unixPattern = /^\d{10,13}$/;
    if (unixPattern.test(value)) {
      const timestamp = Number(value);
      return timestamp > 0 && timestamp < 2147483647000;
    }
    
    return false;
  }

  /**
   * 计算质量分数
   */
  private calculateQualityScore(totalRows: number, issues: QualityIssue[]): number {
    if (totalRows === 0) return 0;

    let score = 100;
    
    issues.forEach(issue => {
      const impact = issue.count / totalRows;
      const weight = issue.severity === 'high' ? 3 : issue.severity === 'medium' ? 2 : 1;
      const penalty = impact * weight * 100;
      score -= penalty;
    });

    return Math.max(0, Math.min(100, score));
  }
}

export class DataCleaner {
  /**
   * 应用清理规则
   */
  applyCleaningRules(data: any[][], headers: string[], rules: CleaningRule[]): any[][] {
    let cleanedData = data.map(row => [...row]);

    rules.forEach(rule => {
      const colIndex = headers.indexOf(rule.field);
      if (colIndex !== -1) {
        cleanedData = this.applyRule(cleanedData, colIndex, rule);
      }
    });

    return cleanedData;
  }

  /**
   * 应用单个清理规则
   */
  private applyRule(data: any[][], colIndex: number, rule: CleaningRule): any[][] {
    switch (rule.type) {
      case 'fillMissing':
        return this.fillMissingValues(data, colIndex, rule.params);
      
      case 'removeDuplicates':
        return this.removeDuplicateRows(data);
      
      case 'removeOutliers':
        return this.removeOutliers(data, colIndex, rule.params);
      
      case 'standardize':
        return this.standardizeValues(data, colIndex, rule.params);
      
      case 'transform':
        return this.transformValues(data, colIndex, rule.params);
      
      default:
        return data;
    }
  }

  /**
   * 填充缺失值
   */
  private fillMissingValues(data: any[][], colIndex: number, params: any): any[][] {
    const { method, value } = params;
    const values = data.map(row => row[colIndex]).filter(val => val !== null && val !== undefined && val !== '');

    let fillValue: any;

    switch (method) {
      case 'constant':
        fillValue = value;
        break;
      
      case 'mean':
        const numValues = values.map(v => Number(v)).filter(v => !isNaN(v));
        fillValue = numValues.length > 0 ? numValues.reduce((sum, val) => sum + val, 0) / numValues.length : 0;
        break;
      
      case 'median':
        const sortedValues = values.map(v => Number(v)).filter(v => !isNaN(v)).sort((a, b) => a - b);
        const mid = Math.floor(sortedValues.length / 2);
        fillValue = sortedValues.length % 2 === 0 
          ? (sortedValues[mid - 1] + sortedValues[mid]) / 2 
          : sortedValues[mid];
        break;
      
      case 'mode':
        const frequency = new Map<any, number>();
        values.forEach(val => {
          frequency.set(val, (frequency.get(val) || 0) + 1);
        });
        fillValue = Array.from(frequency.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || '';
        break;
      
      default:
        fillValue = '';
    }

    return data.map(row => {
      const newRow = [...row];
      if (newRow[colIndex] === null || newRow[colIndex] === undefined || newRow[colIndex] === '') {
        newRow[colIndex] = fillValue;
      }
      return newRow;
    });
  }

  /**
   * 移除重复行
   */
  private removeDuplicateRows(data: any[][]): any[][] {
    const seen = new Set<string>();
    return data.filter(row => {
      const rowStr = row.join('|');
      if (seen.has(rowStr)) {
        return false;
      }
      seen.add(rowStr);
      return true;
    });
  }

  /**
   * 移除异常值
   */
  private removeOutliers(data: any[][], colIndex: number, params: any): any[][] {
    const { method } = params;
    const values = data.map(row => Number(row[colIndex])).filter(val => !isNaN(val));
    
    let outliers: Set<number>;

    switch (method) {
      case 'iqr':
        outliers = new Set(this.detectOutliersIQR(values));
        break;
      
      case 'zscore':
        outliers = new Set(this.detectOutliersZScore(values, params.threshold || 3));
        break;
      
      default:
        outliers = new Set();
    }

    return data.filter(row => {
      const value = Number(row[colIndex]);
      return isNaN(value) || !outliers.has(value);
    });
  }

  /**
   * 使用 IQR 方法检测异常值
   */
  private detectOutliersIQR(values: number[]): number[] {
    const sorted = values.slice().sort((a, b) => a - b);
    const q1 = this.quantile(sorted, 0.25);
    const q3 = this.quantile(sorted, 0.75);
    const iqr = q3 - q1;
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;
    
    return values.filter(val => val < lowerBound || val > upperBound);
  }

  /**
   * 使用 Z-Score 方法检测异常值
   */
  private detectOutliersZScore(values: number[], threshold: number): number[] {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    
    return values.filter(val => Math.abs((val - mean) / stdDev) > threshold);
  }

  /**
   * 计算分位数
   */
  private quantile(sortedArray: number[], q: number): number {
    const index = q * (sortedArray.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;
    
    return sortedArray[lower] * (1 - weight) + sortedArray[upper] * weight;
  }

  /**
   * 标准化数值
   */
  private standardizeValues(data: any[][], colIndex: number, params: any): any[][] {
    const { method } = params;
    const values = data.map(row => Number(row[colIndex])).filter(val => !isNaN(val));
    
    let transform: (val: number) => number;

    switch (method) {
      case 'minmax':
        const min = Math.min(...values);
        const max = Math.max(...values);
        transform = (val: number) => (val - min) / (max - min);
        break;
      
      case 'zscore':
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
        const stdDev = Math.sqrt(values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length);
        transform = (val: number) => (val - mean) / stdDev;
        break;
      
      default:
        transform = (val: number) => val;
    }

    return data.map(row => {
      const newRow = [...row];
      const value = Number(newRow[colIndex]);
      if (!isNaN(value)) {
        newRow[colIndex] = transform(value);
      }
      return newRow;
    });
  }

  /**
   * 转换数值
   */
  private transformValues(data: any[][], colIndex: number, params: any): any[][] {
    const { method } = params;

    return data.map(row => {
      const newRow = [...row];
      const value = newRow[colIndex];

      switch (method) {
        case 'uppercase':
          newRow[colIndex] = String(value).toUpperCase();
          break;
        
        case 'lowercase':
          newRow[colIndex] = String(value).toLowerCase();
          break;
        
        case 'trim':
          newRow[colIndex] = String(value).trim();
          break;
        
        case 'removeSpecialChars':
          newRow[colIndex] = String(value).replace(/[^a-zA-Z0-9\s]/g, '');
          break;
        
        case 'formatDate':
          const date = new Date(value);
          if (!isNaN(date.getTime())) {
            newRow[colIndex] = date.toISOString();
          }
          break;
        
        default:
          break;
      }

      return newRow;
    });
  }
}

// 导出工具函数
export const createDefaultValidationRules = (dataType: string): ValidationRule[] => {
  const rules: ValidationRule[] = [];

  switch (dataType) {
    case 'number':
      rules.push({
        type: 'dataType',
        message: '必须是数字',
        params: { dataType: 'number' }});
      break;
    
    case 'timestamp':
      rules.push({
        type: 'dataType',
        message: '必须是有效的时间戳',
        params: { dataType: 'timestamp' }});
      break;
    
    case 'boolean':
      rules.push({
        type: 'dataType',
        message: '必须是布尔值',
        params: { dataType: 'boolean' }});
      break;
  }

  return rules;
};