import type { QueryResult } from '@/types';

export interface ExportOptions {
  format: 'csv' | 'json' | 'excel';
  includeHeaders: boolean;
  delimiter?: string;
  filename?: string;
}

// 将查询结果转换为 CSV 格式
export const convertToCSV = (result: QueryResult, options: ExportOptions): string => {
  if (!result.series || result.series.length === 0) {
    return '';
  }

  const delimiter = options.delimiter || ',';
  const lines: string[] = [];

  for (const series of result.series) {
    // 添加系列名称作为注释
    if (series.name) {
      lines.push(`# Series: ${series.name}`);
    }

    // 添加标题行
    if (options.includeHeaders && series.columns) {
      lines.push(series.columns.join(delimiter));
    }

    // 添加数据行
    if (series.values) {
      for (const row of series.values) {
        const csvRow = row.map(value => {
          if (value === null || value === undefined) {
            return '';
          }
          
          const stringValue = String(value);
          
          // 如果值包含分隔符、引号或换行符，需要用引号包围
          if (stringValue.includes(delimiter) || stringValue.includes('"') || stringValue.includes('\n')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }
          
          return stringValue;
        });
        
        lines.push(csvRow.join(delimiter));
      }
    }

    // 在系列之间添加空行
    if (result.series.length > 1) {
      lines.push('');
    }
  }

  return lines.join('\n');
};

// 将查询结果转换为 JSON 格式
export const convertToJSON = (result: QueryResult): string => {
  const exportData = {
    metadata: {
      executionTime: result.executionTime,
      rowCount: result.rowCount,
      exportTime: new Date().toISOString(),
    },
    series: result.series?.map(series => ({
      name: series.name,
      tags: series.tags,
      columns: series.columns,
      values: series.values,
    })) || [],
  };

  return JSON.stringify(exportData, null, 2);
};

// 将查询结果转换为 Excel 兼容的 CSV 格式
export const convertToExcelCSV = (result: QueryResult, options: ExportOptions): string => {
  // Excel 使用 UTF-8 BOM 来正确识别编码
  const bom = '\uFEFF';
  const csv = convertToCSV(result, { ...options, delimiter: ',' });
  return bom + csv;
};

// 下载文件
export const downloadFile = (content: string, filename: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // 清理 URL 对象
  setTimeout(() => URL.revokeObjectURL(url), 100);
};

// 导出查询结果
export const exportQueryResult = (result: QueryResult, options: ExportOptions) => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const baseFilename = options.filename || `influxdb-query-${timestamp}`;

  let content: string;
  let filename: string;
  let mimeType: string;

  switch (options.format) {
    case 'csv':
      content = convertToCSV(result, options);
      filename = `${baseFilename}.csv`;
      mimeType = 'text/csv;charset=utf-8';
      break;

    case 'json':
      content = convertToJSON(result);
      filename = `${baseFilename}.json`;
      mimeType = 'application/json;charset=utf-8';
      break;

    case 'excel':
      content = convertToExcelCSV(result, options);
      filename = `${baseFilename}.csv`;
      mimeType = 'text/csv;charset=utf-8';
      break;

    default:
      throw new Error(`Unsupported export format: ${options.format}`);
  }

  downloadFile(content, filename, mimeType);
};

// 生成查询结果统计信息
export const generateResultStats = (result: QueryResult) => {
  const stats = {
    totalSeries: result.series?.length || 0,
    totalRows: result.rowCount || 0,
    executionTime: result.executionTime || 0,
    columns: [] as string[],
    seriesInfo: [] as Array<{
      name: string;
      columns: string[];
      rowCount: number;
      tags: Record<string, string>;
    }>,
  };

  if (result.series) {
    const allColumns = new Set<string>();
    
    for (const series of result.series) {
      if (series.columns) {
        series.columns.forEach(col => allColumns.add(col));
      }
      
      stats.seriesInfo.push({
        name: series.name || 'Unknown',
        columns: series.columns || [],
        rowCount: series.values?.length || 0,
        tags: series.tags || {},
      });
    }
    
    stats.columns = Array.from(allColumns);
  }

  return stats;
};

// 验证导出选项
export const validateExportOptions = (options: ExportOptions): string[] => {
  const errors: string[] = [];

  if (!['csv', 'json', 'excel'].includes(options.format)) {
    errors.push('Invalid export format. Must be csv, json, or excel.');
  }

  if (options.delimiter && options.delimiter.length !== 1) {
    errors.push('Delimiter must be a single character.');
  }

  if (options.filename && !/^[a-zA-Z0-9_\-\s]+$/.test(options.filename)) {
    errors.push('Filename contains invalid characters.');
  }

  return errors;
};

// 预览导出内容（前几行）
export const previewExportContent = (result: QueryResult, options: ExportOptions, maxLines: number = 10): string => {
  let content: string;

  switch (options.format) {
    case 'csv':
    case 'excel':
      content = convertToCSV(result, options);
      break;
    case 'json':
      content = convertToJSON(result);
      break;
    default:
      return 'Unsupported format for preview';
  }

  const lines = content.split('\n');
  const previewLines = lines.slice(0, maxLines);
  
  if (lines.length > maxLines) {
    previewLines.push(`... (${lines.length - maxLines} more lines)`);
  }

  return previewLines.join('\n');
};

// 估算文件大小
export const estimateFileSize = (result: QueryResult, options: ExportOptions): string => {
  let content: string;

  switch (options.format) {
    case 'csv':
    case 'excel':
      content = convertToCSV(result, options);
      break;
    case 'json':
      content = convertToJSON(result);
      break;
    default:
      return 'Unknown';
  }

  const sizeInBytes = new Blob([content]).size;
  
  if (sizeInBytes < 1024) {
    return `${sizeInBytes} B`;
  } else if (sizeInBytes < 1024 * 1024) {
    return `${(sizeInBytes / 1024).toFixed(1)} KB`;
  } else {
    return `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`;
  }
};
