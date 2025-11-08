import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
  startTransition,
} from 'react';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Progress,
  Badge,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  Input,
  Slider,
  ScrollArea,
} from '@/components/ui';
import { GlideDataTable, type DataSourceType } from '@/components/ui/glide-data-table';
import { TableToolbar, type CopyFormat } from '@/components/ui/table-toolbar';
import ExportOptionsDialog, {
  type ExportOptions,
} from '@/components/query/ExportOptionsDialog';
import { exportWithNativeDialog } from '@/utils/nativeExport';
import { showMessage } from '@/utils/message';
import { safeTauriInvoke } from '@/utils/tauri';
import { useConnectionStore } from '@/store/connection';
import { toast } from 'sonner';
import logger from '@/utils/logger';
import { useQueryTranslation } from '@/hooks/useTranslation';

// 生成带时间戳的文件名
const generateTimestampedFilename = (
  baseName: string,
  format: string
): string => {
  const now = new Date();
  const timestamp = now
    .toISOString()
    .replace(/:/g, '-') // 替换冒号为连字符
    .replace(/\./g, '-') // 替换点为连字符
    .slice(0, 19); // 只保留到秒，格式：2025-07-20T09-30-45

  const extension = format === 'excel' ? 'xlsx' : format;
  return `${baseName}_${timestamp}.${extension}`;
};

import {
  Play,
  BarChart3,
  Eye,
  Brain,
  Clock,
  CheckCircle,
  TrendingUp,
  Download,
  Zap,
  Database,
  Activity,
  PieChart,
  LineChart,
  BarChart,
  Lightbulb,
  AlertTriangle,
  Info,
  Trash2,
  Settings,
  Shield,
  FileText,
  Copy,
  AreaChart,
  ScatterChart,
  Grid3x3,
  Filter,
  Radar,
  Edit2,
  Check,
  X,
  Tag,
} from 'lucide-react';
import EChartsReact from 'echarts-for-react';
import { useTheme } from '@/components/providers/ThemeProvider';
import type { QueryResult } from '@/types';
import {
  detectSQLStatementType,
  getSQLStatementCategory,
  getSQLStatementDisplayInfo,
  getResultStatsLabels,
  shouldShowFieldStatistics,
  shouldShowVisualization,
  shouldShowInsights,
} from '@/utils/sqlTypeDetector';
import { generateChartConfig, type ChartType } from '@/utils/chartConfig';

interface EnhancedResultPanelProps {
  collapsed?: boolean;
  queryResult?: QueryResult | null;
  queryResults?: QueryResult[]; // 支持多查询结果
  executedQueries?: string[];
  executionTime?: number;
  onClearResult?: () => void;
}

interface DataInsight {
  type: 'trend' | 'anomaly' | 'pattern' | 'suggestion';
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  confidence: number;
}

interface FieldStatistics {
  fieldName: string;
  dataType: string;
  nullCount: number;
  uniqueCount: number;
  min?: number | string;
  max?: number | string;
  mean?: number;
  median?: number;
}

const EnhancedResultPanel: React.FC<EnhancedResultPanelProps> = ({
  collapsed = false,
  queryResult,
  queryResults = [],
  executedQueries = [],
  executionTime = 0,
  onClearResult,
}) => {
  // 翻译钩子
  const { t: tQuery } = useQueryTranslation();

  // 获取当前连接信息
  const { connections, activeConnectionId } = useConnectionStore();
  const currentConnection = connections.find(c => c.id === activeConnectionId);

  // 确定数据源类型
  const dataSourceType: DataSourceType = useMemo(() => {
    if (!currentConnection) {
      logger.debug('⚠️ [EnhancedResultPanel] 没有当前连接，使用 generic');
      return 'generic';
    }

    const dbType = currentConnection.dbType;
    const version = currentConnection.version;

    logger.debug('🔍 [EnhancedResultPanel] 当前连接信息:', {
      dbType,
      version,
      connectionId: currentConnection.id,
      name: currentConnection.name,
    });

    if (dbType === 'iotdb') {
      logger.debug('✅ [EnhancedResultPanel] 识别为 IoTDB');
      return 'iotdb';
    }

    if (dbType === 'influxdb') {
      if (version === '1.x' || version?.includes('1.')) {
        logger.debug('✅ [EnhancedResultPanel] 识别为 InfluxDB 1.x');
        return 'influxdb1';
      } else if (version === '2.x' || version?.includes('2.')) {
        logger.debug('✅ [EnhancedResultPanel] 识别为 InfluxDB 2.x');
        return 'influxdb2';
      } else if (version === '3.x' || version?.includes('3.')) {
        logger.debug('✅ [EnhancedResultPanel] 识别为 InfluxDB 3.x');
        return 'influxdb3';
      }
      logger.debug('⚠️ [EnhancedResultPanel] InfluxDB 版本未知，默认使用 1.x');
      return 'influxdb1'; // 默认
    }

    logger.debug('⚠️ [EnhancedResultPanel] 未知数据库类型，使用 generic');
    return 'generic';
  }, [currentConnection]);

  const [activeTab, setActiveTab] = useState('executor');
  const [visualizationType, setVisualizationType] = useState<
    'line' | 'bar' | 'pie' | 'area' | 'scatter' | 'heatmap' | 'radar' | 'category-bar' | 'category-pie'
  >('line');
  const [selectedFields, setSelectedFields] = useState<string[]>([]);

  // 自定义标题和字段别名
  const [customChartTitle, setCustomChartTitle] = useState<string>('');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [fieldAliases, setFieldAliases] = useState<Record<string, string>>({});
  const [editingFieldAlias, setEditingFieldAlias] = useState<string | null>(
    null
  );

  // 饼图和雷达图的时间点选择
  const [timePointIndex, setTimePointIndex] = useState<number>(0);

  // 分类字段统计
  const [selectedCategoryField, setSelectedCategoryField] = useState<string>('');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const chartRef = useRef<any>(null);

  // 导出状态
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showStatisticsExportDialog, setShowStatisticsExportDialog] =
    useState(false);

  // 复制格式状态 - 为每个查询结果维护一个复制格式
  const [copyFormats, setCopyFormats] = useState<Record<number, CopyFormat>>({});

  // 分页状态管理
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(500);

  // 动态生成分页选项 - 根据数据量智能生成，以500为基础阶段
  const generatePaginationOptions = useCallback((totalRows: number) => {
    const options: string[] = [];

    // 如果数据量小于等于500，只显示"全部"
    if (totalRows <= 500) {
      options.push('all');
      return options;
    }

    // 始终包含500
    options.push('500');

    // 根据数据量动态添加选项
    if (totalRows > 500 && totalRows <= 1000) {
      // 500-1000: 显示 [500, 全部]
    } else if (totalRows > 1000 && totalRows <= 2000) {
      // 1000-2000: 显示 [500, 1000, 全部]
      options.push('1000');
    } else if (totalRows > 2000 && totalRows <= 5000) {
      // 2000-5000: 显示 [500, 1000, 2000, 全部]
      options.push('1000', '2000');
    } else if (totalRows > 5000) {
      // >5000: 显示 [500, 1000, 2000, 5000, 全部]
      options.push('1000', '2000', '5000');
    }

    // 始终添加"全部"选项
    options.push('all');

    return options;
  }, []);

  const { resolvedTheme } = useTheme();

  // 分页处理函数 - 完全按照 TableDataBrowser.tsx 的实现
  const handlePageChange = useCallback((page: number) => {
    startTransition(() => {
      setCurrentPage(page);
    });
  }, []);

  // 页面大小变化处理 - 完全按照 TableDataBrowser.tsx 的实现
  const handlePageSizeChange = useCallback(
    (size: string) => {
      startTransition(() => {
        const newSize = parseInt(size);
        logger.info(`📏 页面大小变更: ${pageSize} -> ${newSize}`);
        setPageSize(newSize);
        setCurrentPage(1);
      });
    },
    [pageSize]
  );

  // 主题配置生成函数
  const getThemeConfig = useCallback(() => {
    const isDark = resolvedTheme === 'dark';
    return {
      textColor: isDark ? '#e4e4e7' : '#09090b',
      backgroundColor: isDark ? '#020817' : '#ffffff',
      borderColor: isDark ? '#27272a' : '#e4e4e7',
      gridColor: isDark ? '#27272a' : '#f1f5f9',
      tooltipBgColor: isDark ? '#1f2937' : '#ffffff',
      colors: [
        '#3b82f6',
        '#10b981',
        '#f59e0b',
        '#ef4444',
        '#8b5cf6',
        '#06b6d4',
        '#84cc16',
        '#f97316',
      ],
    };
  }, [resolvedTheme]);

  // 处理多查询结果 - 优先使用queryResults，回退到单个queryResult
  const allResults = useMemo(() => {
    if (queryResults && queryResults.length > 0) {
      return queryResults;
    }
    if (queryResult) {
      return [queryResult];
    }
    return [];
  }, [queryResults, queryResult]);

  // 检测SQL语句类型
  const sqlStatementTypes = useMemo(() => {
    return executedQueries.map(query => detectSQLStatementType(query));
  }, [executedQueries]);

  // 获取主要的语句类型（如果有多个查询，取第一个）
  const primaryStatementType = sqlStatementTypes[0] || 'UNKNOWN';
  const primaryStatementCategory =
    getSQLStatementCategory(primaryStatementType);
  const primaryDisplayInfo = getSQLStatementDisplayInfo(primaryStatementType);

  // 从SQL查询中提取表名
  const extractTableName = useCallback((query: string): string => {
    if (!query) return '';

    // 匹配FROM后面的表名
    const fromMatch = query.match(/FROM\s+["`]?([^"`\s,;]+)["`]?/i);
    if (fromMatch) {
      return fromMatch[1];
    }

    // 匹配INSERT INTO后面的表名
    const insertMatch = query.match(/INSERT\s+INTO\s+["`]?([^"`\s,;]+)["`]?/i);
    if (insertMatch) {
      return insertMatch[1];
    }

    // 匹配UPDATE后面的表名
    const updateMatch = query.match(/UPDATE\s+["`]?([^"`\s,;]+)["`]?/i);
    if (updateMatch) {
      return updateMatch[1];
    }

    return '';
  }, []);

  // 解析单个查询结果
  const parseQueryResult = useCallback((result: QueryResult) => {
    if (!result?.results?.[0]?.series?.[0]) return null;

    const series = result.results[0].series[0];
    const { columns, values } = series;

    if (!columns || !values) return null;

    const data = values.map((row, index) => {
      const record: Record<string, any> = { _id: `query-${index}` };
      columns.forEach((col, colIndex) => {
        record[col] = row[colIndex];
      });
      return record;
    });

    return {
      columns,
      values,
      rowCount: values.length,
      data,
    };
  }, []);

  // 生成图表配置
  const generateChartOption = useCallback(
    (result: QueryResult, chartType: ChartType) => {
      const parsedResult = parseQueryResult(result);
      if (!parsedResult || parsedResult.rowCount === 0) return null;

      // 计算字段统计信息
      const fieldStats = parsedResult.columns.map(column => {
        const values = parsedResult.data
          .map(row => row[column])
          .filter(val => val !== null && val !== undefined);
        const firstValue = values[0];
        let dataType = 'string';
        if (typeof firstValue === 'number') {
          dataType = 'number';
        } else if (
          firstValue instanceof Date ||
          /^\d{4}-\d{2}-\d{2}/.test(String(firstValue))
        ) {
          dataType = 'datetime';
        }
        return { fieldName: column, dataType };
      });

      const timeColumn = fieldStats.find(
        stat => stat.dataType === 'datetime'
      )?.fieldName;
      const numericColumns = fieldStats
        .filter(stat => stat.dataType === 'number')
        .map(stat => stat.fieldName);
      const stringColumns = fieldStats
        .filter(stat => stat.dataType === 'string')
        .map(stat => stat.fieldName);

      // 使用新的图表配置系统
      const themeConfig = getThemeConfig();

      // 对于分类图表，使用分类字段
      if (chartType === 'category-bar' || chartType === 'category-pie') {
        return generateChartConfig(
          chartType,
          {
            timeColumn,
            numericColumns,
            selectedFields: [],
            data: parsedResult.data,
            rowCount: parsedResult.rowCount,
            customTitle: customChartTitle,
            fieldAliases,
            categoryField: selectedCategoryField || stringColumns[0],
          },
          themeConfig
        );
      }

      // 对于数值图表，使用数值字段
      const fieldsToDisplay =
        selectedFields.length > 0
          ? selectedFields.filter(f => numericColumns.includes(f))
          : numericColumns.slice(0, 3);

      return generateChartConfig(
        chartType,
        {
          timeColumn,
          numericColumns,
          selectedFields:
            fieldsToDisplay.length > 0
              ? fieldsToDisplay
              : numericColumns.slice(0, 3),
          data: parsedResult.data,
          rowCount: parsedResult.rowCount,
          customTitle: customChartTitle,
          fieldAliases,
          timeIndex: timePointIndex,
        },
        themeConfig
      );
    },
    [
      parseQueryResult,
      getThemeConfig,
      selectedFields,
      customChartTitle,
      fieldAliases,
      timePointIndex,
      selectedCategoryField,
    ]
  );

  // 自动切换到数据标签页当有查询结果时
  useEffect(() => {
    if (allResults.length > 0) {
      setActiveTab('data-0'); // 切换到第一个数据tab
    }
  }, [allResults]);

  // 当切换到饼图或雷达图时，重置时间点索引到最后一个
  useEffect(() => {
    if (
      (visualizationType === 'pie' || visualizationType === 'radar') &&
      allResults.length > 0
    ) {
      const firstResult = allResults[0];
      const parsed = parseQueryResult(firstResult);
      if (parsed && parsed.data.length > 0) {
        setTimePointIndex(parsed.data.length - 1);
      }
    }
  }, [visualizationType, allResults, parseQueryResult]);

  // 当切换活动tab时，重置时间点索引
  useEffect(() => {
    if (activeTab.startsWith('visualization-')) {
      const index = parseInt(activeTab.replace('visualization-', ''));
      if (!isNaN(index) && allResults[index]) {
        const parsed = parseQueryResult(allResults[index]);
        if (parsed && parsed.data.length > 0) {
          // 重置到该查询结果的最后一个时间点
          setTimePointIndex(Math.min(timePointIndex, parsed.data.length - 1));
        }
      }
    }
  }, [activeTab, allResults, parseQueryResult]);

  // 解析查询结果数据
  const parsedData = useMemo(() => {
    if (!queryResult?.results?.[0]?.series?.[0]) return null;

    const series = queryResult.results[0].series[0];
    const { columns, values } = series;

    if (!columns || !values) return null;

    let data = values.map((row, index) => {
      const record: Record<string, any> = { _id: `data-${index}` };
      columns.forEach((col, colIndex) => {
        record[col] = row[colIndex];
      });
      return record;
    });

    // 排序逻辑
    if (sortColumn) {
      data = [...data].sort((a, b) => {
        let aVal = a[sortColumn];
        let bVal = b[sortColumn];

        // 处理null和undefined
        if (aVal == null && bVal == null) return 0;
        if (aVal == null) return sortDirection === 'asc' ? 1 : -1;
        if (bVal == null) return sortDirection === 'asc' ? -1 : 1;

        // 时间字段特殊处理
        if (sortColumn === 'time') {
          aVal = new Date(aVal).getTime();
          bVal = new Date(bVal).getTime();
        }

        // 数字比较
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
        }

        // 字符串比较
        const aStr = String(aVal).toLowerCase();
        const bStr = String(bVal).toLowerCase();

        if (sortDirection === 'asc') {
          return aStr.localeCompare(bStr);
        } else {
          return bStr.localeCompare(aStr);
        }
      });
    }

    return {
      columns,
      values,
      rowCount: values.length,
      data,
    };
  }, [queryResult, sortColumn, sortDirection]);

  // 处理列排序
  const handleColumnSort = (column: string) => {
    if (sortColumn === column) {
      // 切换排序方向
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // 新列，默认升序
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // 导出数据函数
  const handleExportData = async (
    options: ExportOptions,
    resultIndex: number
  ) => {
    try {
      const result = allResults[resultIndex];
      if (!result) {
        showMessage.error(tQuery('resultPanel.noDataToExport'));
        return;
      }

      // 获取第一个series的数据
      const series = result.results?.[0]?.series?.[0];
      if (!series || !series.columns || !series.values) {
        showMessage.error(tQuery('resultPanel.noDataToExport'));
        return;
      }

      // 过滤掉不应该导出的列（如#序号列）
      const filteredColumns = series.columns.filter(col => col !== '#');
      const columnIndexes = filteredColumns.map(col =>
        series.columns.indexOf(col)
      );
      const filteredValues = series.values.map(row =>
        columnIndexes.map(index => row[index])
      );

      // 构造符合 QueryResult 格式的数据
      const queryResult: QueryResult = {
        results: [
          {
            series: [
              {
                name: series.name || 'query_result',
                columns: filteredColumns,
                values: filteredValues,
              },
            ],
          },
        ],
        executionTime: executionTime || 0,
        rowCount: filteredValues.length,
        // 添加兼容性字段
        columns: filteredColumns,
        data: filteredValues,
      };

      // 生成默认文件名
      const defaultTableName = series.name || `query_result_${resultIndex + 1}`;
      const defaultFilename =
        options.filename ||
        generateTimestampedFilename(defaultTableName, options.format);

      // 调试日志
      logger.info('EnhancedResultPanel导出调试:', {
        resultIndex,
        seriesName: series.name,
        defaultTableName,
        optionsFilename: options.filename,
        finalDefaultFilename: defaultFilename,
        format: options.format,
      });

      // 使用原生导出对话框
      const success = await exportWithNativeDialog(queryResult, {
        format: options.format,
        includeHeaders: options.includeHeaders,
        delimiter: options.delimiter || (options.format === 'tsv' ? '\t' : ','),
        defaultFilename,
        tableName: options.tableName || defaultTableName,
      });

      if (success) {
        showMessage.success(
          tQuery('resultPanel.dataExported', { format: options.format.toUpperCase() })
        );
        setShowExportDialog(false);
      }
    } catch (error) {
      logger.error('导出数据失败:', error);
      showMessage.error(tQuery('resultPanel.exportFailed'));
    }
  };

  // 复制数据函数 - 根据格式和数据进行复制
  const handleCopyWithFormat = useCallback(async (
    format: CopyFormat,
    columns: string[],
    rows: any[][],
    tableName: string
  ) => {
    try {
      if (rows.length === 0) {
        toast.error(tQuery('resultPanel.noDataToCopy'));
        return;
      }

      let textToCopy = '';

      switch (format) {
        case 'text':
          // 文本格式：列之间用制表符分隔
          textToCopy = `${columns.join('\t')  }\n`;
          textToCopy += rows.map(row => row.join('\t')).join('\n');
          break;

        case 'insert': {
          // INSERT语句格式
          const insertStatements = rows.map(row => {
            const values = row.map(val => {
              if (val === null || val === undefined) return 'NULL';
              if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
              return val;
            }).join(', ');
            return `INSERT INTO "${tableName}" (${columns.map(c => `"${c}"`).join(', ')}) VALUES (${values});`;
          });
          textToCopy = insertStatements.join('\n');
          break;
        }

        case 'markdown':
          // Markdown表格格式
          textToCopy = `| ${  columns.join(' | ')  } |\n`;
          textToCopy += `| ${  columns.map(() => '---').join(' | ')  } |\n`;
          textToCopy += rows.map(row => `| ${  row.join(' | ')  } |`).join('\n');
          break;

        case 'json': {
          // JSON格式
          const jsonData = rows.map(row => {
            const obj: Record<string, any> = {};
            columns.forEach((col, idx) => {
              obj[col] = row[idx];
            });
            return obj;
          });
          textToCopy = JSON.stringify(jsonData, null, 2);
          break;
        }

        case 'csv': {
          // CSV格式
          const escapeCsvValue = (val: any) => {
            if (val === null || val === undefined) return '';
            const str = String(val);
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
              return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
          };
          textToCopy = `${columns.map(escapeCsvValue).join(',')  }\n`;
          textToCopy += rows.map(row => row.map(escapeCsvValue).join(',')).join('\n');
          break;
        }

        default:
          toast.error(tQuery('resultPanel.unsupportedCopyFormat'));
          return;
      }

      // 复制到剪贴板
      await navigator.clipboard.writeText(textToCopy);

      const formatNames: Record<CopyFormat, string> = {
        text: tQuery('resultPanel.copyFormats.text'),
        insert: tQuery('resultPanel.copyFormats.insert'),
        markdown: 'Markdown',
        json: 'JSON',
        csv: 'CSV'
      };

      toast.success(tQuery('resultPanel.dataCopied', { format: formatNames[format] }), {
        description: tQuery('resultPanel.dataCopiedDescription', { rows: rows.length })
      });
    } catch (error) {
      logger.error('复制数据失败:', error);
      toast.error(tQuery('resultPanel.copyFailed'));
    }
  }, []);



  // 导出字段统计 - 支持多个查询的统计信息
  const handleExportStatistics = async (options: ExportOptions) => {
    try {
      // 检查是否有统计数据
      if (allFieldStatistics.length === 0) {
        showMessage.warning(tQuery('resultPanel.noFieldStatsToExport'));
        return;
      }

      // 定义列名
      const columns = [
        tQuery('resultPanel.fieldStatsHeaders.fieldName'),
        tQuery('resultPanel.fieldStatsHeaders.dataType'),
        tQuery('resultPanel.fieldStatsHeaders.nullCount'),
        tQuery('resultPanel.fieldStatsHeaders.uniqueCount'),
        tQuery('resultPanel.fieldStatsHeaders.minValue'),
        tQuery('resultPanel.fieldStatsHeaders.maxValue'),
        tQuery('resultPanel.fieldStatsHeaders.avgValue'),
        tQuery('resultPanel.fieldStatsHeaders.medianValue'),
      ];

      // 为每个查询创建一个 series（工作表）
      const series = allFieldStatistics.map((queryStats, index) => {
        const values = queryStats.statistics.map(stat => [
          stat.fieldName,
          stat.dataType,
          stat.nullCount,
          stat.uniqueCount,
          stat.min !== undefined ? String(stat.min) : '-',
          stat.max !== undefined ? String(stat.max) : '-',
          stat.mean !== undefined ? stat.mean.toFixed(2) : '-',
          stat.median !== undefined ? stat.median.toFixed(2) : '-',
        ]);

        return {
          name: tQuery('resultPanel.queryStats', { index: index + 1 }),
          columns,
          values,
        };
      });

      // 计算总行数
      const totalRows = allFieldStatistics.reduce(
        (sum, q) => sum + q.statistics.length,
        0
      );

      const statisticsResult: QueryResult = {
        results: [
          {
            series,
          },
        ],
        executionTime: 0,
        rowCount: totalRows,
        columns,
        data: [], // 多工作表导出时不使用这个字段
      };

      // 生成默认文件名
      const defaultFilename = generateTimestampedFilename(
        'field_statistics',
        options.format
      );

      // 使用原生导出对话框
      const success = await exportWithNativeDialog(statisticsResult, {
        format: options.format,
        includeHeaders: options.includeHeaders,
        delimiter: options.delimiter || (options.format === 'tsv' ? '\t' : ','),
        defaultFilename,
        tableName: 'field_statistics',
      });

      if (success) {
        showMessage.success(
          tQuery('resultPanel.fieldStatsExported', { format: options.format.toUpperCase() })
        );
        setShowStatisticsExportDialog(false);
      }
    } catch (error) {
      logger.error('导出字段统计失败:', error);
      showMessage.error(tQuery('resultPanel.exportFieldStatsFailed'));
    }
  };

  // 计算字段统计信息 - 单个查询结果（保留用于向后兼容）
  const fieldStatistics = useMemo((): FieldStatistics[] => {
    if (!parsedData) return [];

    return parsedData.columns.map(column => {
      const values = parsedData.data
        .map(row => row[column])
        .filter(val => val !== null && val !== undefined);
      const nullCount = parsedData.rowCount - values.length;
      const uniqueValues = new Set(values);

      // 判断数据类型
      const firstValue = values[0];
      let dataType = 'string';
      if (typeof firstValue === 'number') {
        dataType = 'number';
      } else if (typeof firstValue === 'boolean') {
        dataType = 'boolean';
      } else if (
        firstValue instanceof Date ||
        /^\d{4}-\d{2}-\d{2}/.test(String(firstValue))
      ) {
        dataType = 'datetime';
      }

      const stat: FieldStatistics = {
        fieldName: column,
        dataType,
        nullCount,
        uniqueCount: uniqueValues.size,
      };

      // 计算数值统计
      if (dataType === 'number') {
        const numericValues = values as number[];
        stat.min = Math.min(...numericValues);
        stat.max = Math.max(...numericValues);
        stat.mean =
          numericValues.reduce((sum, val) => sum + val, 0) /
          numericValues.length;

        const sorted = [...numericValues].sort((a, b) => a - b);
        stat.median =
          sorted.length % 2 === 0
            ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
            : sorted[Math.floor(sorted.length / 2)];
      }

      return stat;
    });
  }, [parsedData]);

  // 计算所有查询结果的字段统计信息
  const allFieldStatistics = useMemo((): Array<{
    queryIndex: number;
    queryText: string;
    statistics: FieldStatistics[];
    rowCount: number;
  }> => {
    return allResults.map((result, index) => {
      const parsed = parseQueryResult(result);
      if (!parsed) {
        return {
          queryIndex: index,
          queryText: executedQueries[index] || tQuery('resultPanel.queryLabel', { index: index + 1 }),
          statistics: [],
          rowCount: 0,
        };
      }

      const stats = parsed.columns.map(column => {
        const values = parsed.data
          .map(row => row[column])
          .filter(val => val !== null && val !== undefined);
        const nullCount = parsed.rowCount - values.length;
        const uniqueValues = new Set(values);

        // 判断数据类型
        const firstValue = values[0];
        let dataType = 'string';
        if (typeof firstValue === 'number') {
          dataType = 'number';
        } else if (typeof firstValue === 'boolean') {
          dataType = 'boolean';
        } else if (
          firstValue instanceof Date ||
          /^\d{4}-\d{2}-\d{2}/.test(String(firstValue))
        ) {
          dataType = 'datetime';
        }

        const stat: FieldStatistics = {
          fieldName: column,
          dataType,
          nullCount,
          uniqueCount: uniqueValues.size,
        };

        // 计算数值统计
        if (dataType === 'number') {
          const numericValues = values as number[];
          stat.min = Math.min(...numericValues);
          stat.max = Math.max(...numericValues);
          stat.mean =
            numericValues.reduce((sum, val) => sum + val, 0) /
            numericValues.length;

          const sorted = [...numericValues].sort((a, b) => a - b);
          stat.median =
            sorted.length % 2 === 0
              ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
              : sorted[Math.floor(sorted.length / 2)];
        }

        return stat;
      });

      return {
        queryIndex: index,
        queryText: executedQueries[index] || tQuery('resultPanel.queryLabel', { index: index + 1 }),
        statistics: stats,
        rowCount: parsed.rowCount,
      };
    });
  }, [allResults, executedQueries, parseQueryResult]);

  // 自动选择默认字段（当数据变化时）
  useEffect(() => {
    if (parsedData && fieldStatistics.length > 0) {
      const numericFields = fieldStatistics
        .filter(stat => stat.dataType === 'number')
        .map(stat => stat.fieldName);

      // 默认选择前3个数值字段
      setSelectedFields(numericFields.slice(0, 3));
    }
  }, [parsedData, fieldStatistics]);

  // 处理字段选择
  const handleFieldToggle = useCallback((fieldName: string) => {
    setSelectedFields(prev => {
      if (prev.includes(fieldName)) {
        // 取消选择，但至少保留一个字段
        return prev.length > 1 ? prev.filter(f => f !== fieldName) : prev;
      } else {
        // 添加选择
        return [...prev, fieldName];
      }
    });
  }, []);

  // 处理字段别名设置
  const handleSetFieldAlias = useCallback(
    (fieldName: string, alias: string) => {
      setFieldAliases(prev => {
        if (alias.trim() === '') {
          // 如果别名为空，删除别名
          const newAliases = { ...prev };
          delete newAliases[fieldName];
          return newAliases;
        }
        return {
          ...prev,
          [fieldName]: alias.trim(),
        };
      });
    },
    []
  );

  // 获取字段显示名称（别名或原名）
  const getFieldDisplayName = useCallback(
    (fieldName: string) => {
      return fieldAliases[fieldName] || fieldName;
    },
    [fieldAliases]
  );

  // 获取可用的数值字段
  const availableNumericFields = useMemo(() => {
    return fieldStatistics
      .filter(stat => stat.dataType === 'number')
      .map(stat => stat.fieldName);
  }, [fieldStatistics]);

  // 生成数据洞察
  const dataInsights = useMemo((): DataInsight[] => {
    if (!parsedData || parsedData.rowCount === 0) return [];

    const insights: DataInsight[] = [];

    // 1. 查询性能分析
    if (executionTime > 5000) {
      insights.push({
        type: 'suggestion',
        title: tQuery('resultPanel.performanceSlow.title'),
        description: tQuery('resultPanel.performanceSlow.description', { seconds: (executionTime / 1000).toFixed(2) }),
        severity: 'high',
        confidence: 1.0,
      });
    } else if (executionTime > 1000) {
      insights.push({
        type: 'suggestion',
        title: tQuery('resultPanel.performanceOptimizable.title'),
        description: tQuery('resultPanel.performanceOptimizable.description', { seconds: (executionTime / 1000).toFixed(2) }),
        severity: 'low',
        confidence: 0.8,
      });
    }

    // 2. 数据量分析和建议
    if (parsedData.rowCount > 50000) {
      insights.push({
        type: 'suggestion',
        title: tQuery('resultPanel.largeDataAggregation.title'),
        description: tQuery('resultPanel.largeDataAggregation.description', { rows: parsedData.rowCount.toLocaleString() }),
        severity: 'high',
        confidence: 0.95,
      });
    } else if (parsedData.rowCount > 10000) {
      insights.push({
        type: 'suggestion',
        title: tQuery('resultPanel.largeDataset.title'),
        description: tQuery('resultPanel.largeDataset.description', { rows: parsedData.rowCount.toLocaleString() }),
        severity: 'medium',
        confidence: 0.85,
      });
    } else if (parsedData.rowCount < 10) {
      insights.push({
        type: 'pattern',
        title: tQuery('resultPanel.smallDataset.title'),
        description: tQuery('resultPanel.smallDataset.description', { rows: parsedData.rowCount }),
        severity: 'low',
        confidence: 0.7,
      });
    }

    // 3. 数据质量分析
    const highNullFields = fieldStatistics.filter(
      stat => stat.nullCount / parsedData.rowCount > 0.5
    );
    if (highNullFields.length > 0) {
      insights.push({
        type: 'anomaly',
        title: tQuery('resultPanel.dataQuality.highNullFields.title'),
        description: tQuery('resultPanel.dataQuality.highNullFields.description', {
          fields: highNullFields.map(f => f.fieldName).join(', ')
        }),
        severity: 'high',
        confidence: 1.0,
      });
    } else {
      const mediumNullFields = fieldStatistics.filter(
        stat => stat.nullCount / parsedData.rowCount > 0.2 && stat.nullCount > 0
      );
      if (mediumNullFields.length > 0) {
        insights.push({
          type: 'pattern',
          title: tQuery('resultPanel.dataQuality.mediumNullFields.title'),
          description: tQuery('resultPanel.dataQuality.mediumNullFields.description', {
            fields: mediumNullFields.map(f => f.fieldName).join(', ')
          }),
          severity: 'medium',
          confidence: 0.9,
        });
      }
    }

    // 4. 时序数据分析
    const timeColumn = fieldStatistics.find(
      stat => stat.dataType === 'datetime'
    );
    if (timeColumn && parsedData.rowCount > 1) {
      // 分析时间跨度
      const timeValues = parsedData.data
        .map(row => row[timeColumn.fieldName])
        .filter(val => val !== null && val !== undefined)
        .map(val => new Date(val).getTime())
        .sort((a, b) => a - b);

      if (timeValues.length > 1) {
        const timeSpan = timeValues[timeValues.length - 1] - timeValues[0];
        const timeSpanHours = timeSpan / (1000 * 60 * 60);
        const timeSpanDays = timeSpan / (1000 * 60 * 60 * 24);

        if (timeSpanDays > 30) {
          insights.push({
            type: 'pattern',
            title: tQuery('resultPanel.timeSeries.longTimeSpan.title'),
            description: tQuery('resultPanel.timeSeries.longTimeSpan.description', {
              days: timeSpanDays.toFixed(1)
            }),
            severity: 'medium',
            confidence: 0.9,
          });
        } else if (timeSpanHours < 1) {
          insights.push({
            type: 'pattern',
            title: tQuery('resultPanel.timeSeries.shortTimeSpan.title'),
            description: tQuery('resultPanel.timeSeries.shortTimeSpan.description', {
              minutes: (timeSpanHours * 60).toFixed(1)
            }),
            severity: 'low',
            confidence: 0.85,
          });
        }

        // 分析数据密度（采样率）
        if (timeValues.length > 2) {
          const intervals = [];
          for (let i = 1; i < Math.min(timeValues.length, 100); i++) {
            intervals.push(timeValues[i] - timeValues[i - 1]);
          }
          const avgInterval =
            intervals.reduce((a, b) => a + b, 0) / intervals.length;
          const avgIntervalSeconds = avgInterval / 1000;

          if (avgIntervalSeconds < 1) {
            insights.push({
              type: 'pattern',
              title: tQuery('resultPanel.timeSeries.highFrequencySampling.title'),
              description: tQuery('resultPanel.timeSeries.highFrequencySampling.description', {
                ms: (avgIntervalSeconds * 1000).toFixed(0)
              }),
              severity: 'low',
              confidence: 0.8,
            });
          } else if (avgIntervalSeconds < 60) {
            insights.push({
              type: 'pattern',
              title: tQuery('resultPanel.timeSeries.secondLevelSampling.title'),
              description: tQuery('resultPanel.timeSeries.secondLevelSampling.description', {
                seconds: avgIntervalSeconds.toFixed(1)
              }),
              severity: 'low',
              confidence: 0.8,
            });
          } else if (avgIntervalSeconds < 3600) {
            insights.push({
              type: 'pattern',
              title: tQuery('resultPanel.timeSeries.minuteLevelSampling.title'),
              description: tQuery('resultPanel.timeSeries.minuteLevelSampling.description', {
                minutes: (avgIntervalSeconds / 60).toFixed(1)
              }),
              severity: 'low',
              confidence: 0.8,
            });
          }
        }
      }
    }

    // 5. 数值字段趋势分析
    const numericFields = fieldStatistics.filter(
      stat => stat.dataType === 'number' && stat.mean !== undefined
    );
    if (numericFields.length > 0 && timeColumn && parsedData.rowCount > 10) {
      numericFields.forEach(field => {
        const values = parsedData.data
          .map(row => row[field.fieldName])
          .filter(val => typeof val === 'number');

        if (values.length > 10) {
          // 计算趋势（简单线性回归）
          const n = Math.min(values.length, 100); // 只取前100个点避免计算量过大
          const recentValues = values.slice(-n);
          const avgValue = recentValues.reduce((a, b) => a + b, 0) / n;
          const firstHalf = recentValues.slice(0, Math.floor(n / 2));
          const secondHalf = recentValues.slice(Math.floor(n / 2));
          const firstAvg =
            firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
          const secondAvg =
            secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
          const trend = ((secondAvg - firstAvg) / firstAvg) * 100;

          if (Math.abs(trend) > 20) {
            insights.push({
              type: 'trend',
              title: tQuery('resultPanel.numericFields.trendAnalysis.title', {
                field: field.fieldName,
                direction: trend > 0 ? tQuery('resultPanel.trends.up') : tQuery('resultPanel.trends.down')
              }),
              description: tQuery('resultPanel.numericFields.trendAnalysis.description', {
                field: field.fieldName,
                direction: trend > 0 ? tQuery('resultPanel.trends.up') : tQuery('resultPanel.trends.down'),
                percent: Math.abs(trend).toFixed(1)
              }),
              severity: 'medium',
              confidence: 0.85,
            });
          }

          // 检测异常值（超出3倍标准差）
          const stdDev = Math.sqrt(
            recentValues.reduce(
              (sum, val) => sum + Math.pow(val - avgValue, 2),
              0
            ) / n
          );
          const outliers = recentValues.filter(
            val => Math.abs(val - avgValue) > 3 * stdDev
          );
          if (outliers.length > 0 && outliers.length / n < 0.1) {
            insights.push({
              type: 'anomaly',
              title: tQuery('resultPanel.numericFields.anomalyDetected.title', {
                field: field.fieldName
              }),
              description: tQuery('resultPanel.numericFields.anomalyDetected.description', {
                count: outliers.length
              }),
              severity: 'medium',
              confidence: 0.75,
            });
          }
        }
      });
    }

    // 6. 字段唯一性分析
    const lowCardinalityFields = fieldStatistics.filter(
      stat =>
        stat.uniqueCount < 10 &&
        stat.uniqueCount > 1 &&
        stat.dataType !== 'boolean'
    );
    if (lowCardinalityFields.length > 0) {
      insights.push({
        type: 'pattern',
        title: tQuery('resultPanel.dataQuality.lowCardinality.title'),
        description: tQuery('resultPanel.dataQuality.lowCardinality.description', {
          fields: lowCardinalityFields.map(f => f.fieldName).join(', ')
        }),
        severity: 'low',
        confidence: 0.9,
      });
    }

    return insights;
  }, [parsedData, fieldStatistics, executionTime]);

  // 为所有查询生成数据洞察
  const allDataInsights = useMemo((): Array<{
    queryIndex: number;
    queryText: string;
    insights: DataInsight[];
  }> => {
    return allResults.map((result, index) => {
      const parsed = parseQueryResult(result);
      if (!parsed || parsed.rowCount === 0) {
        return {
          queryIndex: index,
          queryText: executedQueries[index] || tQuery('resultPanel.queryLabel', { index: index + 1 }),
          insights: [],
        };
      }

      // 计算该查询的字段统计
      const queryFieldStats = parsed.columns.map(column => {
        const values = parsed.data
          .map(row => row[column])
          .filter(val => val !== null && val !== undefined);
        const nullCount = parsed.rowCount - values.length;
        const uniqueValues = new Set(values);

        const firstValue = values[0];
        let dataType = 'string';
        if (typeof firstValue === 'number') {
          dataType = 'number';
        } else if (typeof firstValue === 'boolean') {
          dataType = 'boolean';
        } else if (
          firstValue instanceof Date ||
          /^\d{4}-\d{2}-\d{2}/.test(String(firstValue))
        ) {
          dataType = 'datetime';
        }

        const stat: FieldStatistics = {
          fieldName: column,
          dataType,
          nullCount,
          uniqueCount: uniqueValues.size,
        };

        if (dataType === 'number') {
          const numericValues = values as number[];
          stat.min = Math.min(...numericValues);
          stat.max = Math.max(...numericValues);
          stat.mean =
            numericValues.reduce((sum, val) => sum + val, 0) /
            numericValues.length;

          const sorted = [...numericValues].sort((a, b) => a - b);
          stat.median =
            sorted.length % 2 === 0
              ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
              : sorted[Math.floor(sorted.length / 2)];
        }

        return stat;
      });

      // 生成该查询的洞察
      const queryInsights: DataInsight[] = [];
      const queryExecutionTime = executionTime / allResults.length; // 简化处理

      // 1. 查询性能分析
      if (queryExecutionTime > 5000) {
        queryInsights.push({
          type: 'suggestion',
          title: tQuery('resultPanel.performanceSlowApprox.title'),
          description: tQuery('resultPanel.performanceSlowApprox.description', { seconds: (queryExecutionTime / 1000).toFixed(2) }),
          severity: 'high',
          confidence: 1.0,
        });
      } else if (queryExecutionTime > 1000) {
        queryInsights.push({
          type: 'suggestion',
          title: tQuery('resultPanel.performanceOptimizableApprox.title'),
          description: tQuery('resultPanel.performanceOptimizableApprox.description', { seconds: (queryExecutionTime / 1000).toFixed(2) }),
          severity: 'low',
          confidence: 0.8,
        });
      } else if (queryExecutionTime < 100) {
        queryInsights.push({
          type: 'pattern',
          title: tQuery('resultPanel.performanceExcellent.title'),
          description: tQuery('resultPanel.performanceExcellent.description', { ms: queryExecutionTime.toFixed(0) }),
          severity: 'low',
          confidence: 0.9,
        });
      }

      // 2. 数据量分析
      if (parsed.rowCount > 50000) {
        queryInsights.push({
          type: 'suggestion',
          title: tQuery('resultPanel.largeDataAggregationSimple.title'),
          description: tQuery('resultPanel.largeDataAggregationSimple.description', { rows: parsed.rowCount.toLocaleString() }),
          severity: 'high',
          confidence: 0.95,
        });
      } else if (parsed.rowCount > 10000) {
        queryInsights.push({
          type: 'suggestion',
          title: tQuery('resultPanel.largeDatasetSimple.title'),
          description: tQuery('resultPanel.largeDatasetSimple.description', { rows: parsed.rowCount.toLocaleString() }),
          severity: 'medium',
          confidence: 0.85,
        });
      } else if (parsed.rowCount < 10) {
        queryInsights.push({
          type: 'pattern',
          title: tQuery('resultPanel.smallDataset.title'),
          description: tQuery('resultPanel.smallDatasetSimple.description', { rows: parsed.rowCount }),
          severity: 'low',
          confidence: 0.7,
        });
      }

      // 3. 数据质量分析
      const highNullFields = queryFieldStats.filter(
        stat => stat.nullCount / parsed.rowCount > 0.5
      );
      if (highNullFields.length > 0) {
        queryInsights.push({
          type: 'anomaly',
          title: tQuery('resultPanel.dataQuality.highNullFields.title'),
          description: tQuery('resultPanel.dataQuality.highNullFields.descriptionShort', {
            fields: highNullFields.map(f => f.fieldName).join(', ')
          }),
          severity: 'high',
          confidence: 1.0,
        });
      } else {
        const mediumNullFields = queryFieldStats.filter(
          stat => stat.nullCount / parsed.rowCount > 0.2 && stat.nullCount > 0
        );
        if (mediumNullFields.length > 0) {
          queryInsights.push({
            type: 'pattern',
            title: tQuery('resultPanel.dataQuality.mediumNullFields.title'),
            description: tQuery('resultPanel.dataQuality.mediumNullFields.descriptionShort', {
              fields: mediumNullFields.map(f => f.fieldName).join(', ')
            }),
            severity: 'medium',
            confidence: 0.9,
          });
        }
      }

      // 检测完全无空值的情况（数据质量好）
      const noNullFields = queryFieldStats.filter(stat => stat.nullCount === 0);
      if (noNullFields.length === queryFieldStats.length && queryFieldStats.length > 0) {
        queryInsights.push({
          type: 'pattern',
          title: tQuery('resultPanel.dataQuality.noNullFields.title'),
          description: tQuery('resultPanel.dataQuality.noNullFields.description'),
          severity: 'low',
          confidence: 1.0,
        });
      }

      // 4. 时序数据分析
      const timeColumn = queryFieldStats.find(
        stat => stat.dataType === 'datetime'
      );
      if (timeColumn && parsed.rowCount > 1) {
        const timeValues = parsed.data
          .map(row => row[timeColumn.fieldName])
          .filter(val => val !== null && val !== undefined)
          .map(val => new Date(val).getTime())
          .sort((a, b) => a - b);

        if (timeValues.length > 1) {
          const timeSpan = timeValues[timeValues.length - 1] - timeValues[0];
          const timeSpanDays = timeSpan / (1000 * 60 * 60 * 24);
          const timeSpanHours = timeSpan / (1000 * 60 * 60);

          if (timeSpanDays > 365) {
            queryInsights.push({
              type: 'pattern',
              title: tQuery('resultPanel.timeSeries.veryLongTimeSpan.title'),
              description: tQuery('resultPanel.timeSeries.veryLongTimeSpan.description', {
                years: (timeSpanDays / 365).toFixed(1)
              }),
              severity: 'medium',
              confidence: 0.95,
            });
          } else if (timeSpanDays > 30) {
            queryInsights.push({
              type: 'pattern',
              title: tQuery('resultPanel.timeSeries.longTimeSpan.title'),
              description: tQuery('resultPanel.timeSeries.longTimeSpan.descriptionShort', {
                days: timeSpanDays.toFixed(1)
              }),
              severity: 'medium',
              confidence: 0.9,
            });
          } else if (timeSpanHours < 1) {
            queryInsights.push({
              type: 'pattern',
              title: tQuery('resultPanel.timeSeries.shortTimeSpan.title'),
              description: tQuery('resultPanel.timeSeries.shortTimeSpan.description', {
                minutes: (timeSpanHours * 60).toFixed(1)
              }),
              severity: 'low',
              confidence: 0.85,
            });
          }

          // 分析数据采样率
          if (timeValues.length > 2) {
            const intervals = [];
            for (let i = 1; i < Math.min(timeValues.length, 100); i++) {
              intervals.push(timeValues[i] - timeValues[i - 1]);
            }
            const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
            const avgIntervalSeconds = avgInterval / 1000;

            if (avgIntervalSeconds < 1) {
              queryInsights.push({
                type: 'pattern',
                title: tQuery('resultPanel.timeSeries.highFrequencySampling.title'),
                description: tQuery('resultPanel.timeSeries.highFrequencySampling.description', {
                  ms: (avgIntervalSeconds * 1000).toFixed(0)
                }),
                severity: 'low',
                confidence: 0.8,
              });
            } else if (avgIntervalSeconds < 60) {
              queryInsights.push({
                type: 'pattern',
                title: tQuery('resultPanel.timeSeries.secondLevelSampling.title'),
                description: tQuery('resultPanel.timeSeries.secondLevelSampling.description', {
                  seconds: avgIntervalSeconds.toFixed(1)
                }),
                severity: 'low',
                confidence: 0.8,
              });
            } else if (avgIntervalSeconds < 3600) {
              queryInsights.push({
                type: 'pattern',
                title: tQuery('resultPanel.timeSeries.minuteLevelSampling.title'),
                description: tQuery('resultPanel.timeSeries.minuteLevelSampling.description', {
                  minutes: (avgIntervalSeconds / 60).toFixed(1)
                }),
                severity: 'low',
                confidence: 0.8,
              });
            } else if (avgIntervalSeconds < 86400) {
              queryInsights.push({
                type: 'pattern',
                title: tQuery('resultPanel.timeSeries.hourLevelSampling.title'),
                description: tQuery('resultPanel.timeSeries.hourLevelSampling.description', {
                  hours: (avgIntervalSeconds / 3600).toFixed(1)
                }),
                severity: 'low',
                confidence: 0.8,
              });
            }

            // 检测采样间隔不均匀
            const stdDev = Math.sqrt(
              intervals.reduce((sum, val) => sum + Math.pow(val - avgInterval, 2), 0) / intervals.length
            );
            const coefficientOfVariation = stdDev / avgInterval;
            if (coefficientOfVariation > 0.5) {
              queryInsights.push({
                type: 'anomaly',
                title: tQuery('resultPanel.timeSeries.unevenSampling.title'),
                description: tQuery('resultPanel.timeSeries.unevenSampling.description', {
                  cv: (coefficientOfVariation * 100).toFixed(1)
                }),
                severity: 'medium',
                confidence: 0.75,
              });
            }
          }
        }
      }

      // 5. 数值字段分析
      const numericFields = queryFieldStats.filter(stat => stat.dataType === 'number');
      if (numericFields.length > 0) {
        numericFields.forEach(field => {
          const values = parsed.data
            .map(row => row[field.fieldName])
            .filter(val => typeof val === 'number');

          if (values.length > 0) {
            const min = Math.min(...values);
            const max = Math.max(...values);
            const avg = values.reduce((a, b) => a + b, 0) / values.length;

            // 检测零值
            const zeroCount = values.filter(v => v === 0).length;
            if (zeroCount / values.length > 0.5) {
              queryInsights.push({
                type: 'pattern',
                title: tQuery('resultPanel.numericFields.manyZeros.title', {
                  field: field.fieldName
                }),
                description: tQuery('resultPanel.numericFields.manyZeros.description', {
                  field: field.fieldName,
                  percent: ((zeroCount / values.length) * 100).toFixed(1)
                }),
                severity: 'medium',
                confidence: 0.85,
              });
            }

            // 检测负值（对于某些场景可能异常）
            const negativeCount = values.filter(v => v < 0).length;
            if (negativeCount > 0 && negativeCount / values.length < 0.1) {
              queryInsights.push({
                type: 'anomaly',
                title: tQuery('resultPanel.numericFields.hasNegatives.title', {
                  field: field.fieldName
                }),
                description: tQuery('resultPanel.numericFields.hasNegatives.description', {
                  field: field.fieldName,
                  count: negativeCount,
                  percent: ((negativeCount / values.length) * 100).toFixed(1)
                }),
                severity: 'medium',
                confidence: 0.7,
              });
            }

            // 检测数值范围异常
            const range = max - min;
            if (range === 0 && values.length > 1) {
              queryInsights.push({
                type: 'pattern',
                title: tQuery('resultPanel.numericFields.constantField.title', {
                  field: field.fieldName
                }),
                description: tQuery('resultPanel.numericFields.constantField.description', {
                  field: field.fieldName,
                  value: min
                }),
                severity: 'low',
                confidence: 1.0,
              });
            } else if (range > 0) {
              // 计算变异系数
              const stdDev = Math.sqrt(
                values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / values.length
              );
              const cv = stdDev / Math.abs(avg);

              if (cv > 2) {
                queryInsights.push({
                  type: 'pattern',
                  title: tQuery('resultPanel.highVariation.title', { field: field.fieldName }),
                  description: tQuery('resultPanel.highVariation.description', {
                    field: field.fieldName,
                    cv: cv.toFixed(2),
                    min: min.toFixed(2),
                    max: max.toFixed(2)
                  }),
                  severity: 'low',
                  confidence: 0.8,
                });
              }
            }
          }
        });
      }

      // 6. 字段统计分析
      if (queryFieldStats.length > 20) {
        queryInsights.push({
          type: 'suggestion',
          title: tQuery('resultPanel.tooManyFields.title'),
          description: tQuery('resultPanel.tooManyFields.description', { count: queryFieldStats.length }),
          severity: 'low',
          confidence: 0.85,
        });
      }

      // 检测低基数字段（适合分组）
      const lowCardinalityFields = queryFieldStats.filter(
        stat => stat.uniqueCount < 10 && stat.uniqueCount > 1 && stat.dataType !== 'boolean'
      );
      if (lowCardinalityFields.length > 0) {
        queryInsights.push({
          type: 'suggestion',
          title: tQuery('resultPanel.categoricalFields.title'),
          description: tQuery('resultPanel.categoricalFields.description', {
            fields: lowCardinalityFields.map(f => f.fieldName).join(', ')
          }),
          severity: 'low',
          confidence: 0.9,
        });
      }

      // 检测高基数字段
      const highCardinalityFields = queryFieldStats.filter(
        stat => stat.uniqueCount === parsed.rowCount && parsed.rowCount > 100
      );
      if (highCardinalityFields.length > 0) {
        queryInsights.push({
          type: 'pattern',
          title: tQuery('resultPanel.uniqueIdentifierFields.title'),
          description: tQuery('resultPanel.uniqueIdentifierFields.description', {
            fields: highCardinalityFields.map(f => f.fieldName).join(', ')
          }),
          severity: 'low',
          confidence: 0.95,
        });
      }

      // 7. 数据趋势分析（针对数值字段）
      if (numericFields.length > 0 && timeColumn && parsed.rowCount > 10) {
        numericFields.slice(0, 3).forEach(field => {
          const values = parsed.data
            .map(row => row[field.fieldName])
            .filter(val => typeof val === 'number');

          if (values.length > 10) {
            // 简单趋势分析：比较前半部分和后半部分的平均值
            const n = Math.min(values.length, 100);
            const recentValues = values.slice(-n);
            const firstHalf = recentValues.slice(0, Math.floor(n / 2));
            const secondHalf = recentValues.slice(Math.floor(n / 2));
            const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
            const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
            const trend = ((secondAvg - firstAvg) / Math.abs(firstAvg)) * 100;

            if (Math.abs(trend) > 50) {
              queryInsights.push({
                type: 'trend',
                title: tQuery(trend > 0 ? 'resultPanel.significantTrendUp.title' : 'resultPanel.significantTrendDown.title', {
                  field: field.fieldName
                }),
                description: tQuery(trend > 0 ? 'resultPanel.significantTrendUp.description' : 'resultPanel.significantTrendDown.description', {
                  field: field.fieldName,
                  percent: Math.abs(trend).toFixed(1)
                }),
                severity: 'high',
                confidence: 0.85,
              });
            } else if (Math.abs(trend) > 20) {
              queryInsights.push({
                type: 'trend',
                title: tQuery(trend > 0 ? 'resultPanel.trendUp.title' : 'resultPanel.trendDown.title', {
                  field: field.fieldName
                }),
                description: tQuery(trend > 0 ? 'resultPanel.trendUp.description' : 'resultPanel.trendDown.description', {
                  field: field.fieldName,
                  percent: Math.abs(trend).toFixed(1)
                }),
                severity: 'medium',
                confidence: 0.8,
              });
            }

            // 检测异常值
            const avgValue = recentValues.reduce((a, b) => a + b, 0) / n;
            const stdDev = Math.sqrt(
              recentValues.reduce((sum, val) => sum + Math.pow(val - avgValue, 2), 0) / n
            );
            const outliers = recentValues.filter(val => Math.abs(val - avgValue) > 3 * stdDev);

            if (outliers.length > 0 && outliers.length / n < 0.05) {
              queryInsights.push({
                type: 'anomaly',
                title: tQuery('resultPanel.outliers.title', { field: field.fieldName }),
                description: tQuery('resultPanel.outliers.description', {
                  field: field.fieldName,
                  count: outliers.length,
                  percent: ((outliers.length / n) * 100).toFixed(1)
                }),
                severity: 'medium',
                confidence: 0.75,
              });
            }
          }
        });
      }

      // 按照置信度从低到高排序
      const sortedInsights = queryInsights.sort((a, b) => a.confidence - b.confidence);

      return {
        queryIndex: index,
        queryText: executedQueries[index] || tQuery('resultPanel.queryLabel', { index: index + 1 }),
        insights: sortedInsights,
      };
    });
  }, [allResults, executedQueries, executionTime, parseQueryResult]);

  // 生成可视化图表配置
  const chartOption = useMemo(() => {
    if (!parsedData || parsedData.rowCount === 0) return null;

    const themeConfig = getThemeConfig();
    const timeColumn = fieldStatistics.find(
      stat => stat.dataType === 'datetime'
    )?.fieldName;
    const numericColumns = fieldStatistics
      .filter(stat => stat.dataType === 'number')
      .map(stat => stat.fieldName);

    // 使用选中的字段，如果没有选中则使用所有数值字段
    const fieldsToDisplay =
      selectedFields.length > 0
        ? selectedFields.filter(f => numericColumns.includes(f))
        : numericColumns.slice(0, 3);

    // 使用新的图表配置工具
    return generateChartConfig(
      visualizationType as ChartType,
      {
        timeColumn,
        numericColumns,
        selectedFields: fieldsToDisplay,
        data: parsedData.data,
        rowCount: parsedData.rowCount,
      },
      themeConfig
    );
  }, [
    parsedData,
    fieldStatistics,
    visualizationType,
    selectedFields,
    getThemeConfig,
  ]);

  // 导出图表功能
  const handleExportChart = useCallback(async () => {
    if (!chartRef.current) {
      showMessage.error(tQuery('resultPanel.chartNotFound'));
      return;
    }

    try {
      const chartInstance = chartRef.current.getEchartsInstance();
      if (!chartInstance) {
        showMessage.error(tQuery('resultPanel.echartsNotFound'));
        return;
      }

      // 获取PNG格式的图表数据
      const dataURL = chartInstance.getDataURL({
        type: 'png',
        pixelRatio: 2,
        backgroundColor: '#fff',
      });

      // 移除data URL前缀，获取base64数据
      const base64Data = dataURL.split(',')[1];

      // 使用Tauri原生保存对话框
      const timestamp = new Date()
        .toISOString()
        .replace(/:/g, '-')
        .slice(0, 19);
      const defaultFilename = `chart_${timestamp}.png`;

      // 使用safeTauriInvokeOptional以处理用户取消的情况（返回null）
      const { safeTauriInvokeOptional } = await import('@/utils/tauri');
      const result = await safeTauriInvokeOptional<{
        path: string;
        name: string;
      }>('save_file_dialog', {
        params: {
          default_path: defaultFilename,
          filters: [
            {
              name: 'PNG 图片',
              extensions: ['png'],
            },
          ],
        },
      });

      if (!result || !result.path) {
        // 用户取消了保存，不显示错误消息
        return;
      }

      // 保存文件 - PNG是二进制格式，使用base64字符串
      await safeTauriInvoke('write_binary_file', {
        path: result.path,
        data: base64Data,
      });

      showMessage.success(tQuery('resultPanel.chartExported'));
    } catch (error) {
      logger.error('导出图表失败:', error);
      showMessage.error(tQuery('resultPanel.chartExportFailed', { error: String(error) }));
    }
  }, [tQuery]);

  if (collapsed) {
    return (
      <div className='h-full flex items-center justify-center text-muted-foreground'>
        <BarChart3 className='w-4 h-4' />
      </div>
    );
  }

  return (
    <div className='h-full bg-background'>
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className='h-full flex flex-col'
      >
        {/* 可滚动的Tab列表 - 凹陷效果 */}
        <div className='flex-shrink-0 w-full border-b overflow-x-auto overflow-y-hidden shadow-[inset_0_1px_3px_rgba(0,0,0,0.08)] dark:shadow-[inset_0_1px_3px_rgba(0,0,0,0.25)]'>
          <TabsList className='inline-flex h-8 items-center justify-start rounded-none bg-muted/30 p-1 text-muted-foreground w-max'>
            {/* 执行器tab */}
            <TabsTrigger
              value='executor'
              className='flex items-center gap-1 px-3 py-1 text-xs flex-shrink-0'
            >
              <Play className='w-3 h-3' />
              {tQuery('resultPanel.tabs.executor')}
            </TabsTrigger>

          {/* 动态数据tab - 根据SQL语句类型显示不同的tab */}
          {(() => {
            // 将结果按类型分组
            const groupedResults: { [key: string]: number[] } = {};
            allResults.forEach((result, index) => {
              const statementType = sqlStatementTypes[index] || 'UNKNOWN';
              const statementCategory = getSQLStatementCategory(statementType);

              // 写入操作合并到一个tab
              if (statementCategory === 'write') {
                if (!groupedResults['write']) {
                  groupedResults['write'] = [];
                }
                groupedResults['write'].push(index);
              } else {
                // 其他类型每个单独一个tab
                groupedResults[`single-${index}`] = [index];
              }
            });

            // 渲染分组后的tabs
            return Object.entries(groupedResults).map(([key, indices]) => {
              const firstIndex = indices[0];
              const statementType = sqlStatementTypes[firstIndex] || 'UNKNOWN';
              const statementCategory = getSQLStatementCategory(statementType);
              const displayInfo = getSQLStatementDisplayInfo(statementType);
              const parsedResult = parseQueryResult(allResults[firstIndex]);

              // 根据语句类型显示不同的图标和标题
              const getTabIcon = () => {
                switch (statementCategory) {
                  case 'query':
                    return <Database className='w-3 h-3' />;
                  case 'write':
                    return <CheckCircle className='w-3 h-3 text-green-500' />;
                  case 'delete':
                    return <Trash2 className='w-3 h-3 text-orange-500' />;
                  case 'ddl':
                    return <Settings className='w-3 h-3 text-blue-500' />;
                  case 'permission':
                    return <Shield className='w-3 h-3 text-purple-500' />;
                  default:
                    return <FileText className='w-3 h-3' />;
                }
              };

              const getTabLabel = () => {
                switch (statementCategory) {
                  case 'query':
                    return tQuery('resultPanel.tabs.queryResult');
                  case 'write':
                    return tQuery('resultPanel.tabs.writeResult');
                  case 'delete':
                    return tQuery('resultPanel.tabs.deleteResult');
                  case 'ddl':
                    return tQuery('resultPanel.tabs.operationResult');
                  case 'permission':
                    return tQuery('resultPanel.tabs.permissionResult');
                  default:
                    return tQuery('resultPanel.tabs.executionResult');
                }
              };

              // 使用第一个索引作为tab的value，但对于write类型使用特殊标识
              const tabValue = key === 'write' ? 'write-combined' : `data-${firstIndex}`;

              return (
                <TabsTrigger
                  key={tabValue}
                  value={tabValue}
                  className='flex items-center gap-1 px-3 py-1 text-xs flex-shrink-0'
                >
                  {getTabIcon()}
                  {getTabLabel()}
                  {parsedResult && statementCategory === 'query' && (
                    <Badge variant='secondary' className='ml-1 text-xs px-1'>
                      {parsedResult.rowCount}
                    </Badge>
                  )}
                  {statementCategory === 'write' && indices.length > 1 && (
                    <Badge variant='secondary' className='ml-1 text-xs px-1'>
                      {indices.length}
                    </Badge>
                  )}
                  {statementCategory !== 'query' && statementCategory !== 'write' && (
                    <Badge variant='outline' className='ml-1 text-xs px-1'>
                      {statementType}
                    </Badge>
                  )}
                </TabsTrigger>
              );
            });
          })()}

          {/* 字段统计tab - 只有普通 SELECT 查询才显示 */}
          {allResults.length > 0 && (() => {
            // 检查是否有任何结果需要显示字段统计
            const hasFieldStatistics = allResults.some((_, index) => {
              const statementType = sqlStatementTypes[index] || 'UNKNOWN';
              return shouldShowFieldStatistics(statementType);
            });

            if (!hasFieldStatistics) return null;

            return (
              <TabsTrigger
                value='statistics'
                className='flex items-center gap-1 px-3 py-1 text-xs flex-shrink-0'
              >
                <Info className='w-3 h-3' />
                {tQuery('resultPanel.tabs.fieldStatistics')}
                <Badge variant='secondary' className='ml-1 text-xs px-1'>
                  {allResults.filter((_, index) => {
                    const statementType = sqlStatementTypes[index] || 'UNKNOWN';
                    return shouldShowFieldStatistics(statementType);
                  }).length}
                </Badge>
              </TabsTrigger>
            );
          })()}

          {/* 动态可视化tab - 只有普通 SELECT 查询才显示 */}
          {allResults.map((result, index) => {
            const statementType = sqlStatementTypes[index] || 'UNKNOWN';

            // 只有普通 SELECT 查询才显示可视化
            if (!shouldShowVisualization(statementType)) return null;

            const isChartable =
              result &&
              result.data &&
              Array.isArray(result.data) &&
              result.data.length > 0;
            if (!isChartable) return null;

            return (
              <TabsTrigger
                key={`visualization-${index}`}
                value={`visualization-${index}`}
                className='flex items-center gap-1 px-3 py-1 text-xs flex-shrink-0'
              >
                <BarChart3 className='w-3 h-3' />
                {tQuery('resultPanel.tabs.visualization')} {allResults.length > 1 ? `${index + 1}` : ''}
              </TabsTrigger>
            );
          })}

          {/* 洞察tab - 只有普通 SELECT 查询才显示 */}
          {allResults.length > 0 && (() => {
            // 检查是否有任何结果需要显示洞察
            const hasInsights = allResults.some((_, index) => {
              const statementType = sqlStatementTypes[index] || 'UNKNOWN';
              return shouldShowInsights(statementType);
            });

            if (!hasInsights) return null;

            return (
              <TabsTrigger
                value='insights'
                className='flex items-center gap-1 px-3 py-1 text-xs flex-shrink-0'
              >
                <Brain className='w-3 h-3' />
                {tQuery('resultPanel.tabs.insights')}
                {allDataInsights.reduce((sum, q) => sum + q.insights.length, 0) > 0 && (
                  <Badge variant='secondary' className='ml-1 text-xs px-1'>
                    {allDataInsights.reduce((sum, q) => sum + q.insights.length, 0)}
                  </Badge>
                )}
              </TabsTrigger>
            );
          })()}
          </TabsList>
        </div>

        {/* 执行器标签页 - 优化后的版本 */}
        <TabsContent value='executor' className='flex-1 overflow-auto mt-0'>
          <div className='h-full p-4 space-y-4'>
            {/* 顶部统计卡片 */}
            <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
              {/* 执行概览卡片 */}
              <Card>
                <CardHeader className='pb-2'>
                  <CardTitle className='text-sm flex items-center gap-2'>
                    <Activity className='w-4 h-4' />
                    {tQuery('resultPanel.executor.overview')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className='space-y-2'>
                    <div className='flex items-center justify-between'>
                      <span className='text-xs text-muted-foreground'>{tQuery('resultPanel.executor.status')}</span>
                      <Badge
                        variant={allResults.length > 0 ? 'default' : 'secondary'}
                        className='text-xs'
                      >
                        {allResults.length > 0 ? (
                          <>
                            <CheckCircle className='w-3 h-3 mr-1' />
                            {tQuery('resultPanel.executor.success')}
                          </>
                        ) : (
                          <>
                            <Clock className='w-3 h-3 mr-1' />
                            {tQuery('resultPanel.executor.pending')}
                          </>
                        )}
                      </Badge>
                    </div>
                    <div className='flex items-center justify-between'>
                      <span className='text-xs text-muted-foreground'>{tQuery('resultPanel.executor.queryCount')}</span>
                      <span className='text-sm font-mono font-semibold'>
                        {executedQueries.length}
                      </span>
                    </div>
                    <div className='flex items-center justify-between'>
                      <span className='text-xs text-muted-foreground'>{tQuery('resultPanel.executor.totalTime')}</span>
                      <span className='text-sm font-mono font-semibold'>
                        {executionTime}ms
                      </span>
                    </div>
                    {executedQueries.length > 0 && (
                      <div className='flex items-center justify-between'>
                        <span className='text-xs text-muted-foreground'>{tQuery('resultPanel.executor.avgTime')}</span>
                        <span className='text-sm font-mono'>
                          {Math.round(executionTime / executedQueries.length)}ms
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* 性能指标卡片 - 针对多查询优化 */}
              <Card>
                <CardHeader className='pb-2'>
                  <CardTitle className='text-sm flex items-center gap-2'>
                    <Zap className='w-4 h-4' />
                    {tQuery('resultPanel.executor.performanceAnalysis')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className='space-y-3'>
                    <div>
                      <div className='flex justify-between text-xs mb-1'>
                        <span>{tQuery('resultPanel.executor.executionEfficiency')}</span>
                        <span className='font-medium'>
                          {executionTime < 1000
                            ? tQuery('resultPanel.executor.excellent')
                            : executionTime < 5000
                              ? tQuery('resultPanel.executor.good')
                              : tQuery('resultPanel.executor.needsOptimization')}
                        </span>
                      </div>
                      <Progress
                        value={Math.min(
                          100,
                          Math.max(0, 100 - executionTime / 100)
                        )}
                        className='h-2'
                      />
                    </div>
                    {allResults.length > 0 && (
                      <div>
                        <div className='flex justify-between text-xs mb-1'>
                          <span>{tQuery('resultPanel.executor.totalRows')}</span>
                          <span className='font-mono font-medium'>
                            {allResults
                              .reduce((sum, r) => sum + (r.rowCount || 0), 0)
                              .toLocaleString()}
                          </span>
                        </div>
                        <Progress
                          value={Math.min(
                            100,
                            (allResults.reduce((sum, r) => sum + (r.rowCount || 0), 0) / 10000) * 100
                          )}
                          className='h-2'
                        />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* 查询建议卡片 - 替换原来的"最近查询" */}
              <Card>
                <CardHeader className='pb-2'>
                  <CardTitle className='text-sm flex items-center gap-2'>
                    <Lightbulb className='w-4 h-4' />
                    {tQuery('resultPanel.executor.optimizationSuggestions')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className='space-y-2 text-xs'>
                    {executionTime > 5000 ? (
                      <div className='flex items-start gap-2 text-orange-600 dark:text-orange-400'>
                        <AlertTriangle className='w-3 h-3 mt-0.5 flex-shrink-0' />
                        <span>{tQuery('resultPanel.executor.slowQuerySuggestion')}</span>
                      </div>
                    ) : executionTime > 1000 ? (
                      <div className='flex items-start gap-2 text-blue-600 dark:text-blue-400'>
                        <Info className='w-3 h-3 mt-0.5 flex-shrink-0' />
                        <span>{tQuery('resultPanel.executor.goodPerformanceSuggestion')}</span>
                      </div>
                    ) : (
                      <div className='flex items-start gap-2 text-green-600 dark:text-green-400'>
                        <CheckCircle className='w-3 h-3 mt-0.5 flex-shrink-0' />
                        <span>{tQuery('resultPanel.executor.excellentPerformance')}</span>
                      </div>
                    )}
                    {allResults.reduce((sum, r) => sum + (r.rowCount || 0), 0) > 10000 && (
                      <div className='flex items-start gap-2 text-blue-600 dark:text-blue-400'>
                        <Info className='w-3 h-3 mt-0.5 flex-shrink-0' />
                        <span>{tQuery('resultPanel.executor.largeDataSuggestion')}</span>
                      </div>
                    )}
                    {executedQueries.length > 1 && (
                      <div className='flex items-start gap-2 text-muted-foreground'>
                        <Info className='w-3 h-3 mt-0.5 flex-shrink-0' />
                        <span>{tQuery('resultPanel.executor.batchExecuted', { count: executedQueries.length })}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 每个查询的详细信息 - 使用完整高度的滚动区域 */}
            {executedQueries.length > 0 && (
              <Card className='flex-1'>
                <CardHeader className='pb-3'>
                  <CardTitle className='text-sm flex items-center gap-2'>
                    <Database className='w-4 h-4' />
                    {tQuery('resultPanel.queryDetails.title')} ({executedQueries.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className='space-y-3'>
                    {executedQueries.map((query, index) => {
                      const result = allResults[index];
                      const rowCount = result?.rowCount || 0;
                      const hasError = result?.error;

                      return (
                        <div
                          key={index}
                          className='border rounded-lg p-4 space-y-3 bg-card hover:bg-accent/5 transition-colors'
                        >
                          {/* 查询头部 - 状态和统计 */}
                          <div className='flex items-center justify-between'>
                            <div className='flex items-center gap-2'>
                              <Badge variant='outline' className='text-xs'>
                                {tQuery('resultPanel.queryDetails.query')} {index + 1}
                              </Badge>
                              {hasError ? (
                                <Badge variant='destructive' className='text-xs'>
                                  <X className='w-3 h-3 mr-1' />
                                  {tQuery('resultPanel.queryDetails.failed')}
                                </Badge>
                              ) : (
                                <Badge variant='default' className='text-xs bg-green-500'>
                                  <CheckCircle className='w-3 h-3 mr-1' />
                                  {tQuery('resultPanel.queryDetails.success')}
                                </Badge>
                              )}
                              {!hasError && (
                                <span className='text-xs text-muted-foreground'>
                                  {tQuery('resultPanel.queryDetails.returned')} <span className='font-mono font-semibold'>{rowCount.toLocaleString()}</span> {tQuery('resultPanel.queryDetails.rows')}
                                </span>
                              )}
                            </div>
                            <Button
                              variant='ghost'
                              size='sm'
                              className='h-7 px-2'
                              onClick={() => {
                                navigator.clipboard.writeText(query);
                                showMessage.success(tQuery('resultPanel.queryDetails.sqlCopied'));
                              }}
                            >
                              <Copy className='w-3 h-3 mr-1' />
                              <span className='text-xs'>{tQuery('resultPanel.queryDetails.copy')}</span>
                            </Button>
                          </div>

                          {/* SQL语句 */}
                          <div className='bg-muted/50 rounded p-3'>
                            <code className='text-xs font-mono block whitespace-pre-wrap break-all'>
                              {query}
                            </code>
                          </div>

                          {/* 错误信息 */}
                          {hasError && (
                            <div className='bg-destructive/10 border border-destructive/20 rounded p-2'>
                              <p className='text-xs text-destructive'>{result.error}</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* 合并的写入结果tab */}
        {(() => {
          const writeIndices = allResults
            .map((result, index) => {
              const statementType = sqlStatementTypes[index] || 'UNKNOWN';
              const statementCategory = getSQLStatementCategory(statementType);
              return statementCategory === 'write' ? index : -1;
            })
            .filter(index => index !== -1);

          if (writeIndices.length === 0) return null;

          return (
            <TabsContent
              key='write-combined'
              value='write-combined'
              className='flex-1 overflow-hidden mt-0'
            >
              <ScrollArea className='h-full'>
                <div className='p-4 space-y-4'>
                  {/* 写入操作汇总卡片 */}
                  <Card>
                    <CardHeader className='pb-3'>
                      <CardTitle className='text-base flex items-center gap-2'>
                        <CheckCircle className='w-4 h-4 text-green-600' />
                        {tQuery('resultPanel.writeOperations.batchSummary')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className='space-y-3'>
                      <div className='flex items-center justify-between py-2 border-b'>
                        <span className='text-sm text-muted-foreground'>{tQuery('resultPanel.writeOperations.statementCount')}</span>
                        <span className='font-mono text-sm text-green-600 dark:text-green-400'>
                          {writeIndices.length} {tQuery('resultPanel.writeOperations.statements')}
                        </span>
                      </div>
                      <div className='flex items-center justify-between py-2 border-b'>
                        <span className='text-sm text-muted-foreground'>{tQuery('resultPanel.writeOperations.totalExecutionTime')}</span>
                        <span className='font-mono text-sm'>
                          {writeIndices.reduce((sum, idx) => sum + (allResults[idx].executionTime || 0), 0)}ms
                        </span>
                      </div>
                      <div className='flex items-center justify-between py-2'>
                        <span className='text-sm text-muted-foreground'>{tQuery('resultPanel.writeOperations.operationStatus')}</span>
                        <Badge variant='default' className='bg-green-600'>
                          {tQuery('resultPanel.writeOperations.allSuccess')}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>

                  {/* 每条写入语句的详情 */}
                  {writeIndices.map((index, writeIndex) => {
                    const result = allResults[index];
                    const query = executedQueries[index] || '';
                    const measurementMatch = query.match(/INTO\s+["']?(\w+)["']?/i);

                    return (
                      <Card key={`write-${index}`}>
                        <CardHeader className='pb-3'>
                          <CardTitle className='text-sm flex items-center gap-2'>
                            <Zap className='w-4 h-4' />
                            {tQuery('resultPanel.writeOperations.writeOperation')} {writeIndex + 1}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className='space-y-3'>
                          {measurementMatch && (
                            <div className='flex items-center justify-between py-2 border-b'>
                              <span className='text-sm text-muted-foreground'>{tQuery('resultPanel.writeOperations.targetMeasurement')}</span>
                              <code className='px-2 py-1 bg-muted rounded text-sm font-mono'>
                                {measurementMatch[1]}
                              </code>
                            </div>
                          )}
                          <div className='flex items-center justify-between py-2 border-b'>
                            <span className='text-sm text-muted-foreground'>{tQuery('resultPanel.writeOperations.executionTime')}</span>
                            <span className='font-mono text-sm'>{result.executionTime || 0}ms</span>
                          </div>
                          <div className='flex flex-col gap-2 py-2'>
                            <span className='text-sm text-muted-foreground'>{tQuery('resultPanel.writeOperations.sqlStatement')}</span>
                            <pre className='bg-muted p-3 rounded-md text-xs font-mono overflow-auto'>
                              {query}
                            </pre>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}

                  {/* 写入成功提示 */}
                  <Card className='border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20'>
                    <CardContent className='p-4'>
                      <div className='flex items-start gap-3'>
                        <CheckCircle className='w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5' />
                        <div className='flex-1 space-y-2'>
                          <h4 className='font-medium text-green-900 dark:text-green-200'>
                            {tQuery('resultPanel.writeOperations.batchCompleted')}
                          </h4>
                          <ul className='text-sm text-green-800 dark:text-green-300 space-y-1.5'>
                            <li className='flex items-start gap-2'>
                              <span className='text-green-600 dark:text-green-400 mt-0.5'>•</span>
                              <span>{tQuery('resultPanel.writeOperations.allStatementsExecuted', { count: writeIndices.length })}</span>
                            </li>
                            <li className='flex items-start gap-2'>
                              <span className='text-green-600 dark:text-green-400 mt-0.5'>•</span>
                              <span>{tQuery('resultPanel.writeOperations.canVerifyWithSelect')}</span>
                            </li>
                          </ul>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </ScrollArea>
            </TabsContent>
          );
        })()}

        {/* 动态数据标签页 - 根据SQL语句类型显示不同内容 */}
        {allResults.map((result, index) => {
          const parsedResult = parseQueryResult(result);
          const tableName =
            executedQueries && executedQueries[index]
              ? extractTableName(executedQueries[index])
              : '';
          const statementType = sqlStatementTypes[index] || 'UNKNOWN';
          const statementCategory = getSQLStatementCategory(statementType);
          const displayInfo = getSQLStatementDisplayInfo(statementType);
          const statsLabels = getResultStatsLabels(statementType);

          // 写入操作已经在合并的tab中显示，跳过
          if (statementCategory === 'write') {
            return null;
          }

          // 缓存分页选项，避免每次渲染都重新计算
          const paginationOptions = parsedResult
            ? generatePaginationOptions(parsedResult.data.length)
            : ['all'];

          return (
            <TabsContent
              key={`data-${index}`}
              value={`data-${index}`}
              className='flex-1 overflow-hidden mt-0'
            >
              {/* 根据SQL语句类型显示不同的内容 */}
              {statementCategory === 'query' && parsedResult ? (
                <div className='h-full flex flex-col'>
                  {/* 查询结果头部 - 使用统一的TableToolbar */}
                  <TableToolbar
                    title={`${displayInfo.title}${allResults.length > 1 ? ` ${index + 1}` : ''}`}
                    rowCount={parsedResult.rowCount}
                    loading={false}
                    showRefresh={false}
                    showCopy={true}
                    selectedCopyFormat={copyFormats[index] || 'text'}
                    onCopyFormatChange={(format) => {
                      setCopyFormats(prev => ({ ...prev, [index]: format }));
                    }}
                    onQuickExportCSV={() => setShowExportDialog(true)}
                    onAdvancedExport={() => setShowExportDialog(true)}
                    showColumnSelector={false}
                  >
                    {/* 表名标注 */}
                    {tableName && (
                      <div className='flex items-center gap-2 mr-2'>
                        <span className='text-sm text-muted-foreground'>
                          {tQuery('resultPanel.dataTab.queryTable')}
                        </span>
                        <span className='px-2 py-1 bg-primary/10 text-primary rounded-md text-sm font-medium border border-primary/20'>
                          {tableName}
                        </span>
                      </div>
                    )}
                    {/* 清空按钮 */}
                    {index === 0 && (
                      <Button
                        variant='outline'
                        size='sm'
                        className='text-xs'
                        onClick={onClearResult}
                      >
                        {tQuery('resultPanel.dataTab.clear')}
                      </Button>
                    )}
                  </TableToolbar>

                  {/* 高级数据表格 - 完全按照 TableDataBrowser.tsx 的配置 */}
                  <div className='flex-1 min-h-0'>
                    <GlideDataTable
                      data={parsedResult.data.map((row, rowIndex) => {
                        // 对于聚合查询，过滤掉 time 列（值为 0 或 1970-01-01）
                        if (statementType === 'SELECT_AGGREGATE' || statementType === 'SELECT_GROUP') {
                          const filteredRow: any = { _id: `result-${rowIndex}` };
                          parsedResult.columns.forEach((col, colIndex) => {
                            // 跳过 time 列
                            if (col.toLowerCase() === 'time') {
                              const timeValue = row[col];
                              // 如果 time 值为 0 或 1970-01-01，则跳过
                              if (timeValue === 0 || timeValue === '0' ||
                                  (typeof timeValue === 'string' && timeValue.includes('1970-01-01'))) {
                                return;
                              }
                            }
                            filteredRow[col] = row[col];
                          });
                          return filteredRow;
                        }
                        return {
                          _id: `result-${rowIndex}`,
                          ...row,
                        };
                      })}
                      columns={parsedResult.columns
                        .filter(column => {
                          // 对于聚合查询，过滤掉值为 0 或 1970-01-01 的 time 列
                          if ((statementType === 'SELECT_AGGREGATE' || statementType === 'SELECT_GROUP') &&
                              column.toLowerCase() === 'time') {
                            // 检查第一行的 time 值
                            if (parsedResult.data.length > 0) {
                              const firstRow = parsedResult.data[0];
                              const timeValue = firstRow[column];
                              // 如果 time 值为 0 或 1970-01-01，则过滤掉
                              if (timeValue === 0 || timeValue === '0' ||
                                  (typeof timeValue === 'string' && timeValue.includes('1970-01-01'))) {
                                return false;
                              }
                            }
                          }
                          return true;
                        })
                        .map(column => {
                          return {
                            key: column,
                            title: column,
                            width: column === 'time' ? 180 : 120,
                            sortable: true,
                            filterable: true,
                            render:
                              column === 'time'
                                ? (value: any) =>
                                    value ? new Date(value).toLocaleString() : '-'
                                : undefined,
                          };
                        })}
                      loading={false}
                      pagination={{
                        current: currentPage,
                        pageSize,
                        total: parsedResult.data.length,
                        showSizeChanger: true,
                        pageSizeOptions: paginationOptions,
                      }}
                      searchable={false} // 使用外部搜索
                      filterable={true}
                      sortable={true}
                      exportable={false} // 使用外部导出
                      columnManagement={true}
                      showToolbar={false} // 使用外部工具栏
                      className='h-full'
                      tableName={tableName || 'query_result'}
                      dataSourceType={dataSourceType}
                      database={currentConnection?.database}
                      copyFormat={copyFormats[index] || 'text'}
                      onPageChange={(page: number, size: number) => {
                        handlePageChange(page);
                        if (size !== pageSize) {
                          handlePageSizeChange(size.toString());
                        }
                      }}
                    />
                  </div>
                </div>
              ) : (
                <div className='h-full flex items-center justify-center'>
                  <div className='text-center text-muted-foreground'>
                    <Database className='w-16 h-16 mx-auto mb-4 opacity-50' />
                    <p className='text-sm'>{tQuery('resultPanel.dataTab.noData', { index: index + 1 })}</p>
                  </div>
                </div>
              )}

              {/* 非查询类语句的结果显示 */}
              {statementCategory !== 'query' && (
                <div className='h-full flex flex-col'>
                  {/* 操作结果头部 */}
                  <div className='flex-shrink-0 bg-muted/50 border-b px-4 py-2'>
                    <div className='flex items-center justify-between'>
                      <div className='flex items-center gap-2'>
                        {statementCategory === 'delete' && (
                          <Trash2 className='w-4 h-4 text-orange-500' />
                        )}
                        {statementCategory === 'ddl' && (
                          <Settings className='w-4 h-4 text-blue-500' />
                        )}
                        {statementCategory === 'permission' && (
                          <Shield className='w-4 h-4 text-purple-500' />
                        )}
                        {statementCategory === 'unknown' && (
                          <FileText className='w-4 h-4' />
                        )}
                        <span className='text-sm font-medium'>
                          {displayInfo.title}{' '}
                          {allResults.length > 1 ? `${index + 1}` : ''}
                        </span>
                        <Badge variant='outline' className='text-xs'>
                          {statementType}
                        </Badge>
                      </div>
                      <div className='flex items-center gap-2'>
                        {index === 0 && (
                          <Button
                            variant='outline'
                            size='sm'
                            className='text-xs'
                            onClick={onClearResult}
                          >
                            {tQuery('resultPanel.dataTab.clear')}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 操作结果内容 */}
                  <ScrollArea className='flex-1'>
                    <div className='p-4 space-y-4'>
                      {/* 执行状态 */}
                      <Card className='border-l-4 border-l-green-500'>
                        <CardContent className='p-4'>
                          <div className='flex items-center gap-3'>
                            <div className='flex-shrink-0 w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center'>
                              <CheckCircle className='w-5 h-5 text-green-600 dark:text-green-400' />
                            </div>
                            <div className='flex-1'>
                              <h3 className='font-semibold text-green-700 dark:text-green-400'>
                                {displayInfo.description}{tQuery('resultPanel.executionStatus.executionSuccess')}
                              </h3>
                              <p className='text-sm text-muted-foreground mt-0.5'>
                                {tQuery('resultPanel.executionStatus.operationCompleted', { time: executionTime })}
                              </p>
                            </div>
                            <Badge variant='outline' className='text-xs'>
                              {statementType}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>

                      {/* DELETE语句专属展示 */}
                      {statementCategory === 'delete' && (
                        <>
                          {/* 删除操作详情 */}
                          <Card>
                            <CardHeader className='pb-3'>
                              <CardTitle className='text-base flex items-center gap-2'>
                                <Trash2 className='w-4 h-4' />
                                {tQuery('resultPanel.executionStatus.deleteDetails')}
                              </CardTitle>
                            </CardHeader>
                            <CardContent className='space-y-3'>
                              {/* 解析DELETE语句信息 */}
                              {(() => {
                                const query = executedQueries[index] || '';
                                const measurementMatch = query.match(/FROM\s+["']?(\w+)["']?/i);
                                const whereMatch = query.match(/WHERE\s+(.+)$/i);

                                return (
                                  <>
                                    {measurementMatch && (
                                      <div className='flex items-center justify-between py-2 border-b'>
                                        <span className='text-sm text-muted-foreground'>{tQuery('resultPanel.executionStatus.targetMeasurement')}</span>
                                        <code className='px-2 py-1 bg-muted rounded text-sm font-mono'>
                                          {measurementMatch[1]}
                                        </code>
                                      </div>
                                    )}
                                    {whereMatch && (
                                      <div className='flex flex-col gap-2 py-2 border-b'>
                                        <span className='text-sm text-muted-foreground'>{tQuery('resultPanel.executionStatus.deleteCondition')}</span>
                                        <code className='px-2 py-1 bg-muted rounded text-xs font-mono'>
                                          {whereMatch[1]}
                                        </code>
                                      </div>
                                    )}
                                    <div className='flex items-center justify-between py-2 border-b'>
                                      <span className='text-sm text-muted-foreground'>{tQuery('resultPanel.executionStatus.executionTime')}</span>
                                      <span className='font-mono text-sm'>{executionTime}ms</span>
                                    </div>
                                    <div className='flex items-center justify-between py-2'>
                                      <span className='text-sm text-muted-foreground'>{tQuery('resultPanel.executionStatus.operationStatus')}</span>
                                      <Badge variant='default' className='bg-green-600'>
                                        {tQuery('resultPanel.executionStatus.completed')}
                                      </Badge>
                                    </div>
                                  </>
                                );
                              })()}
                            </CardContent>
                          </Card>

                          {/* 重要提示 */}
                          <Card className='border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-950/20'>
                            <CardContent className='p-4'>
                              <div className='flex items-start gap-3'>
                                <AlertTriangle className='w-5 h-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5' />
                                <div className='flex-1 space-y-2'>
                                  <h4 className='font-medium text-orange-900 dark:text-orange-200'>
                                    {tQuery('resultPanel.executionStatus.importantNotice')}
                                  </h4>
                                  <ul className='text-sm text-orange-800 dark:text-orange-300 space-y-1.5'>
                                    <li className='flex items-start gap-2'>
                                      <span className='text-orange-600 dark:text-orange-400 mt-0.5'>•</span>
                                      <span>{tQuery('resultPanel.executionStatus.deleteWarnings.noRowCount')}</span>
                                    </li>
                                    <li className='flex items-start gap-2'>
                                      <span className='text-orange-600 dark:text-orange-400 mt-0.5'>•</span>
                                      <span>{tQuery('resultPanel.executionStatus.deleteWarnings.verifyWithSelect')}</span>
                                    </li>
                                    <li className='flex items-start gap-2'>
                                      <span className='text-orange-600 dark:text-orange-400 mt-0.5'>•</span>
                                      <span>{tQuery('resultPanel.executionStatus.deleteWarnings.irreversible')}</span>
                                    </li>
                                  </ul>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </>
                      )}

                      {/* DROP语句专属展示 */}
                      {statementCategory === 'ddl' && statementType === 'DROP' && (
                        <>
                          {/* DROP操作详情 */}
                          <Card>
                            <CardHeader className='pb-3'>
                              <CardTitle className='text-base flex items-center gap-2'>
                                <Database className='w-4 h-4' />
                                {tQuery('resultPanel.executionStatus.dropDetails')}
                              </CardTitle>
                            </CardHeader>
                            <CardContent className='space-y-3'>
                              {(() => {
                                const query = executedQueries[index] || '';
                                const dropTypeMatch = query.match(/DROP\s+(DATABASE|MEASUREMENT|SERIES|RETENTION\s+POLICY)/i);
                                const objectMatch = query.match(/DROP\s+(?:DATABASE|MEASUREMENT|SERIES|RETENTION\s+POLICY)\s+["']?(\w+)["']?/i);

                                return (
                                  <>
                                    {dropTypeMatch && (
                                      <div className='flex items-center justify-between py-2 border-b'>
                                        <span className='text-sm text-muted-foreground'>{tQuery('resultPanel.executionStatus.operationType')}</span>
                                        <code className='px-2 py-1 bg-destructive/10 text-destructive rounded text-sm font-mono'>
                                          DROP {dropTypeMatch[1].toUpperCase()}
                                        </code>
                                      </div>
                                    )}
                                    {objectMatch && (
                                      <div className='flex items-center justify-between py-2 border-b'>
                                        <span className='text-sm text-muted-foreground'>{tQuery('resultPanel.executionStatus.deleteObject')}</span>
                                        <code className='px-2 py-1 bg-muted rounded text-sm font-mono'>
                                          {objectMatch[1]}
                                        </code>
                                      </div>
                                    )}
                                    <div className='flex items-center justify-between py-2 border-b'>
                                      <span className='text-sm text-muted-foreground'>{tQuery('resultPanel.executionStatus.executionTime')}</span>
                                      <span className='font-mono text-sm'>{executionTime}ms</span>
                                    </div>
                                    <div className='flex items-center justify-between py-2'>
                                      <span className='text-sm text-muted-foreground'>{tQuery('resultPanel.executionStatus.operationStatus')}</span>
                                      <Badge variant='default' className='bg-green-600'>
                                        {tQuery('resultPanel.executionStatus.completed')}
                                      </Badge>
                                    </div>
                                  </>
                                );
                              })()}
                            </CardContent>
                          </Card>

                          {/* DROP警告 */}
                          <Card className='border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20'>
                            <CardContent className='p-4'>
                              <div className='flex items-start gap-3'>
                                <AlertTriangle className='w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5' />
                                <div className='flex-1 space-y-2'>
                                  <h4 className='font-medium text-red-900 dark:text-red-200'>
                                    {tQuery('resultPanel.executionStatus.dangerWarning')}
                                  </h4>
                                  <ul className='text-sm text-red-800 dark:text-red-300 space-y-1.5'>
                                    <li className='flex items-start gap-2'>
                                      <span className='text-red-600 dark:text-red-400 mt-0.5'>•</span>
                                      <span>{tQuery('resultPanel.executionStatus.dropWarnings.permanent')}</span>
                                    </li>
                                    <li className='flex items-start gap-2'>
                                      <span className='text-red-600 dark:text-red-400 mt-0.5'>•</span>
                                      <span>{tQuery('resultPanel.executionStatus.dropWarnings.dataRemoved')}</span>
                                    </li>
                                    <li className='flex items-start gap-2'>
                                      <span className='text-red-600 dark:text-red-400 mt-0.5'>•</span>
                                      <span>{tQuery('resultPanel.executionStatus.dropWarnings.backupFirst')}</span>
                                    </li>
                                  </ul>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </>
                      )}

                      {/* CREATE语句专属展示 */}
                      {statementCategory === 'ddl' && statementType === 'CREATE' && (
                        <>
                          {/* CREATE操作详情 */}
                          <Card>
                            <CardHeader className='pb-3'>
                              <CardTitle className='text-base flex items-center gap-2'>
                                <Database className='w-4 h-4' />
                                {tQuery('resultPanel.executionStatus.createDetails')}
                              </CardTitle>
                            </CardHeader>
                            <CardContent className='space-y-3'>
                              {(() => {
                                const query = executedQueries[index] || '';
                                const createTypeMatch = query.match(/CREATE\s+(DATABASE|MEASUREMENT|RETENTION\s+POLICY|USER|CONTINUOUS\s+QUERY)/i);
                                const objectMatch = query.match(/CREATE\s+(?:DATABASE|RETENTION\s+POLICY|USER|CONTINUOUS\s+QUERY)\s+["']?(\w+)["']?/i);

                                return (
                                  <>
                                    {createTypeMatch && (
                                      <div className='flex items-center justify-between py-2 border-b'>
                                        <span className='text-sm text-muted-foreground'>{tQuery('resultPanel.executionStatus.operationType')}</span>
                                        <code className='px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-sm font-mono'>
                                          CREATE {createTypeMatch[1].toUpperCase()}
                                        </code>
                                      </div>
                                    )}
                                    {objectMatch && (
                                      <div className='flex items-center justify-between py-2 border-b'>
                                        <span className='text-sm text-muted-foreground'>{tQuery('resultPanel.executionStatus.createObject')}</span>
                                        <code className='px-2 py-1 bg-muted rounded text-sm font-mono'>
                                          {objectMatch[1]}
                                        </code>
                                      </div>
                                    )}
                                    <div className='flex items-center justify-between py-2 border-b'>
                                      <span className='text-sm text-muted-foreground'>{tQuery('resultPanel.executionStatus.executionTime')}</span>
                                      <span className='font-mono text-sm'>{executionTime}ms</span>
                                    </div>
                                    <div className='flex items-center justify-between py-2'>
                                      <span className='text-sm text-muted-foreground'>{tQuery('resultPanel.executionStatus.createStatus')}</span>
                                      <Badge variant='default' className='bg-green-600'>
                                        {tQuery('resultPanel.executionStatus.created')}
                                      </Badge>
                                    </div>
                                  </>
                                );
                              })()}
                            </CardContent>
                          </Card>

                          {/* CREATE成功提示 */}
                          <Card className='border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20'>
                            <CardContent className='p-4'>
                              <div className='flex items-start gap-3'>
                                <Info className='w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5' />
                                <div className='flex-1 space-y-2'>
                                  <h4 className='font-medium text-blue-900 dark:text-blue-200'>
                                    {tQuery('resultPanel.executionStatus.createNotice')}
                                  </h4>
                                  <ul className='text-sm text-blue-800 dark:text-blue-300 space-y-1.5'>
                                    <li className='flex items-start gap-2'>
                                      <span className='text-blue-600 dark:text-blue-400 mt-0.5'>•</span>
                                      <span>{tQuery('resultPanel.executionStatus.createTips.objectCreated')}</span>
                                    </li>
                                    <li className='flex items-start gap-2'>
                                      <span className='text-blue-600 dark:text-blue-400 mt-0.5'>•</span>
                                      <span>{tQuery('resultPanel.executionStatus.createTips.useShow')}</span>
                                    </li>
                                    <li className='flex items-start gap-2'>
                                      <span className='text-blue-600 dark:text-blue-400 mt-0.5'>•</span>
                                      <span>{tQuery('resultPanel.executionStatus.createTips.mayFail')}</span>
                                    </li>
                                  </ul>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </>
                      )}

                      {/* ALTER语句专属展示 */}
                      {statementCategory === 'ddl' && statementType === 'ALTER' && (
                        <>
                          {/* ALTER操作详情 */}
                          <Card>
                            <CardHeader className='pb-3'>
                              <CardTitle className='text-base flex items-center gap-2'>
                                <Settings className='w-4 h-4' />
                                {tQuery('resultPanel.executionStatus.alterDetails')}
                              </CardTitle>
                            </CardHeader>
                            <CardContent className='space-y-3'>
                              {(() => {
                                const query = executedQueries[index] || '';
                                const alterTypeMatch = query.match(/ALTER\s+(RETENTION\s+POLICY)/i);
                                const objectMatch = query.match(/ALTER\s+RETENTION\s+POLICY\s+["']?(\w+)["']?/i);

                                return (
                                  <>
                                    {alterTypeMatch && (
                                      <div className='flex items-center justify-between py-2 border-b'>
                                        <span className='text-sm text-muted-foreground'>{tQuery('resultPanel.executionStatus.operationType')}</span>
                                        <code className='px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded text-sm font-mono'>
                                          ALTER {alterTypeMatch[1].toUpperCase()}
                                        </code>
                                      </div>
                                    )}
                                    {objectMatch && (
                                      <div className='flex items-center justify-between py-2 border-b'>
                                        <span className='text-sm text-muted-foreground'>{tQuery('resultPanel.executionStatus.modifyObject')}</span>
                                        <code className='px-2 py-1 bg-muted rounded text-sm font-mono'>
                                          {objectMatch[1]}
                                        </code>
                                      </div>
                                    )}
                                    <div className='flex items-center justify-between py-2 border-b'>
                                      <span className='text-sm text-muted-foreground'>{tQuery('resultPanel.executionStatus.executionTime')}</span>
                                      <span className='font-mono text-sm'>{executionTime}ms</span>
                                    </div>
                                    <div className='flex items-center justify-between py-2'>
                                      <span className='text-sm text-muted-foreground'>{tQuery('resultPanel.executionStatus.modifyStatus')}</span>
                                      <Badge variant='default' className='bg-green-600'>
                                        {tQuery('resultPanel.executionStatus.modified')}
                                      </Badge>
                                    </div>
                                  </>
                                );
                              })()}
                            </CardContent>
                          </Card>
                        </>
                      )}

                      {/* 权限语句（GRANT/REVOKE）专属展示 */}
                      {statementCategory === 'permission' && (
                        <>
                          {/* 权限操作详情 */}
                          <Card>
                            <CardHeader className='pb-3'>
                              <CardTitle className='text-base flex items-center gap-2'>
                                <Shield className='w-4 h-4' />
                                {tQuery('resultPanel.executionStatus.permissionDetails')}
                              </CardTitle>
                            </CardHeader>
                            <CardContent className='space-y-3'>
                              {(() => {
                                const query = executedQueries[index] || '';
                                const permissionMatch = query.match(/^(GRANT|REVOKE)/i);
                                const privilegeMatch = query.match(/(?:GRANT|REVOKE)\s+(ALL|READ|WRITE)\s+(?:ON|FROM)/i);
                                const userMatch = query.match(/(?:TO|FROM)\s+["']?(\w+)["']?/i);

                                return (
                                  <>
                                    {permissionMatch && (
                                      <div className='flex items-center justify-between py-2 border-b'>
                                        <span className='text-sm text-muted-foreground'>{tQuery('resultPanel.executionStatus.operationType')}</span>
                                        <code className='px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded text-sm font-mono'>
                                          {permissionMatch[1].toUpperCase()}
                                        </code>
                                      </div>
                                    )}
                                    {privilegeMatch && (
                                      <div className='flex items-center justify-between py-2 border-b'>
                                        <span className='text-sm text-muted-foreground'>{tQuery('resultPanel.executionStatus.permissionType')}</span>
                                        <code className='px-2 py-1 bg-muted rounded text-sm font-mono'>
                                          {privilegeMatch[1].toUpperCase()}
                                        </code>
                                      </div>
                                    )}
                                    {userMatch && (
                                      <div className='flex items-center justify-between py-2 border-b'>
                                        <span className='text-sm text-muted-foreground'>{tQuery('resultPanel.executionStatus.targetUser')}</span>
                                        <code className='px-2 py-1 bg-muted rounded text-sm font-mono'>
                                          {userMatch[1]}
                                        </code>
                                      </div>
                                    )}
                                    <div className='flex items-center justify-between py-2 border-b'>
                                      <span className='text-sm text-muted-foreground'>{tQuery('resultPanel.executionStatus.executionTime')}</span>
                                      <span className='font-mono text-sm'>{executionTime}ms</span>
                                    </div>
                                    <div className='flex items-center justify-between py-2'>
                                      <span className='text-sm text-muted-foreground'>{tQuery('resultPanel.executionStatus.operationStatus')}</span>
                                      <Badge variant='default' className='bg-green-600'>
                                        {tQuery('resultPanel.executionStatus.completed')}
                                      </Badge>
                                    </div>
                                  </>
                                );
                              })()}
                            </CardContent>
                          </Card>
                        </>
                      )}

                      {/* 其他未分类语句的通用展示 */}
                      {statementCategory !== 'delete' &&
                       !(statementCategory === 'ddl' && (statementType === 'DROP' || statementType === 'CREATE' || statementType === 'ALTER')) &&
                       statementCategory !== 'permission' && (
                        <Card>
                          <CardHeader className='pb-3'>
                            <CardTitle className='text-base'>{tQuery('resultPanel.executionStatus.executionStats')}</CardTitle>
                          </CardHeader>
                          <CardContent className='space-y-3'>
                            <div className='flex items-center justify-between py-2 border-b'>
                              <span className='text-sm text-muted-foreground'>{tQuery('resultPanel.executionStatus.executionTime')}</span>
                              <span className='font-mono text-sm'>{executionTime}ms</span>
                            </div>
                            {result?.rowCount !== undefined && result.rowCount > 0 && (
                              <div className='flex items-center justify-between py-2 border-b'>
                                <span className='text-sm text-muted-foreground'>
                                  {statsLabels.rowCount}:
                                </span>
                                <span className='font-mono text-sm'>{result.rowCount}</span>
                              </div>
                            )}
                            <div className='flex items-center justify-between py-2'>
                              <span className='text-sm text-muted-foreground'>{tQuery('resultPanel.executionStatus.statementType')}</span>
                              <Badge variant='outline'>{statementType}</Badge>
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* 执行的SQL语句 */}
                      {executedQueries[index] && (
                        <Card>
                          <CardHeader className='pb-3'>
                            <CardTitle className='text-base flex items-center gap-2'>
                              <FileText className='w-4 h-4' />
                              {tQuery('resultPanel.executionStatus.executedSQL')}
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <pre className='bg-muted p-3 rounded-md text-xs font-mono overflow-auto'>
                              {executedQueries[index]}
                            </pre>
                          </CardContent>
                        </Card>
                      )}

                      {/* 服务器响应（调试信息） */}
                      {result && (
                        <Card>
                          <CardHeader className='pb-3'>
                            <CardTitle className='text-base flex items-center gap-2'>
                              <Info className='w-4 h-4' />
                              {tQuery('resultPanel.executionStatus.serverResponse')}
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <pre className='bg-muted p-3 rounded-md text-xs font-mono overflow-auto max-h-64'>
                              {JSON.stringify(result, null, 2)}
                            </pre>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </TabsContent>
          );
        })}

        {/* 字段统计标签页 - 优化为显示所有查询的统计 */}
        <TabsContent value='statistics' className='flex-1 overflow-hidden mt-0'>
          {allFieldStatistics.length > 0 ? (
            <div className='h-full flex flex-col'>
              {/* 字段统计头部 */}
              <div className='flex-shrink-0 bg-muted/50 border-b px-4 py-2'>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-2'>
                    <Info className='w-4 h-4' />
                    <span className='text-sm font-medium'>{tQuery('resultPanel.fieldStatistics.title')}</span>
                    <Badge variant='outline' className='text-xs'>
                      {allFieldStatistics.length} {tQuery('resultPanel.fieldStatistics.queries')}
                    </Badge>
                    <Badge variant='secondary' className='text-xs'>
                      {allFieldStatistics.reduce((sum, q) => sum + q.statistics.length, 0)} {tQuery('resultPanel.fieldStatistics.fields')}
                    </Badge>
                  </div>
                  <div className='flex items-center gap-2'>
                    <Button
                      variant='outline'
                      size='sm'
                      className='text-xs'
                      onClick={() => setShowStatisticsExportDialog(true)}
                    >
                      <Download className='w-3 h-3 mr-1' />
                      {tQuery('resultPanel.fieldStatistics.exportStats')}
                    </Button>
                  </div>
                </div>
              </div>

              {/* 可滚动的统计内容 - 按查询分组 */}
              <ScrollArea className='flex-1'>
                <div className='p-4 space-y-6'>
                  {allFieldStatistics.map((queryStats, queryIndex) => (
                    <div key={queryIndex} className='space-y-3'>
                      {/* 查询标题 */}
                      <div className='flex items-center gap-2 pb-2 border-b'>
                        <Badge variant='default' className='text-xs'>
                          {tQuery('resultPanel.fieldStatistics.query')} {queryIndex + 1}
                        </Badge>
                        <span className='text-xs text-muted-foreground font-mono truncate max-w-md'>
                          {queryStats.queryText}
                        </span>
                        <Badge variant='secondary' className='text-xs ml-auto'>
                          {queryStats.statistics.length} {tQuery('resultPanel.fieldStatistics.fields')}
                        </Badge>
                        <Badge variant='outline' className='text-xs'>
                          {queryStats.rowCount.toLocaleString()} {tQuery('resultPanel.fieldStatistics.rows')}
                        </Badge>
                      </div>

                      {/* 字段统计表格 */}
                      {queryStats.statistics.length > 0 ? (
                        <div className='rounded-md border'>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className='px-3 py-2 text-xs font-medium'>
                                  {tQuery('resultPanel.fieldStatsHeaders.fieldName')}
                                </TableHead>
                                <TableHead className='px-3 py-2 text-xs font-medium'>
                                  {tQuery('resultPanel.fieldStatsHeaders.dataType')}
                                </TableHead>
                                <TableHead className='px-3 py-2 text-xs font-medium'>
                                  {tQuery('resultPanel.fieldStatsHeaders.nullCount')}
                                </TableHead>
                                <TableHead className='px-3 py-2 text-xs font-medium'>
                                  {tQuery('resultPanel.fieldStatsHeaders.uniqueCount')}
                                </TableHead>
                                <TableHead className='px-3 py-2 text-xs font-medium'>
                                  {tQuery('resultPanel.fieldStatsHeaders.min')}
                                </TableHead>
                                <TableHead className='px-3 py-2 text-xs font-medium'>
                                  {tQuery('resultPanel.fieldStatsHeaders.max')}
                                </TableHead>
                                <TableHead className='px-3 py-2 text-xs font-medium'>
                                  {tQuery('resultPanel.fieldStatsHeaders.avg')}
                                </TableHead>
                                <TableHead className='px-3 py-2 text-xs font-medium'>
                                  {tQuery('resultPanel.fieldStatsHeaders.median')}
                                </TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {queryStats.statistics.map((stat, statIndex) => (
                                <TableRow
                                  key={statIndex}
                                  className='hover:bg-muted/30 transition-colors'
                                >
                                  <TableCell className='px-3 py-2 font-mono text-xs font-medium'>
                                    {stat.fieldName}
                                  </TableCell>
                                  <TableCell className='px-3 py-2 text-xs'>
                                    <Badge
                                      variant='outline'
                                      className={`text-xs ${
                                        stat.dataType === 'number'
                                          ? 'border-blue-200 text-blue-700 dark:border-blue-800 dark:text-blue-400'
                                          : stat.dataType === 'datetime'
                                            ? 'border-green-200 text-green-700 dark:border-green-800 dark:text-green-400'
                                            : stat.dataType === 'boolean'
                                              ? 'border-purple-200 text-purple-700 dark:border-purple-800 dark:text-purple-400'
                                              : 'border-gray-200 text-gray-700 dark:border-gray-800 dark:text-gray-400'
                                      }`}
                                    >
                                      {stat.dataType}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className='px-3 py-2 text-xs'>
                                    <div className='flex items-center gap-2'>
                                      <span className='font-mono'>
                                        {stat.nullCount}
                                      </span>
                                      {stat.nullCount > 0 && queryStats.rowCount > 0 && (
                                        <Badge variant='secondary' className='text-xs'>
                                          {(
                                            (stat.nullCount / queryStats.rowCount) *
                                            100
                                          ).toFixed(1)}
                                          %
                                        </Badge>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell className='px-3 py-2 text-xs font-mono'>
                                    {stat.uniqueCount.toLocaleString()}
                                  </TableCell>
                                  <TableCell className='px-3 py-2 text-xs font-mono'>
                                    {stat.dataType === 'number' &&
                                    stat.min !== undefined
                                      ? typeof stat.min === 'number'
                                        ? stat.min.toFixed(2)
                                        : stat.min
                                      : '-'}
                                  </TableCell>
                                  <TableCell className='px-3 py-2 text-xs font-mono'>
                                    {stat.dataType === 'number' &&
                                    stat.max !== undefined
                                      ? typeof stat.max === 'number'
                                        ? stat.max.toFixed(2)
                                        : stat.max
                                      : '-'}
                                  </TableCell>
                                  <TableCell className='px-3 py-2 text-xs font-mono'>
                                    {stat.dataType === 'number' &&
                                    stat.mean !== undefined
                                      ? stat.mean.toFixed(2)
                                      : '-'}
                                  </TableCell>
                                  <TableCell className='px-3 py-2 text-xs font-mono'>
                                    {stat.dataType === 'number' &&
                                    stat.median !== undefined
                                      ? stat.median.toFixed(2)
                                      : '-'}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      ) : (
                        <div className='text-center py-8 text-muted-foreground text-sm'>
                          {tQuery('resultPanel.fieldStatistics.noStats')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          ) : (
            <div className='h-full flex items-center justify-center'>
              <div className='text-center text-muted-foreground'>
                <Info className='w-16 h-16 mx-auto mb-4 opacity-50' />
                <p className='text-sm'>{tQuery('resultPanel.fieldStatistics.executeToView')}</p>
              </div>
            </div>
          )}
        </TabsContent>

        {/* 数据样本标签页 */}
        <TabsContent value='preview' className='flex-1 overflow-hidden mt-0'>
          {parsedData ? (
            <div className='h-full flex flex-col'>
              {/* 数据样本头部 */}
              <div className='flex-shrink-0 bg-muted/50 border-b px-4 py-2'>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-2'>
                    <Eye className='w-4 h-4' />
                    <span className='text-sm font-medium'>{tQuery('resultPanel.fieldStatistics.dataSample')}</span>
                    <Badge variant='outline' className='text-xs'>
                      {tQuery('resultPanel.fieldStatistics.firstRows')}
                    </Badge>
                  </div>
                  <div className='flex items-center gap-2'>
                    <Button variant='outline' size='sm' className='text-xs'>
                      <Download className='w-3 h-3 mr-1' />
                      {tQuery('resultPanel.fieldStatistics.exportSample')}
                    </Button>
                  </div>
                </div>
              </div>

              {/* 数据表格 - 使用UnifiedDataTable组件支持高级功能 */}
              <div className='flex-1 min-h-0'>
                <GlideDataTable
                  data={parsedData.data.map((row, index) => ({
                    _id: `table-${index}`,
                    ...row,
                  }))}
                  columns={parsedData.columns.map(column => {
                    return {
                      key: column,
                      title: column,
                      width: column === 'time' ? 180 : 120,
                      sortable: true,
                      filterable: true,
                      render: (value: any) => {
                        if (column === 'time' && value) {
                          return new Date(value).toLocaleString();
                        }
                        return value !== null && value !== undefined
                          ? String(value)
                          : '-';
                      },
                    };
                  })}
                  loading={false}
                  pagination={{
                    current: currentPage,
                    pageSize,
                    total: parsedData.data.length,
                    showSizeChanger: true,
                    pageSizeOptions: ['500', '1000', '2000', '5000', 'all'],
                  }}
                  height={600} // 设置高度
                  maxHeight={600} // 设置最大高度
                  searchable={true}
                  filterable={true}
                  sortable={true}
                  exportable={true}
                  columnManagement={true}
                  className='h-full'
                  tableName='data_preview'
                  dataSourceType={dataSourceType}
                  database={currentConnection?.database}
                  onPageChange={handlePageChange}
                />
              </div>
            </div>
          ) : (
            <div className='h-full flex items-center justify-center'>
              <div className='text-center text-muted-foreground'>
                <Eye className='w-16 h-16 mx-auto mb-4 opacity-50' />
                <p className='text-sm'>{tQuery('resultPanel.fieldStatistics.executeToPreview')}</p>
              </div>
            </div>
          )}
        </TabsContent>

        {/* 动态可视化标签页 - 为每个查询结果创建一个可视化tab */}
        {allResults.map((result, index) => {
          const isChartable =
            result &&
            result.data &&
            Array.isArray(result.data) &&
            result.data.length > 0;
          if (!isChartable) return null;

          const chartOption = generateChartOption(result, visualizationType);
          const parsedResult = parseQueryResult(result);
          const tableName =
            executedQueries && executedQueries[index]
              ? extractTableName(executedQueries[index])
              : '';

          // 计算可用的字符串字段
          const availableStringFields = parsedResult
            ? parsedResult.columns.filter(col => {
                const values = parsedResult.data.map(row => row[col]).filter(v => v !== null && v !== undefined);
                if (values.length === 0) return false;
                const firstValue = values[0];
                return typeof firstValue === 'string' && !/^\d{4}-\d{2}-\d{2}/.test(firstValue);
              })
            : [];

          return (
            <TabsContent
              key={`visualization-${index}`}
              value={`visualization-${index}`}
              className='flex-1 p-4 space-y-4 mt-0'
            >
              {chartOption ? (
                <div className='h-full flex flex-col'>
                  <div className='flex items-center justify-between mb-4'>
                    <div className='flex items-center gap-4'>
                      <h3 className='text-sm font-medium'>
                        {tQuery('resultPanel.visualization.title')} {allResults.length > 1 ? `${index + 1}` : ''}
                      </h3>
                      {/* 表名标注 */}
                      {tableName && (
                        <div className='flex items-center gap-2'>
                          <span className='text-sm text-muted-foreground'>
                            {tQuery('resultPanel.visualization.dataSource')}
                          </span>
                          <span className='px-2 py-1 bg-primary/10 text-primary rounded-md text-sm font-medium border border-primary/20'>
                            {tableName}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className='flex items-center gap-2 flex-wrap'>
                      {/* 图表标题编辑器 */}
                      <div className='flex items-center gap-1'>
                        {isEditingTitle ? (
                          <div className='flex items-center gap-1'>
                            <Input
                              value={customChartTitle}
                              onChange={e =>
                                setCustomChartTitle(e.target.value)
                              }
                              placeholder={tQuery('resultPanel.visualization.enterChartTitle')}
                              className='h-7 w-40 text-xs'
                              autoFocus
                              onKeyDown={e => {
                                if (e.key === 'Enter') {
                                  setIsEditingTitle(false);
                                } else if (e.key === 'Escape') {
                                  setCustomChartTitle('');
                                  setIsEditingTitle(false);
                                }
                              }}
                            />
                            <Button
                              variant='ghost'
                              size='sm'
                              className='h-7 w-7 p-0'
                              onClick={() => setIsEditingTitle(false)}
                            >
                              <Check className='w-3 h-3' />
                            </Button>
                            <Button
                              variant='ghost'
                              size='sm'
                              className='h-7 w-7 p-0'
                              onClick={() => {
                                setCustomChartTitle('');
                                setIsEditingTitle(false);
                              }}
                            >
                              <X className='w-3 h-3' />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant='outline'
                            size='sm'
                            className='text-xs'
                            onClick={() => setIsEditingTitle(true)}
                          >
                            <Edit2 className='w-3 h-3 mr-1' />
                            {customChartTitle || tQuery('resultPanel.visualization.editTitle')}
                          </Button>
                        )}
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant='outline'
                            size='sm'
                            className='text-xs'
                          >
                            {visualizationType === 'line' && (
                              <LineChart className='w-3 h-3 mr-1' />
                            )}
                            {visualizationType === 'bar' && (
                              <BarChart className='w-3 h-3 mr-1' />
                            )}
                            {visualizationType === 'pie' && (
                              <PieChart className='w-3 h-3 mr-1' />
                            )}
                            {visualizationType === 'area' && (
                              <AreaChart className='w-3 h-3 mr-1' />
                            )}
                            {visualizationType === 'scatter' && (
                              <ScatterChart className='w-3 h-3 mr-1' />
                            )}
                            {visualizationType === 'heatmap' && (
                              <Grid3x3 className='w-3 h-3 mr-1' />
                            )}
                            {visualizationType === 'radar' && (
                              <Radar className='w-3 h-3 mr-1' />
                            )}
                            {visualizationType === 'category-bar' && (
                              <BarChart className='w-3 h-3 mr-1' />
                            )}
                            {visualizationType === 'category-pie' && (
                              <PieChart className='w-3 h-3 mr-1' />
                            )}
                            {visualizationType === 'line' && tQuery('resultPanel.visualization.chartTypes.line')}
                            {visualizationType === 'bar' && tQuery('resultPanel.visualization.chartTypes.bar')}
                            {visualizationType === 'pie' && tQuery('resultPanel.visualization.chartTypes.pie')}
                            {visualizationType === 'area' && tQuery('resultPanel.visualization.chartTypes.area')}
                            {visualizationType === 'scatter' && tQuery('resultPanel.visualization.chartTypes.scatter')}
                            {visualizationType === 'heatmap' && tQuery('resultPanel.visualization.chartTypes.heatmap')}
                            {visualizationType === 'radar' && tQuery('resultPanel.visualization.chartTypes.radar')}
                            {visualizationType === 'category-bar' && tQuery('resultPanel.visualization.chartTypes.categoryBar')}
                            {visualizationType === 'category-pie' && tQuery('resultPanel.visualization.chartTypes.categoryPie')}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem
                            onClick={() => setVisualizationType('line')}
                          >
                            <LineChart className='w-3 h-3 mr-2' />
                            {tQuery('resultPanel.visualization.chartTypes.line')}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setVisualizationType('area')}
                          >
                            <AreaChart className='w-3 h-3 mr-2' />
                            {tQuery('resultPanel.visualization.chartTypes.area')}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setVisualizationType('bar')}
                          >
                            <BarChart className='w-3 h-3 mr-2' />
                            {tQuery('resultPanel.visualization.chartTypes.bar')}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setVisualizationType('scatter')}
                          >
                            <ScatterChart className='w-3 h-3 mr-2' />
                            {tQuery('resultPanel.visualization.chartTypes.scatter')}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setVisualizationType('heatmap')}
                          >
                            <Grid3x3 className='w-3 h-3 mr-2' />
                            {tQuery('resultPanel.visualization.chartTypes.heatmap')}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setVisualizationType('radar')}
                          >
                            <Radar className='w-3 h-3 mr-2' />
                            {tQuery('resultPanel.visualization.chartTypes.radar')}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setVisualizationType('pie')}
                          >
                            <PieChart className='w-3 h-3 mr-2' />
                            {tQuery('resultPanel.visualization.chartTypes.pie')}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuLabel className='text-xs'>
                            {tQuery('resultPanel.visualization.categoricalFieldStats')}
                          </DropdownMenuLabel>
                          <DropdownMenuItem
                            onClick={() => setVisualizationType('category-bar')}
                          >
                            <BarChart className='w-3 h-3 mr-2' />
                            {tQuery('resultPanel.visualization.chartTypes.categoryBar')}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setVisualizationType('category-pie')}
                          >
                            <PieChart className='w-3 h-3 mr-2' />
                            {tQuery('resultPanel.visualization.chartTypes.categoryPie')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      {/* 数值字段选择器 - 仅在数值图表时显示 */}
                      {visualizationType !== 'category-bar' &&
                       visualizationType !== 'category-pie' &&
                       availableNumericFields.length > 0 && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant='outline'
                              size='sm'
                              className='text-xs'
                            >
                              <Filter className='w-3 h-3 mr-1' />
                              {tQuery('resultPanel.visualization.fieldsSelected')} ({selectedFields.length}/
                              {availableNumericFields.length})
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className='w-72'>
                            <DropdownMenuLabel>{tQuery('resultPanel.visualization.selectFields')}</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {availableNumericFields.map(field => (
                              <div
                                key={field}
                                className='flex items-center gap-1 px-2 py-1.5 hover:bg-accent'
                              >
                                <DropdownMenuCheckboxItem
                                  checked={selectedFields.includes(field)}
                                  onCheckedChange={() =>
                                    handleFieldToggle(field)
                                  }
                                  className='flex-1 cursor-pointer'
                                >
                                  <span className='flex-1'>
                                    {getFieldDisplayName(field)}
                                    {fieldAliases[field] && (
                                      <span className='text-xs text-muted-foreground ml-1'>
                                        ({field})
                                      </span>
                                    )}
                                  </span>
                                </DropdownMenuCheckboxItem>
                                {editingFieldAlias === field ? (
                                  <div
                                    className='flex items-center gap-1'
                                    onClick={e => e.stopPropagation()}
                                  >
                                    <Input
                                      value={fieldAliases[field] || ''}
                                      onChange={e =>
                                        handleSetFieldAlias(
                                          field,
                                          e.target.value
                                        )
                                      }
                                      placeholder={field}
                                      className='h-6 w-24 text-xs'
                                      autoFocus
                                      onKeyDown={e => {
                                        if (e.key === 'Enter') {
                                          setEditingFieldAlias(null);
                                        } else if (e.key === 'Escape') {
                                          handleSetFieldAlias(field, '');
                                          setEditingFieldAlias(null);
                                        }
                                      }}
                                    />
                                    <Button
                                      variant='ghost'
                                      size='sm'
                                      className='h-6 w-6 p-0'
                                      onClick={() => setEditingFieldAlias(null)}
                                    >
                                      <Check className='w-3 h-3' />
                                    </Button>
                                  </div>
                                ) : (
                                  <Button
                                    variant='ghost'
                                    size='sm'
                                    className='h-6 w-6 p-0'
                                    onClick={e => {
                                      e.stopPropagation();
                                      setEditingFieldAlias(field);
                                    }}
                                  >
                                    <Edit2 className='w-3 h-3' />
                                  </Button>
                                )}
                              </div>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                      {/* 分类字段选择器 - 仅在分类图表时显示 */}
                      {(visualizationType === 'category-bar' || visualizationType === 'category-pie') &&
                       availableStringFields.length > 0 && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant='outline'
                              size='sm'
                              className='text-xs'
                            >
                              <Tag className='w-3 h-3 mr-1' />
                              {selectedCategoryField
                                ? getFieldDisplayName(selectedCategoryField)
                                : tQuery('resultPanel.visualization.selectCategoryField')}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className='w-56'>
                            <DropdownMenuLabel>选择分类字段</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {availableStringFields.map(field => (
                              <DropdownMenuItem
                                key={field}
                                onClick={() => setSelectedCategoryField(field)}
                              >
                                {getFieldDisplayName(field)}
                                {fieldAliases[field] && (
                                  <span className='text-xs text-muted-foreground ml-1'>
                                    ({field})
                                  </span>
                                )}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                      <Button
                        variant='outline'
                        size='sm'
                        className='text-xs'
                        onClick={handleExportChart}
                      >
                        <Download className='w-3 h-3 mr-1' />
                        {tQuery('resultPanel.visualization.exportChart')}
                      </Button>
                    </div>
                  </div>
                  <div className='flex-1 bg-background rounded border flex flex-col'>
                    <div className='flex-1'>
                      <EChartsReact
                        ref={chartRef}
                        option={chartOption}
                        style={{ height: '100%' }}
                        notMerge={true}
                        lazyUpdate={true}
                        theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
                      />
                    </div>
                    {/* 饼图和雷达图的时间轴控制器 */}
                    {(visualizationType === 'pie' ||
                      visualizationType === 'radar') &&
                      parsedResult &&
                      parsedResult.data.length > 1 && (
                        <div className='px-6 py-3 border-t bg-muted/30'>
                          <div className='flex items-center gap-4'>
                            <span className='text-xs text-muted-foreground whitespace-nowrap'>
                              {tQuery('resultPanel.visualization.timePoint')}
                            </span>
                            <Slider
                              value={[timePointIndex]}
                              onValueChange={value =>
                                setTimePointIndex(value[0])
                              }
                              min={0}
                              max={parsedResult.data.length - 1}
                              step={1}
                              className='flex-1'
                            />
                            <span className='text-xs text-muted-foreground whitespace-nowrap min-w-[140px]'>
                              {parsedResult.data[timePointIndex] &&
                                parsedResult.columns.find(col => {
                                  const firstValue = parsedResult.data[0][col];
                                  return (
                                    firstValue instanceof Date ||
                                    /^\d{4}-\d{2}-\d{2}/.test(
                                      String(firstValue)
                                    )
                                  );
                                }) &&
                                new Date(
                                  parsedResult.data[timePointIndex][
                                    parsedResult.columns.find(col => {
                                      const firstValue =
                                        parsedResult.data[0][col];
                                      return (
                                        firstValue instanceof Date ||
                                        /^\d{4}-\d{2}-\d{2}/.test(
                                          String(firstValue)
                                        )
                                      );
                                    })!
                                  ]
                                ).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      )}
                  </div>
                </div>
              ) : (
                <div className='flex items-center justify-center h-full'>
                  <div className='text-center text-muted-foreground'>
                    <BarChart3 className='w-16 h-16 mx-auto mb-4 opacity-50' />
                    <p className='text-sm'>
                      查询结果 {index + 1} 暂无可视化数据
                    </p>
                    <p className='text-xs mt-1'>
                      执行包含时间和数值字段的查询以生成图表
                    </p>
                  </div>
                </div>
              )}
            </TabsContent>
          );
        })}

        {/* 数据洞察标签页 - 优化为显示所有查询的洞察 */}
        <TabsContent value='insights' className='flex-1 overflow-hidden mt-0'>
          {allDataInsights.length > 0 && allDataInsights.some(q => q.insights.length > 0) ? (
            <div className='h-full flex flex-col'>
              {/* 洞察头部 */}
              <div className='flex-shrink-0 bg-muted/50 border-b px-4 py-2'>
                <div className='flex items-center gap-2'>
                  <Brain className='w-4 h-4' />
                  <span className='text-sm font-medium'>{tQuery('resultPanel.insights.title')}</span>
                  <Badge variant='outline' className='text-xs'>
                    {allDataInsights.length} {tQuery('resultPanel.fieldStatistics.queries')}
                  </Badge>
                  <Badge variant='secondary' className='text-xs'>
                    {allDataInsights.reduce((sum, q) => sum + q.insights.length, 0)} {tQuery('resultPanel.insights.insightsCount')}
                  </Badge>
                </div>
              </div>

              {/* 可滚动的洞察内容 - 按查询分组 */}
              <ScrollArea className='flex-1'>
                <div className='p-3 space-y-4'>
                  {allDataInsights.map((queryInsights, queryIndex) => (
                    queryInsights.insights.length > 0 && (
                      <div key={queryIndex} className='space-y-2'>
                        {/* 查询标题 */}
                        <div className='flex items-center gap-2 pb-1.5 border-b'>
                          <Badge variant='default' className='text-xs'>
                            {tQuery('resultPanel.fieldStatistics.query')} {queryIndex + 1}
                          </Badge>
                          <span className='text-xs text-muted-foreground font-mono truncate max-w-md'>
                            {queryInsights.queryText}
                          </span>
                          <Badge variant='secondary' className='text-xs ml-auto'>
                            {queryInsights.insights.length} {tQuery('resultPanel.insights.insightsCount')}
                          </Badge>
                        </div>

                        {/* 洞察卡片列表 */}
                        <div className='space-y-2'>
                          {queryInsights.insights.map((insight, insightIndex) => (
                            <Card
                              key={insightIndex}
                              className={`border-l-4 ${
                                insight.severity === 'high'
                                  ? 'border-l-red-500 dark:border-l-red-600'
                                  : insight.severity === 'medium'
                                    ? 'border-l-yellow-500 dark:border-l-yellow-600'
                                    : 'border-l-blue-500 dark:border-l-blue-600'
                              }`}
                            >
                              <CardHeader className='p-3 pb-1.5'>
                                <CardTitle className='text-sm flex items-center gap-2'>
                                  {insight.type === 'trend' && (
                                    <TrendingUp className='w-3.5 h-3.5' />
                                  )}
                                  {insight.type === 'anomaly' && (
                                    <AlertTriangle className='w-3.5 h-3.5' />
                                  )}
                                  {insight.type === 'pattern' && (
                                    <Eye className='w-3.5 h-3.5' />
                                  )}
                                  {insight.type === 'suggestion' && (
                                    <Lightbulb className='w-3.5 h-3.5' />
                                  )}
                                  {insight.title}
                                  <Badge
                                    variant={
                                      insight.severity === 'high'
                                        ? 'destructive'
                                        : insight.severity === 'medium'
                                          ? 'default'
                                          : 'secondary'
                                    }
                                    className='text-xs ml-auto'
                                  >
                                    {insight.severity === 'high'
                                      ? tQuery('resultPanel.insights.severity.high')
                                      : insight.severity === 'medium'
                                        ? tQuery('resultPanel.insights.severity.medium')
                                        : tQuery('resultPanel.insights.severity.low')}
                                  </Badge>
                                </CardTitle>
                              </CardHeader>
                              <CardContent className='p-3 pt-0'>
                                <p className='text-sm text-muted-foreground leading-relaxed'>
                                  {insight.description}
                                </p>
                                <div className='mt-1.5 flex items-center gap-2'>
                                  <span className='text-xs text-muted-foreground'>
                                    {tQuery('resultPanel.insights.confidence')}
                                  </span>
                                  <Progress
                                    value={insight.confidence * 100}
                                    className='h-1 flex-1'
                                  />
                                  <span className='text-xs font-mono'>
                                    {(insight.confidence * 100).toFixed(0)}%
                                  </span>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )
                  ))}
                </div>
              </ScrollArea>
            </div>
          ) : (
            <div className='flex items-center justify-center h-full'>
              <div className='text-center text-muted-foreground'>
                <Brain className='w-16 h-16 mx-auto mb-4 opacity-50' />
                <p className='text-sm'>{tQuery('resultPanel.insights.noInsights')}</p>
                <p className='text-xs mt-1'>{tQuery('resultPanel.insights.executeForInsights')}</p>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* 导出选项对话框 */}
      <ExportOptionsDialog
        open={showExportDialog}
        onClose={() => setShowExportDialog(false)}
        onExport={options => {
          // 找到当前活跃的查询结果索引
          const activeTabMatch = activeTab.match(/^data-(\d+)$/);
          const resultIndex = activeTabMatch ? parseInt(activeTabMatch[1]) : 0;
          handleExportData(options, resultIndex);
        }}
        defaultTableName={(() => {
          // 获取当前活跃的查询结果名称
          const activeTabMatch = activeTab.match(/^data-(\d+)$/);
          const resultIndex = activeTabMatch ? parseInt(activeTabMatch[1]) : 0;
          const result = allResults[resultIndex];
          const series = result?.results?.[0]?.series?.[0];
          return series?.name || `query_result_${resultIndex + 1}`;
        })()}
        rowCount={parsedData?.rowCount || 0}
        columnCount={parsedData?.columns.length || 0}
      />

      {/* 字段统计导出对话框 */}
      <ExportOptionsDialog
        open={showStatisticsExportDialog}
        onClose={() => setShowStatisticsExportDialog(false)}
        onExport={handleExportStatistics}
        defaultTableName='field_statistics'
        rowCount={allFieldStatistics.reduce((sum, q) => sum + q.statistics.length, 0)}
        columnCount={8}
      />
    </div>
  );
};

export default EnhancedResultPanel;
