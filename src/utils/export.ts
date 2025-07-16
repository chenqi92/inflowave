import * as XLSX from 'xlsx';
import type { QueryResult } from '@/types';

export interface ExportOptions {
  format: 'csv' | 'json' | 'excel' | 'xlsx';
  includeHeaders: boolean;
  delimiter?: string;
  filename?: string;
}

// 将查询结果转换为 CSV 格式
export const convertToCSV = (
  result: QueryResult,
  options: ExportOptions
): string => {
  if (!result.results || result.results.length === 0) {
    return '';
  }

  const delimiter = options.delimiter || ',';
  const lines: string[] = [];

  for (const resultItem of result.results) {
    // 添加标题行
    if (options.includeHeaders && resultItem.columns) {
      lines.push(resultItem.columns.join(delimiter));
    }

    // 添加数据行
    if (resultItem.rows) {
      for (const row of resultItem.rows) {
        const csvRow = row
          .map((value: any) => {
            if (value === null || value === undefined) {
              return '';
            }
            const stringValue = String(value);
            if (
              stringValue.includes(delimiter) ||
              stringValue.includes('"') ||
              stringValue.includes('\n')
            ) {
              return `"${stringValue.replace(/"/g, '""')}"`;
            }
            return stringValue;
          })
          .join(delimiter);
        lines.push(csvRow);
      }
    }

    // 添加空行分隔不同的结果
    lines.push('');
  }

  return lines.join('\n');
};

// 将查询结果转换为 JSON 格式
export const convertToJSON = (
  result: QueryResult,
  _options: ExportOptions
): string => {
  const data: any[] = [];

  if (!result.results || result.results.length === 0) {
    return JSON.stringify(data, null, 2);
  }

  for (const resultItem of result.results) {
    if (resultItem.rows && resultItem.columns) {
      for (const row of resultItem.rows) {
        const rowObj: any = {};

        // 添加列数据
        resultItem.columns.forEach((column, index) => {
          rowObj[column] = row[index];
        });

        data.push(rowObj);
      }
    }
  }

  return JSON.stringify(data, null, 2);
};

// 将查询结果转换为 Excel 格式
export const convertToExcel = (
  result: QueryResult,
  options: ExportOptions
): ArrayBuffer => {
  const workbook = XLSX.utils.book_new();

  if (!result.results || result.results.length === 0) {
    // 创建空工作表
    const worksheet = XLSX.utils.aoa_to_sheet([['No Data']]);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
  } else {
    result.results.forEach((resultItem, index) => {
      const data: any[][] = [];

      // 添加标题行
      if (options.includeHeaders && resultItem.columns) {
        data.push(resultItem.columns);
      }

      // 添加数据行
      if (resultItem.rows) {
        data.push(...resultItem.rows);
      }

      const worksheet = XLSX.utils.aoa_to_sheet(data);
      const sheetName = `Sheet${index + 1}`;
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    });
  }

  // 生成 Excel 文件缓冲区
  return XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
};

// 下载数据到文件
export const downloadData = (
  data: string | ArrayBuffer,
  filename: string,
  mimeType: string
): void => {
  try {
    const blob = new Blob([data], { type: mimeType });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // 清理对象 URL
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('下载文件失败:', error);
    throw new Error('文件下载失败');
  }
};

// 根据格式获取 MIME 类型
export const getMimeType = (format: string): string => {
  switch (format.toLowerCase()) {
    case 'csv':
      return 'text/csv';
    case 'json':
      return 'application/json';
    case 'excel':
    case 'xlsx':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    default:
      return 'text/plain';
  }
};

// 根据格式获取文件扩展名
export const getFileExtension = (format: string): string => {
  switch (format.toLowerCase()) {
    case 'csv':
      return '.csv';
    case 'json':
      return '.json';
    case 'excel':
    case 'xlsx':
      return '.xlsx';
    default:
      return '.txt';
  }
};

// 生成默认文件名
export const generateFilename = (
  format: string,
  prefix: string = 'export'
): string => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const extension = getFileExtension(format);
  return `${prefix}_${timestamp}${extension}`;
};

// 导出查询结果
export const exportQueryResult = async (
  result: QueryResult,
  options: ExportOptions
): Promise<void> => {
  try {
    const filename = options.filename || generateFilename(options.format);
    const mimeType = getMimeType(options.format);

    let data: string | ArrayBuffer;

    switch (options.format.toLowerCase()) {
      case 'csv':
        data = convertToCSV(result, options);
        break;
      case 'json':
        data = convertToJSON(result, options);
        break;
      case 'excel':
      case 'xlsx':
        data = convertToExcel(result, options);
        break;
      default:
        throw new Error(`不支持的导出格式: ${options.format}`);
    }

    await downloadData(data, filename, mimeType);
  } catch (error) {
    console.error('导出失败:', error);
    throw error;
  }
};

// 获取导出数据的统计信息
export const getExportStats = (
  result: QueryResult
): {
  totalRows: number;
  totalColumns: number;
  seriesCount: number;
  dataSize: number;
} => {
  let totalRows = 0;
  let totalColumns = 0;
  let dataSize = 0;

  if (result.results && result.results.length > 0) {
    for (const resultItem of result.results) {
      if (resultItem.rows) {
        totalRows += resultItem.rows.length;
        if (resultItem.columns) {
          totalColumns = Math.max(totalColumns, resultItem.columns.length);
        }

        // 估算数据大小（字节）
        for (const row of resultItem.rows) {
          for (const col of row) {
            dataSize += String(col || '').length;
          }
        }
      }
    }
  }

  return {
    totalRows,
    totalColumns,
    seriesCount: result.results?.length || 0,
    dataSize,
  };
};

// 验证导出数据
export const validateExportData = (
  result: QueryResult
): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} => {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!result) {
    errors.push('查询结果为空');
    return { isValid: false, errors, warnings };
  }

  if (!result.results || result.results.length === 0) {
    errors.push('没有可导出的数据结果');
    return { isValid: false, errors, warnings };
  }

  // 检查每个结果的数据完整性
  result.results.forEach((resultItem, index) => {
    if (!resultItem.columns || resultItem.columns.length === 0) {
      warnings.push(`结果 ${index + 1} 缺少列定义`);
    }

    if (!resultItem.rows || resultItem.rows.length === 0) {
      warnings.push(`结果 ${index + 1} 没有数据行`);
    }

    // 检查数据一致性
    if (resultItem.columns && resultItem.rows) {
      const columnCount = resultItem.columns.length;
      const inconsistentRows = resultItem.rows.filter(
        (row: any[]) => row.length !== columnCount
      );

      if (inconsistentRows.length > 0) {
        warnings.push(
          `结果 ${index + 1} 有 ${inconsistentRows.length} 行数据列数不一致`
        );
      }
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
};

// 格式化数据大小
export const formatDataSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

// 预估导出时间
export const estimateExportTime = (
  stats: ReturnType<typeof getExportStats>
): number => {
  // 基于数据大小的简单估算，单位：毫秒
  const baseTime = 100; // 基础时间
  const sizeMultiplier = Math.max(1, stats.dataSize / 1000); // 每 1KB 增加 1ms
  const rowMultiplier = Math.max(1, stats.totalRows / 100); // 每 100 行增加 1ms

  return Math.round(baseTime + sizeMultiplier + rowMultiplier);
};
