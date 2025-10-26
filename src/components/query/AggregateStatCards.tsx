import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Hash, 
  Plus, 
  TrendingUp, 
  TrendingDown, 
  BarChart3,
  Calculator
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { QueryResult, AggregationInfo } from '@/types';

interface AggregateStatCardsProps {
  result: QueryResult;
  className?: string;
}

/**
 * 格式化数字
 */
const formatNumber = (num?: number | null): string => {
  if (num === undefined || num === null) return '-';
  
  // 如果是整数，直接格式化
  if (Number.isInteger(num)) {
    return num.toLocaleString('zh-CN');
  }
  
  // 如果是小数，保留2位小数
  return num.toLocaleString('zh-CN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
};

/**
 * 从查询结果中提取聚合信息
 */
const extractAggregations = (result: QueryResult): AggregationInfo | null => {
  // 优先使用 result.aggregations
  if (result.aggregations) {
    return result.aggregations;
  }

  // 尝试从结果数据中提取聚合值
  const series = result.results?.[0]?.series?.[0];
  if (!series || !series.columns || !series.values || series.values.length === 0) {
    return null;
  }

  const aggregations: AggregationInfo = {};
  const firstRow = series.values[0];

  series.columns.forEach((col, index) => {
    const colLower = col.toLowerCase();
    const value = firstRow[index];
    const numValue = typeof value === 'number' ? value : null;

    if (colLower.includes('count')) {
      aggregations.count = numValue !== null ? Math.floor(numValue) : undefined;
    } else if (colLower.includes('sum')) {
      aggregations.sum = numValue ?? undefined;
    } else if (colLower.includes('avg') || colLower.includes('mean')) {
      aggregations.avg = numValue ?? undefined;
    } else if (colLower.includes('max')) {
      aggregations.max = numValue ?? undefined;
    } else if (colLower.includes('min')) {
      aggregations.min = numValue ?? undefined;
    }
  });

  return Object.keys(aggregations).length > 0 ? aggregations : null;
};

/**
 * 聚合统计卡片组件
 * 用于展示聚合查询（COUNT/SUM/AVG/MAX/MIN）的结果
 */
export const AggregateStatCards: React.FC<AggregateStatCardsProps> = ({ 
  result,
  className 
}) => {
  const aggregations = useMemo(() => extractAggregations(result), [result]);

  if (!aggregations) {
    return (
      <div className={cn('h-full flex items-center justify-center', className)}>
        <div className="text-center text-muted-foreground">
          <Calculator className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">未检测到聚合数据</p>
        </div>
      </div>
    );
  }

  const cards = [];

  // COUNT 卡片
  if (aggregations.count !== undefined) {
    cards.push({
      key: 'count',
      title: '总计 (COUNT)',
      value: aggregations.count,
      icon: Hash,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    });
  }

  // SUM 卡片
  if (aggregations.sum !== undefined) {
    cards.push({
      key: 'sum',
      title: '求和 (SUM)',
      value: aggregations.sum,
      icon: Plus,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-100 dark:bg-green-900/30',
    });
  }

  // AVG 卡片
  if (aggregations.avg !== undefined) {
    cards.push({
      key: 'avg',
      title: '平均值 (AVG)',
      value: aggregations.avg,
      icon: BarChart3,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    });
  }

  // MAX 卡片
  if (aggregations.max !== undefined) {
    cards.push({
      key: 'max',
      title: '最大值 (MAX)',
      value: aggregations.max,
      icon: TrendingUp,
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    });
  }

  // MIN 卡片
  if (aggregations.min !== undefined) {
    cards.push({
      key: 'min',
      title: '最小值 (MIN)',
      value: aggregations.min,
      icon: TrendingDown,
      color: 'text-cyan-600 dark:text-cyan-400',
      bgColor: 'bg-cyan-100 dark:bg-cyan-900/30',
    });
  }

  return (
    <div className={cn('p-4', className)}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.key} className="overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <div className={cn('p-2 rounded-lg', card.bgColor)}>
                    <Icon className={cn('w-4 h-4', card.color)} />
                  </div>
                  {card.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={cn('text-3xl font-bold', card.color)}>
                  {formatNumber(card.value)}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 执行时间和行数信息 */}
      <div className="mt-4 grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              执行时间
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-semibold">
              {result.executionTime !== undefined 
                ? `${result.executionTime}ms` 
                : '-'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              结果行数
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-semibold">
              {formatNumber(result.rowCount)}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AggregateStatCards;

