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
import { GlideDataTable } from '@/components/ui/GlideDataTable';
import { TableToolbar } from '@/components/ui/TableToolbar';
import ExportOptionsDialog, {
  type ExportOptions,
} from '@/components/query/ExportOptionsDialog';
import { exportWithNativeDialog } from '@/utils/nativeExport';
import { showMessage } from '@/utils/message';
import { safeTauriInvoke } from '@/utils/tauri';

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
        console.log(`📏 页面大小变更: ${pageSize} -> ${newSize}`);
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
        showMessage.error('没有可导出的数据');
        return;
      }

      // 获取第一个series的数据
      const series = result.results?.[0]?.series?.[0];
      if (!series || !series.columns || !series.values) {
        showMessage.error('没有可导出的数据');
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
      console.log('EnhancedResultPanel导出调试:', {
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
          `数据已导出为 ${options.format.toUpperCase()} 格式`
        );
        setShowExportDialog(false);
      }
    } catch (error) {
      console.error('导出数据失败:', error);
      showMessage.error('导出数据失败');
    }
  };

  // 导出字段统计
  const handleExportStatistics = async (options: ExportOptions) => {
    try {
      if (!fieldStatistics || fieldStatistics.length === 0) {
        showMessage.warning('没有可导出的字段统计数据');
        return;
      }

      // 将字段统计转换为 QueryResult 格式
      const columns = [
        '字段名',
        '数据类型',
        '空值数量',
        '唯一值数量',
        '最小值',
        '最大值',
        '平均值',
        '中位数',
      ];

      const values = fieldStatistics.map(stat => [
        stat.fieldName,
        stat.dataType,
        stat.nullCount,
        stat.uniqueCount,
        stat.min !== undefined ? String(stat.min) : '-',
        stat.max !== undefined ? String(stat.max) : '-',
        stat.mean !== undefined ? stat.mean.toFixed(3) : '-',
        stat.median !== undefined ? stat.median.toFixed(3) : '-',
      ]);

      const statisticsResult: QueryResult = {
        results: [
          {
            series: [
              {
                name: 'field_statistics',
                columns,
                values,
              },
            ],
          },
        ],
        executionTime: 0,
        rowCount: fieldStatistics.length,
        columns,
        data: values,
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
          `字段统计已导出为 ${options.format.toUpperCase()} 格式`
        );
        setShowStatisticsExportDialog(false);
      }
    } catch (error) {
      console.error('导出字段统计失败:', error);
      showMessage.error('导出字段统计失败');
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
          queryText: executedQueries[index] || `查询 ${index + 1}`,
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
        queryText: executedQueries[index] || `查询 ${index + 1}`,
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
        title: '查询性能较慢',
        description: `查询耗时 ${(executionTime / 1000).toFixed(2)} 秒，建议添加时间范围限制、使用索引或优化查询条件以提高性能。`,
        severity: 'high',
        confidence: 1.0,
      });
    } else if (executionTime > 1000) {
      insights.push({
        type: 'suggestion',
        title: '查询性能可优化',
        description: `查询耗时 ${(executionTime / 1000).toFixed(2)} 秒，性能尚可，但仍有优化空间。`,
        severity: 'low',
        confidence: 0.8,
      });
    }

    // 2. 数据量分析和建议
    if (parsedData.rowCount > 50000) {
      insights.push({
        type: 'suggestion',
        title: '大数据集聚合建议',
        description: `查询返回了 ${parsedData.rowCount.toLocaleString()} 行数据，建议使用 GROUP BY 进行时间聚合（如按分钟、小时聚合）以减少数据量并提高可读性。`,
        severity: 'high',
        confidence: 0.95,
      });
    } else if (parsedData.rowCount > 10000) {
      insights.push({
        type: 'suggestion',
        title: '数据量较大',
        description: `查询返回了 ${parsedData.rowCount.toLocaleString()} 行数据，建议考虑使用时间范围限制或聚合查询以提高性能。`,
        severity: 'medium',
        confidence: 0.85,
      });
    } else if (parsedData.rowCount < 10) {
      insights.push({
        type: 'pattern',
        title: '数据量较少',
        description: `查询仅返回了 ${parsedData.rowCount} 行数据，可能需要检查时间范围或查询条件是否过于严格。`,
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
        title: '数据质量问题',
        description: `字段 ${highNullFields.map(f => f.fieldName).join(', ')} 包含超过50%的空值，可能影响数据分析的准确性。`,
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
          title: '部分字段存在空值',
          description: `字段 ${mediumNullFields.map(f => f.fieldName).join(', ')} 包含 20%-50% 的空值，建议在分析时注意处理空值情况。`,
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
            title: '长时间跨度数据',
            description: `数据时间跨度为 ${timeSpanDays.toFixed(1)} 天，建议使用时间聚合（GROUP BY time(1h) 或 time(1d)）来提高可视化效果。`,
            severity: 'medium',
            confidence: 0.9,
          });
        } else if (timeSpanHours < 1) {
          insights.push({
            type: 'pattern',
            title: '短时间跨度数据',
            description: `数据时间跨度仅为 ${(timeSpanHours * 60).toFixed(1)} 分钟，适合进行细粒度的实时监控分析。`,
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
              title: '高频采样数据',
              description: `平均采样间隔约 ${(avgIntervalSeconds * 1000).toFixed(0)} 毫秒，数据采集频率很高，适合实时监控场景。`,
              severity: 'low',
              confidence: 0.8,
            });
          } else if (avgIntervalSeconds < 60) {
            insights.push({
              type: 'pattern',
              title: '秒级采样数据',
              description: `平均采样间隔约 ${avgIntervalSeconds.toFixed(1)} 秒，数据密度适中，适合短期趋势分析。`,
              severity: 'low',
              confidence: 0.8,
            });
          } else if (avgIntervalSeconds < 3600) {
            insights.push({
              type: 'pattern',
              title: '分钟级采样数据',
              description: `平均采样间隔约 ${(avgIntervalSeconds / 60).toFixed(1)} 分钟，适合中期趋势分析。`,
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
              title: `${field.fieldName} 显著${trend > 0 ? '上升' : '下降'}趋势`,
              description: `字段 ${field.fieldName} 在查询时间范围内${trend > 0 ? '上升' : '下降'}了约 ${Math.abs(trend).toFixed(1)}%，建议关注此变化趋势。`,
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
              title: `${field.fieldName} 存在异常值`,
              description: `检测到 ${outliers.length} 个异常数据点（超出3倍标准差），建议检查数据采集是否正常。`,
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
        title: '低基数字段检测',
        description: `字段 ${lowCardinalityFields.map(f => f.fieldName).join(', ')} 的唯一值数量较少（<10），适合用作分组或分类维度。`,
        severity: 'low',
        confidence: 0.9,
      });
    }

    return insights;
  }, [parsedData, fieldStatistics, executionTime]);

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
      showMessage.error('图表实例未找到');
      return;
    }

    try {
      const chartInstance = chartRef.current.getEchartsInstance();
      if (!chartInstance) {
        showMessage.error('ECharts实例未找到');
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

      showMessage.success('图表已导出为 PNG 格式');
    } catch (error) {
      console.error('导出图表失败:', error);
      showMessage.error(`导出图表失败: ${error}`);
    }
  }, []);

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
        {/* 可滚动的Tab列表 */}
        <ScrollArea className='flex-shrink-0 w-full border-b'>
          <TabsList className='inline-flex h-8 items-center justify-start rounded-none bg-muted p-1 text-muted-foreground w-max min-w-full'>
            {/* 执行器tab */}
            <TabsTrigger
              value='executor'
              className='flex items-center gap-1 px-3 py-1 text-xs flex-shrink-0'
            >
              <Play className='w-3 h-3' />
              执行器
            </TabsTrigger>

          {/* 动态数据tab - 根据SQL语句类型显示不同的tab */}
          {allResults.map((result, index) => {
            const parsedResult = parseQueryResult(result);
            const statementType = sqlStatementTypes[index] || 'UNKNOWN';
            const statementCategory = getSQLStatementCategory(statementType);
            const displayInfo = getSQLStatementDisplayInfo(statementType);

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
                  return '查询结果';
                case 'write':
                  return '写入结果';
                case 'delete':
                  return '删除结果';
                case 'ddl':
                  return '操作结果';
                case 'permission':
                  return '权限结果';
                default:
                  return '执行结果';
              }
            };

            return (
              <TabsTrigger
                key={`data-${index}`}
                value={`data-${index}`}
                className='flex items-center gap-1 px-3 py-1 text-xs flex-shrink-0'
              >
                {getTabIcon()}
                {getTabLabel()} {allResults.length > 1 ? `${index + 1}` : ''}
                {parsedResult && statementCategory === 'query' && (
                  <Badge variant='secondary' className='ml-1 text-xs px-1'>
                    {parsedResult.rowCount}
                  </Badge>
                )}
                {statementCategory !== 'query' && (
                  <Badge variant='outline' className='ml-1 text-xs px-1'>
                    {statementType}
                  </Badge>
                )}
              </TabsTrigger>
            );
          })}

          {/* 字段统计tab - 合并所有结果的统计 */}
          {allResults.length > 0 && (
            <TabsTrigger
              value='statistics'
              className='flex items-center gap-1 px-3 py-1 text-xs flex-shrink-0'
            >
              <Info className='w-3 h-3' />
              字段统计
              {allResults.length > 0 && (
                <Badge variant='secondary' className='ml-1 text-xs px-1'>
                  {allResults.length}
                </Badge>
              )}
            </TabsTrigger>
          )}

          {/* 动态可视化tab - 为每个查询结果创建一个可视化tab */}
          {allResults.map((result, index) => {
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
                可视化 {allResults.length > 1 ? `${index + 1}` : ''}
              </TabsTrigger>
            );
          })}

          {/* 洞察tab */}
          {allResults.length > 0 && (
            <TabsTrigger
              value='insights'
              className='flex items-center gap-1 px-3 py-1 text-xs flex-shrink-0'
            >
              <Brain className='w-3 h-3' />
              洞察
              {dataInsights.length > 0 && (
                <Badge variant='secondary' className='ml-1 text-xs px-1'>
                  {dataInsights.length}
                </Badge>
              )}
            </TabsTrigger>
          )}
          </TabsList>
        </ScrollArea>

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
                    执行概览
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className='space-y-2'>
                    <div className='flex items-center justify-between'>
                      <span className='text-xs text-muted-foreground'>状态</span>
                      <Badge
                        variant={allResults.length > 0 ? 'default' : 'secondary'}
                        className='text-xs'
                      >
                        {allResults.length > 0 ? (
                          <>
                            <CheckCircle className='w-3 h-3 mr-1' />
                            成功
                          </>
                        ) : (
                          <>
                            <Clock className='w-3 h-3 mr-1' />
                            待执行
                          </>
                        )}
                      </Badge>
                    </div>
                    <div className='flex items-center justify-between'>
                      <span className='text-xs text-muted-foreground'>查询数</span>
                      <span className='text-sm font-mono font-semibold'>
                        {executedQueries.length}
                      </span>
                    </div>
                    <div className='flex items-center justify-between'>
                      <span className='text-xs text-muted-foreground'>总耗时</span>
                      <span className='text-sm font-mono font-semibold'>
                        {executionTime}ms
                      </span>
                    </div>
                    {executedQueries.length > 0 && (
                      <div className='flex items-center justify-between'>
                        <span className='text-xs text-muted-foreground'>平均耗时</span>
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
                    性能分析
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className='space-y-3'>
                    <div>
                      <div className='flex justify-between text-xs mb-1'>
                        <span>执行效率</span>
                        <span className='font-medium'>
                          {executionTime < 1000
                            ? '优秀'
                            : executionTime < 5000
                              ? '良好'
                              : '需优化'}
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
                          <span>总返回行数</span>
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
                    优化建议
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className='space-y-2 text-xs'>
                    {executionTime > 5000 ? (
                      <div className='flex items-start gap-2 text-orange-600 dark:text-orange-400'>
                        <AlertTriangle className='w-3 h-3 mt-0.5 flex-shrink-0' />
                        <span>查询较慢，建议添加时间范围或索引</span>
                      </div>
                    ) : executionTime > 1000 ? (
                      <div className='flex items-start gap-2 text-blue-600 dark:text-blue-400'>
                        <Info className='w-3 h-3 mt-0.5 flex-shrink-0' />
                        <span>性能良好，可考虑进一步优化</span>
                      </div>
                    ) : (
                      <div className='flex items-start gap-2 text-green-600 dark:text-green-400'>
                        <CheckCircle className='w-3 h-3 mt-0.5 flex-shrink-0' />
                        <span>查询性能优秀</span>
                      </div>
                    )}
                    {allResults.reduce((sum, r) => sum + (r.rowCount || 0), 0) > 10000 && (
                      <div className='flex items-start gap-2 text-blue-600 dark:text-blue-400'>
                        <Info className='w-3 h-3 mt-0.5 flex-shrink-0' />
                        <span>数据量较大，建议使用聚合查询</span>
                      </div>
                    )}
                    {executedQueries.length > 1 && (
                      <div className='flex items-start gap-2 text-muted-foreground'>
                        <Info className='w-3 h-3 mt-0.5 flex-shrink-0' />
                        <span>批量执行了 {executedQueries.length} 条查询</span>
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
                    执行的查询详情 ({executedQueries.length})
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
                                查询 {index + 1}
                              </Badge>
                              {hasError ? (
                                <Badge variant='destructive' className='text-xs'>
                                  <X className='w-3 h-3 mr-1' />
                                  失败
                                </Badge>
                              ) : (
                                <Badge variant='default' className='text-xs bg-green-500'>
                                  <CheckCircle className='w-3 h-3 mr-1' />
                                  成功
                                </Badge>
                              )}
                              {!hasError && (
                                <span className='text-xs text-muted-foreground'>
                                  返回 <span className='font-mono font-semibold'>{rowCount.toLocaleString()}</span> 行
                                </span>
                              )}
                            </div>
                            <Button
                              variant='ghost'
                              size='sm'
                              className='h-7 px-2'
                              onClick={() => {
                                navigator.clipboard.writeText(query);
                                showMessage.success('SQL已复制到剪贴板');
                              }}
                            >
                              <Copy className='w-3 h-3 mr-1' />
                              <span className='text-xs'>复制</span>
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
                    onQuickExportCSV={() => setShowExportDialog(true)}
                    onAdvancedExport={() => setShowExportDialog(true)}
                    showColumnSelector={false}
                  >
                    {/* 表名标注 */}
                    {tableName && (
                      <div className='flex items-center gap-2 mr-2'>
                        <span className='text-sm text-muted-foreground'>
                          查询表：
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
                        清空
                      </Button>
                    )}
                  </TableToolbar>

                  {/* 高级数据表格 - 完全按照 TableDataBrowser.tsx 的配置 */}
                  <div className='flex-1 min-h-0'>
                    <GlideDataTable
                      data={parsedResult.data.map((row, rowIndex) => ({
                        _id: `result-${rowIndex}`,
                        ...row,
                      }))}
                      columns={parsedResult.columns.map(column => {
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
                    <p className='text-sm'>查询结果 {index + 1} 无数据</p>
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
                        {statementCategory === 'write' && (
                          <CheckCircle className='w-4 h-4 text-green-500' />
                        )}
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
                            清空
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 操作结果内容 */}
                  <div className='flex-1 p-4 space-y-4'>
                    {/* 执行状态 */}
                    <div className='flex items-center gap-2'>
                      <CheckCircle className='w-5 h-5 text-green-500' />
                      <span className='font-medium text-green-700'>
                        {displayInfo.description}执行成功
                      </span>
                    </div>

                    {/* 执行统计 */}
                    <div className='bg-muted/50 rounded-lg p-4 space-y-2'>
                      <div className='flex justify-between'>
                        <span className='text-muted-foreground'>执行时间:</span>
                        <span className='font-mono'>{executionTime}ms</span>
                      </div>
                      {result?.rowCount !== undefined && (
                        <div className='flex justify-between'>
                          <span className='text-muted-foreground'>
                            {statsLabels.rowCount}:
                          </span>
                          <span className='font-mono'>{result.rowCount}</span>
                        </div>
                      )}
                      <div className='flex justify-between'>
                        <span className='text-muted-foreground'>语句类型:</span>
                        <span className='font-mono'>{statementType}</span>
                      </div>
                    </div>

                    {/* 执行的语句 */}
                    {executedQueries[index] && (
                      <div>
                        <span className='font-medium mb-2 block'>
                          执行的语句:
                        </span>
                        <pre className='bg-muted p-3 rounded-md text-xs font-mono overflow-auto'>
                          {executedQueries[index]}
                        </pre>
                      </div>
                    )}

                    {/* JSON结果（如果有） */}
                    {result && (
                      <div>
                        <span className='font-medium mb-2 block'>
                          详细结果:
                        </span>
                        <pre className='bg-muted p-3 rounded-md text-xs font-mono overflow-auto max-h-64'>
                          {JSON.stringify(result, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
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
                    <span className='text-sm font-medium'>字段统计信息</span>
                    <Badge variant='outline' className='text-xs'>
                      {allFieldStatistics.length} 个查询
                    </Badge>
                    <Badge variant='secondary' className='text-xs'>
                      {allFieldStatistics.reduce((sum, q) => sum + q.statistics.length, 0)} 个字段
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
                      导出统计
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
                          查询 {queryIndex + 1}
                        </Badge>
                        <span className='text-xs text-muted-foreground font-mono truncate max-w-md'>
                          {queryStats.queryText}
                        </span>
                        <Badge variant='secondary' className='text-xs ml-auto'>
                          {queryStats.statistics.length} 个字段
                        </Badge>
                        <Badge variant='outline' className='text-xs'>
                          {queryStats.rowCount.toLocaleString()} 行
                        </Badge>
                      </div>

                      {/* 字段统计表格 */}
                      {queryStats.statistics.length > 0 ? (
                        <div className='rounded-md border'>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className='px-3 py-2 text-xs font-medium'>
                                  字段名
                                </TableHead>
                                <TableHead className='px-3 py-2 text-xs font-medium'>
                                  数据类型
                                </TableHead>
                                <TableHead className='px-3 py-2 text-xs font-medium'>
                                  空值数量
                                </TableHead>
                                <TableHead className='px-3 py-2 text-xs font-medium'>
                                  唯一值数量
                                </TableHead>
                                <TableHead className='px-3 py-2 text-xs font-medium'>
                                  最小值
                                </TableHead>
                                <TableHead className='px-3 py-2 text-xs font-medium'>
                                  最大值
                                </TableHead>
                                <TableHead className='px-3 py-2 text-xs font-medium'>
                                  平均值
                                </TableHead>
                                <TableHead className='px-3 py-2 text-xs font-medium'>
                                  中位数
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
                          该查询无字段统计信息
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
                <p className='text-sm'>请执行查询以查看字段统计</p>
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
                    <span className='text-sm font-medium'>数据样本</span>
                    <Badge variant='outline' className='text-xs'>
                      前 10 行
                    </Badge>
                  </div>
                  <div className='flex items-center gap-2'>
                    <Button variant='outline' size='sm' className='text-xs'>
                      <Download className='w-3 h-3 mr-1' />
                      导出样本
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
                  onPageChange={handlePageChange}
                />
              </div>
            </div>
          ) : (
            <div className='h-full flex items-center justify-center'>
              <div className='text-center text-muted-foreground'>
                <Eye className='w-16 h-16 mx-auto mb-4 opacity-50' />
                <p className='text-sm'>请执行查询以预览数据样本</p>
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
                        数据可视化 {allResults.length > 1 ? `${index + 1}` : ''}
                      </h3>
                      {/* 表名标注 */}
                      {tableName && (
                        <div className='flex items-center gap-2'>
                          <span className='text-sm text-muted-foreground'>
                            数据源：
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
                              placeholder='输入图表标题'
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
                            {customChartTitle || '编辑标题'}
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
                            {visualizationType === 'line' && '折线图'}
                            {visualizationType === 'bar' && '柱状图'}
                            {visualizationType === 'pie' && '饼图'}
                            {visualizationType === 'area' && '面积图'}
                            {visualizationType === 'scatter' && '散点图'}
                            {visualizationType === 'heatmap' && '热力图'}
                            {visualizationType === 'radar' && '雷达图'}
                            {visualizationType === 'category-bar' && '分类柱状图'}
                            {visualizationType === 'category-pie' && '分类饼图'}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem
                            onClick={() => setVisualizationType('line')}
                          >
                            <LineChart className='w-3 h-3 mr-2' />
                            折线图
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setVisualizationType('area')}
                          >
                            <AreaChart className='w-3 h-3 mr-2' />
                            面积图
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setVisualizationType('bar')}
                          >
                            <BarChart className='w-3 h-3 mr-2' />
                            柱状图
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setVisualizationType('scatter')}
                          >
                            <ScatterChart className='w-3 h-3 mr-2' />
                            散点图
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setVisualizationType('heatmap')}
                          >
                            <Grid3x3 className='w-3 h-3 mr-2' />
                            热力图
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setVisualizationType('radar')}
                          >
                            <Radar className='w-3 h-3 mr-2' />
                            雷达图
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setVisualizationType('pie')}
                          >
                            <PieChart className='w-3 h-3 mr-2' />
                            饼图
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuLabel className='text-xs'>
                            分类字段统计
                          </DropdownMenuLabel>
                          <DropdownMenuItem
                            onClick={() => setVisualizationType('category-bar')}
                          >
                            <BarChart className='w-3 h-3 mr-2' />
                            分类柱状图
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setVisualizationType('category-pie')}
                          >
                            <PieChart className='w-3 h-3 mr-2' />
                            分类饼图
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
                              字段 ({selectedFields.length}/
                              {availableNumericFields.length})
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className='w-72'>
                            <DropdownMenuLabel>选择显示字段</DropdownMenuLabel>
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
                                : '选择分类字段'}
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
                        导出图表
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
                              时间点:
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

        {/* 数据洞察标签页 */}
        <TabsContent value='insights' className='flex-1 p-4 space-y-4 mt-0'>
          {dataInsights.length > 0 ? (
            <div className='space-y-3'>
              {dataInsights.map((insight, index) => (
                <Card
                  key={index}
                  className={`border-l-4 ${
                    insight.severity === 'high'
                      ? 'border-l-red-500'
                      : insight.severity === 'medium'
                        ? 'border-l-yellow-500'
                        : 'border-l-blue-500'
                  }`}
                >
                  <CardHeader className='pb-2'>
                    <CardTitle className='text-sm flex items-center gap-2'>
                      {insight.type === 'trend' && (
                        <TrendingUp className='w-4 h-4' />
                      )}
                      {insight.type === 'anomaly' && (
                        <AlertTriangle className='w-4 h-4' />
                      )}
                      {insight.type === 'pattern' && (
                        <Eye className='w-4 h-4' />
                      )}
                      {insight.type === 'suggestion' && (
                        <Lightbulb className='w-4 h-4' />
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
                          ? '高'
                          : insight.severity === 'medium'
                            ? '中'
                            : '低'}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className='text-sm text-muted-foreground'>
                      {insight.description}
                    </p>
                    <div className='mt-2 flex items-center gap-2'>
                      <span className='text-xs text-muted-foreground'>
                        置信度:
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
          ) : (
            <div className='flex items-center justify-center h-full'>
              <div className='text-center text-muted-foreground'>
                <Brain className='w-16 h-16 mx-auto mb-4 opacity-50' />
                <p className='text-sm'>暂无数据洞察</p>
                <p className='text-xs mt-1'>执行查询后将自动生成智能分析结果</p>
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
        rowCount={fieldStatistics.length}
        columnCount={8}
      />
    </div>
  );
};

export default EnhancedResultPanel;
