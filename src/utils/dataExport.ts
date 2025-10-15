/**
 * 数据导出工具
 * 支持 CSV 和 JSON 格式导出
 */

import { save } from '@tauri-apps/plugin-dialog';
import { writeTextFile } from '@tauri-apps/plugin-fs';
import { toast } from 'sonner';

/**
 * 导出格式
 */
export type ExportFormat = 'csv' | 'json';

/**
 * CSV 导出选项
 */
export interface CSVExportOptions {
  /** 分隔符 */
  delimiter?: ',' | ';' | '\t' | '|';
  /** 是否包含表头 */
  includeHeaders?: boolean;
  /** 换行符 */
  lineBreak?: '\n' | '\r\n';
  /** 是否转义特殊字符 */
  escapeQuotes?: boolean;
  /** 日期格式 */
  dateFormat?: 'iso' | 'locale' | 'timestamp';
  /** 空值表示 */
  nullValue?: string;
}

/**
 * JSON 导出选项
 */
export interface JSONExportOptions {
  /** 是否格式化（美化） */
  pretty?: boolean;
  /** 缩进空格数 */
  indent?: number;
  /** 日期格式 */
  dateFormat?: 'iso' | 'locale' | 'timestamp';
  /** 是否包含元数据 */
  includeMetadata?: boolean;
}

/**
 * 导出配置
 */
export interface ExportConfig {
  /** 导出格式 */
  format: ExportFormat;
  /** 文件名（不含扩展名） */
  filename?: string;
  /** CSV 选项 */
  csvOptions?: CSVExportOptions;
  /** JSON 选项 */
  jsonOptions?: JSONExportOptions;
}

/**
 * 导出元数据
 */
export interface ExportMetadata {
  /** 导出时间 */
  exportedAt: string;
  /** 总行数 */
  totalRows: number;
  /** 总列数 */
  totalColumns: number;
  /** 数据库名称 */
  database?: string;
  /** 表名 */
  tableName?: string;
  /** 查询语句 */
  query?: string;
}

/**
 * 默认 CSV 导出选项
 */
export const DEFAULT_CSV_OPTIONS: Required<CSVExportOptions> = {
  delimiter: ',',
  includeHeaders: true,
  lineBreak: '\n',
  escapeQuotes: true,
  dateFormat: 'iso',
  nullValue: '',
};

/**
 * 默认 JSON 导出选项
 */
export const DEFAULT_JSON_OPTIONS: Required<JSONExportOptions> = {
  pretty: true,
  indent: 2,
  dateFormat: 'iso',
  includeMetadata: true,
};

/**
 * 转义 CSV 字段值
 */
function escapeCSVField(value: any, options: Required<CSVExportOptions>): string {
  if (value === null || value === undefined) {
    return options.nullValue;
  }

  let str = String(value);

  // 处理日期
  if (value instanceof Date) {
    switch (options.dateFormat) {
      case 'iso':
        str = value.toISOString();
        break;
      case 'locale':
        str = value.toLocaleString();
        break;
      case 'timestamp':
        str = String(value.getTime());
        break;
    }
  }

  // 如果包含分隔符、换行符或引号，需要用引号包裹
  const needsQuotes =
    str.includes(options.delimiter) ||
    str.includes('\n') ||
    str.includes('\r') ||
    str.includes('"');

  if (needsQuotes) {
    // 转义引号
    if (options.escapeQuotes) {
      str = str.replace(/"/g, '""');
    }
    return `"${str}"`;
  }

  return str;
}

/**
 * 格式化 JSON 值
 */
function formatJSONValue(value: any, options: Required<JSONExportOptions>): any {
  if (value === null || value === undefined) {
    return null;
  }

  // 处理日期
  if (value instanceof Date) {
    switch (options.dateFormat) {
      case 'iso':
        return value.toISOString();
      case 'locale':
        return value.toLocaleString();
      case 'timestamp':
        return value.getTime();
    }
  }

  return value;
}

/**
 * 导出为 CSV 格式
 */
export function exportToCSV(
  data: Record<string, any>[],
  columns: string[],
  options: CSVExportOptions = {}
): string {
  const opts = { ...DEFAULT_CSV_OPTIONS, ...options };
  const lines: string[] = [];

  // 添加表头
  if (opts.includeHeaders) {
    const headerLine = columns
      .map((col) => escapeCSVField(col, opts))
      .join(opts.delimiter);
    lines.push(headerLine);
  }

  // 添加数据行
  for (const row of data) {
    const values = columns.map((col) => {
      const value = row[col];
      return escapeCSVField(value, opts);
    });
    lines.push(values.join(opts.delimiter));
  }

  return lines.join(opts.lineBreak);
}

/**
 * 导出为 JSON 格式
 */
export function exportToJSON(
  data: Record<string, any>[],
  columns: string[],
  metadata?: ExportMetadata,
  options: JSONExportOptions = {}
): string {
  const opts = { ...DEFAULT_JSON_OPTIONS, ...options };

  // 格式化数据
  const formattedData = data.map((row) => {
    const formattedRow: Record<string, any> = {};
    for (const col of columns) {
      formattedRow[col] = formatJSONValue(row[col], opts);
    }
    return formattedRow;
  });

  // 构建导出对象
  const exportObj: any = {
    data: formattedData,
  };

  // 添加元数据
  if (opts.includeMetadata && metadata) {
    exportObj.metadata = {
      ...metadata,
      columns,
    };
  }

  // 序列化
  if (opts.pretty) {
    return JSON.stringify(exportObj, null, opts.indent);
  } else {
    return JSON.stringify(exportObj);
  }
}

/**
 * 保存导出文件
 */
export async function saveExportFile(
  content: string,
  config: ExportConfig
): Promise<boolean> {
  try {
    // 确定文件扩展名
    const extension = config.format === 'csv' ? 'csv' : 'json';
    const defaultFilename = config.filename || `export_${Date.now()}`;

    // 打开保存对话框
    const filePath = await save({
      defaultPath: `${defaultFilename}.${extension}`,
      filters: [
        {
          name: config.format.toUpperCase(),
          extensions: [extension],
        },
      ],
    });

    if (!filePath) {
      // 用户取消了保存
      return false;
    }

    // 写入文件
    await writeTextFile(filePath, content);

    toast.success(`文件已成功导出到: ${filePath}`);
    return true;
  } catch (error) {
    console.error('导出文件失败:', error);
    toast.error(`导出失败: ${error}`);
    return false;
  }
}

/**
 * 导出数据（主函数）
 */
export async function exportData(
  data: Record<string, any>[],
  columns: string[],
  config: ExportConfig,
  metadata?: ExportMetadata
): Promise<boolean> {
  try {
    let content: string;

    // 根据格式生成内容
    if (config.format === 'csv') {
      content = exportToCSV(data, columns, config.csvOptions);
    } else {
      content = exportToJSON(data, columns, metadata, config.jsonOptions);
    }

    // 保存文件
    return await saveExportFile(content, config);
  } catch (error) {
    console.error('导出数据失败:', error);
    toast.error(`导出失败: ${error}`);
    return false;
  }
}

/**
 * 从查询结果导出
 */
export async function exportQueryResult(
  result: {
    data?: any[][];
    columns?: string[];
  },
  config: ExportConfig,
  metadata?: Partial<ExportMetadata>
): Promise<boolean> {
  if (!result.data || !result.columns || result.data.length === 0) {
    toast.warning('没有数据可导出');
    return false;
  }

  // 转换为对象数组
  const dataRows = result.data.map((row) => {
    const obj: Record<string, any> = {};
    result.columns!.forEach((col, index) => {
      obj[col] = row[index];
    });
    return obj;
  });

  // 构建完整元数据
  const fullMetadata: ExportMetadata = {
    exportedAt: new Date().toISOString(),
    totalRows: result.data.length,
    totalColumns: result.columns.length,
    ...metadata,
  };

  return await exportData(dataRows, result.columns, config, fullMetadata);
}

