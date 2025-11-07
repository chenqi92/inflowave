import * as XLSX from 'xlsx';
import type { QueryResult } from '@/types';
import { safeTauriInvoke } from '@/utils/tauri';
import { getFileOperationError, formatErrorMessage } from '@/utils/userFriendlyErrors';
import logger from '@/utils/logger';

export interface ExportOptions {
  format: 'csv' | 'json' | 'excel' | 'xlsx' | 'tsv' | 'markdown' | 'sql';
  includeHeaders: boolean;
  delimiter?: string;
  filename?: string;
  tableName?: string; // 用于SQL插入语句
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
    // 处理series数据
    if (resultItem.series) {
      for (const series of resultItem.series) {
        if (series.columns && series.values) {
          // 过滤掉行号列和其他非数据列
          const filteredColumns: string[] = [];
          const filteredColumnIndices: number[] = [];

          series.columns.forEach((col, index) => {
            // 过滤掉行号列（通常是 "#" 或 "序号" 等）
            if (col !== '#' && col !== '序号' && col !== 'index' && col !== 'rowIndex') {
              filteredColumns.push(col);
              filteredColumnIndices.push(index);
            }
          });

          // 如果没有有效列，跳过
          if (filteredColumns.length === 0) {
            continue;
          }

          // 添加标题行
          if (options.includeHeaders) {
            lines.push(filteredColumns.join(delimiter));
          }

          // 添加数据行
          for (const row of series.values) {
            // 只取过滤后的列对应的值
            const filteredValues = filteredColumnIndices.map(index => row[index]);

            const csvRow = filteredValues
              .map((value: unknown) => {
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

        // 添加空行分隔不同的series
        lines.push('');
      }
    }
  }

  return lines.join('\n');
};

// 将查询结果转换为 JSON 格式
export const convertToJSON = (
  result: QueryResult,
  _options: ExportOptions
): string => {
  const data: Record<string, unknown>[] = [];

  if (!result.results || result.results.length === 0) {
    return JSON.stringify(data, null, 2);
  }

  for (const resultItem of result.results) {
    if (resultItem.series) {
      for (const series of resultItem.series) {
        if (series.values && series.columns) {
          // 过滤掉行号列和其他非数据列
          const filteredColumns: string[] = [];
          const filteredColumnIndices: number[] = [];

          series.columns.forEach((col, index) => {
            // 过滤掉行号列（通常是 "#" 或 "序号" 等）
            if (col !== '#' && col !== '序号' && col !== 'index' && col !== 'rowIndex') {
              filteredColumns.push(col);
              filteredColumnIndices.push(index);
            }
          });

          // 如果没有有效列，跳过
          if (filteredColumns.length === 0) {
            continue;
          }

          for (const row of series.values) {
            const rowObj: Record<string, unknown> = {};

            // 只添加过滤后的列数据
            filteredColumns.forEach((column, filteredIndex) => {
              const originalIndex = filteredColumnIndices[filteredIndex];
              rowObj[column] = row[originalIndex];
            });

            data.push(rowObj);
          }
        }
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
    let sheetIndex = 1;
    result.results.forEach((resultItem) => {
      if (resultItem.series) {
        resultItem.series.forEach((series) => {
          if (series.columns && series.values) {
            // 过滤掉行号列和其他非数据列
            const filteredColumns: string[] = [];
            const filteredColumnIndices: number[] = [];

            series.columns.forEach((col, index) => {
              // 过滤掉行号列（通常是 "#" 或 "序号" 等）
              if (col !== '#' && col !== '序号' && col !== 'index' && col !== 'rowIndex') {
                filteredColumns.push(col);
                filteredColumnIndices.push(index);
              }
            });

            // 如果没有有效列，跳过
            if (filteredColumns.length === 0) {
              return;
            }

            const data: unknown[][] = [];

            // 添加标题行
            if (options.includeHeaders) {
              data.push(filteredColumns);
            }

            // 添加数据行（只包含过滤后的列）
            for (const row of series.values) {
              const filteredRow = filteredColumnIndices.map(index => row[index]);
              data.push(filteredRow);
            }

            const worksheet = XLSX.utils.aoa_to_sheet(data);
            const sheetName = series.name || `Sheet${sheetIndex}`;
            XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
            sheetIndex++;
          }
        });
      }
    });
  }

  // 生成 Excel 文件缓冲区
  return XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
};

// 将查询结果转换为 TSV 格式
export const convertToTSV = (
  result: QueryResult,
  options: ExportOptions
): string => {
  const tsvOptions = { ...options, delimiter: '\t' };
  return convertToCSV(result, tsvOptions);
};

// 将查询结果转换为 Markdown 表格格式
export const convertToMarkdown = (
  result: QueryResult,
  options: ExportOptions
): string => {
  if (!result.results || result.results.length === 0) {
    return '| 列 |\n|---|\n| 无数据 |';
  }

  const lines: string[] = [];

  for (const resultItem of result.results) {
    if (resultItem.series) {
      for (const series of resultItem.series) {
        if (series.columns && series.values) {
          // 过滤掉行号列和其他非数据列
          const filteredColumns: string[] = [];
          const filteredColumnIndices: number[] = [];

          series.columns.forEach((col, index) => {
            // 过滤掉行号列（通常是 "#" 或 "序号" 等）
            if (col !== '#' && col !== '序号' && col !== 'index' && col !== 'rowIndex') {
              filteredColumns.push(col);
              filteredColumnIndices.push(index);
            }
          });

          // 如果没有有效列，跳过
          if (filteredColumns.length === 0) {
            continue;
          }

          // 添加表格标题（如果有）
          if (series.name) {
            lines.push(`## ${series.name}`);
            lines.push('');
          }

          // 添加表头
          if (options.includeHeaders) {
            const headerRow = `| ${filteredColumns.join(' | ')} |`;
            const separatorRow = `| ${filteredColumns.map(() => '---').join(' | ')} |`;
            lines.push(headerRow);
            lines.push(separatorRow);
          }

          // 添加数据行
          for (const row of series.values) {
            // 只取过滤后的列对应的值
            const filteredValues = filteredColumnIndices.map(index => row[index]);

            const markdownRow = filteredValues
              .map((value: unknown) => {
                if (value === null || value === undefined) {
                  return '';
                }
                // 转义Markdown特殊字符
                return String(value).replace(/\|/g, '\\|').replace(/\n/g, '<br>');
              })
              .join(' | ');
            lines.push(`| ${markdownRow} |`);
          }
        }

        // 添加空行分隔不同的表格
        lines.push('');
      }
    }
  }

  return lines.join('\n');
};

// 将查询结果转换为 SQL INSERT 语句
export const convertToSQL = (
  result: QueryResult,
  options: ExportOptions
): string => {
  if (!result.results || result.results.length === 0) {
    return '-- 无数据可导出';
  }

  const tableName = options.tableName || 'exported_data';
  const lines: string[] = [];

  // 添加注释
  lines.push(`-- SQL INSERT 语句`);
  lines.push(`-- 生成时间: ${new Date().toLocaleString()}`);
  lines.push(`-- 表名: ${tableName}`);
  lines.push('');

  for (const resultItem of result.results) {
    if (resultItem.series) {
      for (const series of resultItem.series) {
        if (series.columns && series.values) {
          // 过滤掉行号列和其他非数据列
          const filteredColumns: string[] = [];
          const filteredColumnIndices: number[] = [];

          series.columns.forEach((col, index) => {
            // 过滤掉行号列（通常是 "#" 或 "序号" 等）
            if (col !== '#' && col !== '序号' && col !== 'index' && col !== 'rowIndex') {
              filteredColumns.push(col);
              filteredColumnIndices.push(index);
            }
          });

          // 如果没有有效列，跳过
          if (filteredColumns.length === 0) {
            continue;
          }

          // 生成表结构注释
          lines.push(`-- 表结构: ${filteredColumns.join(', ')}`);
          lines.push('');

          // 生成INSERT语句
          for (const row of series.values) {
            // 只取过滤后的列对应的值
            const filteredValues = filteredColumnIndices.map(index => row[index]);

            const values = filteredValues.map((value: unknown) => {
              if (value === null || value === undefined) {
                return 'NULL';
              }

              // 处理不同数据类型
              if (typeof value === 'string') {
                // 转义单引号并用单引号包围字符串
                return `'${String(value).replace(/'/g, "''")}'`;
              } else if (typeof value === 'number') {
                return String(value);
              } else if (typeof value === 'boolean') {
                return value ? '1' : '0';
              } else if (value instanceof Date) {
                return `'${value.toISOString()}'`;
              } else {
                // 其他类型转为字符串
                return `'${String(value).replace(/'/g, "''")}'`;
              }
            });

            const columnList = filteredColumns.map(col => `"${col}"`).join(', ');
            const valueList = values.join(', ');
            lines.push(`INSERT INTO "${tableName}" (${columnList}) VALUES (${valueList});`);
          }

          lines.push('');
        }
      }
    }
  }

  return lines.join('\n');
};

// 下载数据到文件 - 使用 Tauri 原生实现
export const downloadData = async (
  data: string | ArrayBuffer,
  filename: string,
  mimeType: string
): Promise<void> => {
  try {
    // 检查是否在 Tauri 环境中
    if (typeof window !== 'undefined' && (window as any).__TAURI__) {
      // Tauri 环境：使用原生文件保存

      // 显示文件保存对话框
      const dialogResult = await safeTauriInvoke<{ path?: string; name?: string } | null>(
        'save_file_dialog',
        {
          params: {
            defaultPath: filename,
            filters: [{
              name: getFilterName(mimeType),
              extensions: [getFileExtensionFromFilename(filename)]
            }]
          }
        }
      );

      if (!dialogResult?.path) {
        // 用户取消了保存
        return;
      }

      // 保存文件
      if (data instanceof ArrayBuffer) {
        // 二进制数据：转换为 base64
        const base64Data = arrayBufferToBase64(data);
        await safeTauriInvoke('write_binary_file', {
          path: dialogResult.path,
          data: base64Data
        });
      } else {
        // 文本数据
        await safeTauriInvoke('write_file', {
          path: dialogResult.path,
          content: data
        });
      }

      logger.info('文件已保存到:', dialogResult.path);
    } else {
      // 浏览器环境：使用传统方法
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
    }
  } catch (error) {
    logger.error('下载文件失败:', error);
    const friendlyError = getFileOperationError(String(error), 'save');
    throw new Error(formatErrorMessage(friendlyError));
  }
};

// 辅助函数：ArrayBuffer 转 base64
const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

// 辅助函数：根据 MIME 类型获取过滤器名称
const getFilterName = (mimeType: string): string => {
  switch (mimeType) {
    case 'text/csv':
      return 'CSV 文件';
    case 'application/json':
      return 'JSON 文件';
    case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
      return 'Excel 文件';
    case 'text/markdown':
      return 'Markdown 文件';
    case 'text/sql':
      return 'SQL 文件';
    case 'text/tab-separated-values':
      return 'TSV 文件';
    default:
      return '所有文件';
  }
};

// 辅助函数：从文件名获取扩展名
const getFileExtensionFromFilename = (filename: string): string => {
  const lastDotIndex = filename.lastIndexOf('.');
  if (lastDotIndex === -1) return 'txt';
  return filename.substring(lastDotIndex + 1);
};

// 根据格式获取 MIME 类型
export const getMimeType = (format: string): string => {
  switch (format.toLowerCase()) {
    case 'csv':
      return 'text/csv';
    case 'tsv':
      return 'text/tab-separated-values';
    case 'json':
      return 'application/json';
    case 'excel':
    case 'xlsx':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case 'markdown':
      return 'text/markdown';
    case 'sql':
      return 'text/sql';
    default:
      return 'text/plain';
  }
};

// 根据格式获取文件扩展名
export const getFileExtension = (format: string): string => {
  switch (format.toLowerCase()) {
    case 'csv':
      return '.csv';
    case 'tsv':
      return '.tsv';
    case 'json':
      return '.json';
    case 'excel':
    case 'xlsx':
      return '.xlsx';
    case 'markdown':
      return '.md';
    case 'sql':
      return '.sql';
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
      case 'tsv':
        data = convertToTSV(result, options);
        break;
      case 'json':
        data = convertToJSON(result, options);
        break;
      case 'excel':
      case 'xlsx':
        data = convertToExcel(result, options);
        break;
      case 'markdown':
        data = convertToMarkdown(result, options);
        break;
      case 'sql':
        data = convertToSQL(result, options);
        break;
      default:
        throw new Error(`不支持的导出格式: ${options.format}`);
    }

    await downloadData(data, filename, mimeType);
  } catch (error) {
    logger.error('导出失败:', error);
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
      if (resultItem.series) {
        for (const series of resultItem.series) {
          if (series.values) {
            totalRows += series.values.length;
            if (series.columns) {
              totalColumns = Math.max(totalColumns, series.columns.length);
            }

            // 估算数据大小（字节）
            for (const row of series.values) {
              for (const col of row) {
                dataSize += String(col || '').length;
              }
            }
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
    if (!resultItem.series || resultItem.series.length === 0) {
      warnings.push(`结果 ${index + 1} 没有series数据`);
      return;
    }

    resultItem.series.forEach((series, seriesIndex) => {
      if (!series.columns || series.columns.length === 0) {
        warnings.push(`结果 ${index + 1} series ${seriesIndex + 1} 缺少列定义`);
      }

      if (!series.values || series.values.length === 0) {
        warnings.push(`结果 ${index + 1} series ${seriesIndex + 1} 没有数据行`);
      }

      // 检查数据一致性
      if (series.columns && series.values) {
        const columnCount = series.columns.length;
        const inconsistentRows = series.values.filter(
          (row: unknown[]) => row.length !== columnCount
        );

        if (inconsistentRows.length > 0) {
          warnings.push(
            `结果 ${index + 1} series ${seriesIndex + 1} 有 ${inconsistentRows.length} 行数据列数不一致`
          );
        }
      }
    });
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
