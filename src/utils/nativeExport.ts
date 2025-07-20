/**
 * 原生导出工具
 * 使用 Tauri 原生文件保存功能，避免浏览器下载提示
 */

import { safeTauriInvoke } from '@/utils/tauri';
import { convertToCSV, convertToJSON, convertToExcel, convertToTSV, convertToMarkdown, convertToSQL, getFileExtension, getMimeType } from './export';
import type { QueryResult, ExportOptions } from '@/types';

export interface NativeExportOptions {
  format: 'csv' | 'json' | 'excel' | 'xlsx' | 'tsv' | 'markdown' | 'sql';
  includeHeaders: boolean;
  delimiter?: string;
  defaultFilename?: string;
  defaultDirectory?: string;
  tableName?: string; // 用于SQL插入语句
}

export interface FileFilter {
  name: string;
  extensions: string[];
}

// 根据格式获取文件过滤器
export const getFileFilters = (format: string): FileFilter[] => {
  switch (format.toLowerCase()) {
    case 'csv':
      return [
        { name: 'CSV 文件', extensions: ['csv'] },
        { name: '所有文件', extensions: ['*'] }
      ];
    case 'tsv':
      return [
        { name: 'TSV 文件', extensions: ['tsv'] },
        { name: '所有文件', extensions: ['*'] }
      ];
    case 'json':
      return [
        { name: 'JSON 文件', extensions: ['json'] },
        { name: '所有文件', extensions: ['*'] }
      ];
    case 'excel':
    case 'xlsx':
      return [
        { name: 'Excel 文件', extensions: ['xlsx'] },
        { name: '所有文件', extensions: ['*'] }
      ];
    case 'markdown':
      return [
        { name: 'Markdown 文件', extensions: ['md'] },
        { name: '所有文件', extensions: ['*'] }
      ];
    case 'sql':
      return [
        { name: 'SQL 文件', extensions: ['sql'] },
        { name: '所有文件', extensions: ['*'] }
      ];
    default:
      return [{ name: '所有文件', extensions: ['*'] }];
  }
};

// 生成默认文件名
export const generateDefaultFilename = (
  format: string,
  prefix: string = 'export'
): string => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const extension = getFileExtension(format);
  return `${prefix}_${timestamp}${extension}`;
};

/**
 * 使用原生文件保存对话框导出数据
 */
export const exportWithNativeDialog = async (
  result: QueryResult,
  options: NativeExportOptions
): Promise<boolean> => {
  try {
    // 准备文件保存对话框选项
    const defaultFilename = options.defaultFilename || generateDefaultFilename(options.format);
    const defaultPath = options.defaultDirectory 
      ? `${options.defaultDirectory}/${defaultFilename}`
      : defaultFilename;

    const filters = getFileFilters(options.format);

    // 显示原生文件保存对话框
    const dialogResult = await safeTauriInvoke<{ path?: string; name?: string } | null>(
      'save_file_dialog',
      {
        default_path: defaultPath,
        filters
      }
    );

    // 用户取消了保存
    if (!dialogResult || !dialogResult.path) {
      return false;
    }

    // 生成导出数据
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

    // 写入文件
    if (data instanceof ArrayBuffer) {
      // 对于二进制数据（如 Excel），需要转换为 base64
      const uint8Array = new Uint8Array(data);
      const binaryString = Array.from(uint8Array).map(byte => String.fromCharCode(byte)).join('');
      const base64Data = btoa(binaryString);
      
      await safeTauriInvoke('write_binary_file', {
        path: dialogResult.path,
        data: base64Data
      });
    } else {
      // 对于文本数据
      await safeTauriInvoke('write_file', {
        path: dialogResult.path,
        content: data
      });
    }

    return true;
  } catch (error) {
    console.error('原生导出失败:', error);
    throw new Error(`导出失败: ${error}`);
  }
};

/**
 * 直接保存到指定路径（不显示对话框）
 */
export const exportToPath = async (
  result: QueryResult,
  filePath: string,
  options: Omit<NativeExportOptions, 'defaultFilename' | 'defaultDirectory'>
): Promise<void> => {
  try {
    // 生成导出数据
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

    // 写入文件
    if (data instanceof ArrayBuffer) {
      // 对于二进制数据（如 Excel），需要转换为 base64
      const uint8Array = new Uint8Array(data);
      const binaryString = Array.from(uint8Array).map(byte => String.fromCharCode(byte)).join('');
      const base64Data = btoa(binaryString);
      
      await safeTauriInvoke('write_binary_file', {
        path: filePath,
        data: base64Data
      });
    } else {
      // 对于文本数据
      await safeTauriInvoke('write_file', {
        path: filePath,
        content: data
      });
    }
  } catch (error) {
    console.error('导出到指定路径失败:', error);
    throw new Error(`导出失败: ${error}`);
  }
};

/**
 * 快速导出到默认位置
 */
export const quickExport = async (
  result: QueryResult,
  format: 'csv' | 'json' | 'excel' | 'xlsx' | 'tsv' | 'markdown' | 'sql',
  prefix: string = 'export'
): Promise<string> => {
  try {
    // 生成文件名
    const filename = generateDefaultFilename(format, prefix);
    
    // 获取默认下载目录
    const downloadsDir = await safeTauriInvoke<string>('get_downloads_dir').catch(() => '');
    const fullPath = downloadsDir ? `${downloadsDir}/${filename}` : filename;

    // 导出选项
    const options: Omit<NativeExportOptions, 'defaultFilename' | 'defaultDirectory'> = {
      format,
      includeHeaders: true,
      delimiter: ','
    };

    // 直接导出到路径
    await exportToPath(result, fullPath, options);
    
    return fullPath;
  } catch (error) {
    console.error('快速导出失败:', error);
    throw new Error(`快速导出失败: ${error}`);
  }
};

/**
 * 批量导出多种格式
 */
export const batchExport = async (
  result: QueryResult,
  formats: ('csv' | 'json' | 'excel' | 'xlsx' | 'tsv' | 'markdown' | 'sql')[],
  baseFilename: string = 'export'
): Promise<string[]> => {
  const exportedFiles: string[] = [];
  
  for (const format of formats) {
    try {
      const options: NativeExportOptions = {
        format,
        includeHeaders: true,
        delimiter: ',',
        defaultFilename: generateDefaultFilename(format, baseFilename)
      };

      const success = await exportWithNativeDialog(result, options);
      if (success) {
        exportedFiles.push(`${baseFilename}.${getFileExtension(format).slice(1)}`);
      }
    } catch (error) {
      console.error(`导出 ${format} 格式失败:`, error);
      // 继续导出其他格式
    }
  }

  return exportedFiles;
};

/**
 * 检测是否支持原生导出
 */
export const isNativeExportSupported = async (): Promise<boolean> => {
  try {
    // 测试是否可以调用 Tauri 命令
    await safeTauriInvoke('get_app_config');
    return true;
  } catch {
    return false;
  }
};

/**
 * 获取导出统计信息
 */
export const getExportInfo = async (
  result: QueryResult,
  format: string
): Promise<{
  estimatedSize: string;
  rowCount: number;
  columnCount: number;
  mimeType: string;
}> => {
  let data: string | ArrayBuffer;
  
  // 生成临时数据来计算大小
  const tempOptions = { format: format as any, includeHeaders: true };

  switch (format.toLowerCase()) {
    case 'csv':
      data = convertToCSV(result, tempOptions as any);
      break;
    case 'tsv':
      data = convertToTSV(result, tempOptions as any);
      break;
    case 'json':
      data = convertToJSON(result, tempOptions as any);
      break;
    case 'excel':
    case 'xlsx':
      data = convertToExcel(result, tempOptions as any);
      break;
    case 'markdown':
      data = convertToMarkdown(result, tempOptions as any);
      break;
    case 'sql':
      data = convertToSQL(result, tempOptions as any);
      break;
    default:
      data = '';
  }

  const sizeInBytes = data instanceof ArrayBuffer ? data.byteLength : new Blob([data]).size;
  const estimatedSize = formatBytes(sizeInBytes);

  // 计算行数和列数
  let rowCount = 0;
  let columnCount = 0;

  if (result.results && result.results.length > 0) {
    for (const resultItem of result.results) {
      if (resultItem.series) {
        for (const series of resultItem.series) {
          if (series.values) {
            rowCount += series.values.length;
          }
          if (series.columns) {
            columnCount = Math.max(columnCount, series.columns.length);
          }
        }
      }
    }
  }

  return {
    estimatedSize,
    rowCount,
    columnCount,
    mimeType: getMimeType(format)
  };
};

// 格式化字节大小
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};