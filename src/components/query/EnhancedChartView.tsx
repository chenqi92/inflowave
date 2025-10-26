import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  TrendingUp, 
  BarChart3, 
  PieChart as PieChartIcon,
  Activity,
  Settings,
  Info,
  Download
} from 'lucide-react';
import { cn } from '@/lib/utils';
import SimpleChart from '@/components/common/SimpleChart';
import type { QueryResult } from '@/types';

interface EnhancedChartViewProps {
  result: QueryResult;
  className?: string;
}

/**
 * 检测列是否为数值类型
 */
const isNumericColumn = (data: any[], columnName: string): boolean => {
  if (!data || data.length === 0) return false;
  
  // 检查前几行数据
  const sampleSize = Math.min(10, data.length);
  let numericCount = 0;
  
  for (let i = 0; i < sampleSize; i++) {
    const value = data[i][columnName];
    if (value !== null && value !== undefined && !isNaN(Number(value))) {
      numericCount++;
    }
  }
  
  // 如果超过 80% 的样本是数值，则认为是数值列
  return numericCount / sampleSize > 0.8;
};

/**
 * 检测列是否为时间类型
 */
const isTimeColumn = (data: any[], columnName: string): boolean => {
  if (!data || data.length === 0) return false;
  
  const sampleValue = data[0][columnName];
  if (!sampleValue) return false;
  
  // 检查是否为时间戳或时间字符串
  const timePatterns = [
    /^\d{4}-\d{2}-\d{2}/, // YYYY-MM-DD
    /^\d{2}:\d{2}:\d{2}/, // HH:MM:SS
    /time/i,
    /date/i,
    /timestamp/i,
  ];
  
  return timePatterns.some(pattern => 
    pattern.test(String(sampleValue)) || pattern.test(columnName)
  );
};

/**
 * 自动识别图表数据
 */
const detectChartData = (result: QueryResult) => {
  // 获取数据
  const series = result.results?.[0]?.series?.[0];
  const data = result.data;
  const columns = result.columns || series?.columns || [];
  
  if (!data || data.length === 0 || columns.length === 0) {
    return null;
  }
  
  // 转换数据格式
  const chartData = data.map((row, index) => {
    const obj: any = {};
    columns.forEach((col, colIndex) => {
      obj[col] = row[colIndex];
    });
    return obj;
  });
  
  // 识别时间列
  let timeColumn: string | undefined;
  for (const col of columns) {
    if (isTimeColumn(chartData, col)) {
      timeColumn = col;
      break;
    }
  }
  
  // 识别数值列
  const numericColumns = columns.filter(col => 
    col !== timeColumn && isNumericColumn(chartData, col)
  );
  
  if (numericColumns.length === 0) {
    return null;
  }
  
  return {
    timeColumn,
    valueColumns: numericColumns,
    data: chartData,
    allColumns: columns,
  };
};

/**
 * 增强的图表视图组件
 */
export const EnhancedChartView: React.FC<EnhancedChartViewProps> = ({ 
  result,
  className 
}) => {
  const [chartType, setChartType] = useState<'line' | 'bar' | 'area' | 'pie'>('line');
  const [showSettings, setShowSettings] = useState(false);
  
  // 自动检测图表数据
  const chartData = useMemo(() => detectChartData(result), [result]);
  
  // 选中的数值列
  const [selectedColumns, setSelectedColumns] = useState<string[]>(() => 
    chartData?.valueColumns.slice(0, 5) || []
  );
  
  // 切换列选择
  const toggleColumn = (column: string) => {
    setSelectedColumns(prev => 
      prev.includes(column)
        ? prev.filter(c => c !== column)
        : [...prev, column]
    );
  };
  
  // 准备图表数据
  const preparedChartData = useMemo(() => {
    if (!chartData || selectedColumns.length === 0) return null;
    
    return {
      timeColumn: chartData.timeColumn,
      valueColumns: selectedColumns,
      data: chartData.data,
    };
  }, [chartData, selectedColumns]);
  
  // 如果没有可图表化的数据
  if (!chartData) {
    return (
      <div className={cn('h-full flex items-center justify-center', className)}>
        <div className="text-center text-muted-foreground">
          <Info className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">暂无可图表化的数据</p>
          <p className="text-xs mt-1">查询结果需要包含数值列才能生成图表</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className={cn('h-full p-4 space-y-4', className)}>
      {/* 图表控制栏 */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="w-4 h-4" />
              图表设置
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSettings(!showSettings)}
              >
                <Settings className="w-4 h-4 mr-1" />
                {showSettings ? '隐藏' : '显示'}设置
              </Button>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-1" />
                导出
              </Button>
            </div>
          </div>
        </CardHeader>
        
        {showSettings && (
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 图表类型选择 */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">图表类型</Label>
                <Select value={chartType} onValueChange={(v: any) => setChartType(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="line">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" />
                        <span>折线图</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="bar">
                      <div className="flex items-center gap-2">
                        <BarChart3 className="w-4 h-4" />
                        <span>柱状图</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="area">
                      <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4" />
                        <span>面积图</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="pie">
                      <div className="flex items-center gap-2">
                        <PieChartIcon className="w-4 h-4" />
                        <span>饼图</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* 数值列选择 */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  数值列选择
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {selectedColumns.length}/{chartData.valueColumns.length}
                  </Badge>
                </Label>
                <ScrollArea className="h-32 border rounded-md p-2">
                  <div className="space-y-2">
                    {chartData.valueColumns.map(column => (
                      <div key={column} className="flex items-center space-x-2">
                        <Checkbox
                          id={`col-${column}`}
                          checked={selectedColumns.includes(column)}
                          onCheckedChange={() => toggleColumn(column)}
                        />
                        <label
                          htmlFor={`col-${column}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {column}
                        </label>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </div>
            
            {/* 数据信息 */}
            <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Info className="w-3 h-3" />
                <span>数据行数: {chartData.data.length}</span>
              </div>
              {chartData.timeColumn && (
                <div>时间列: {chartData.timeColumn}</div>
              )}
              <div>数值列: {chartData.valueColumns.length}</div>
            </div>
          </CardContent>
        )}
      </Card>
      
      {/* 图表展示 */}
      <Card>
        <CardContent className="p-4">
          {selectedColumns.length === 0 ? (
            <div className="h-96 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Info className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">请至少选择一个数值列</p>
              </div>
            </div>
          ) : (
            <SimpleChart
              data={preparedChartData}
              type={chartType}
              height={500}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EnhancedChartView;

