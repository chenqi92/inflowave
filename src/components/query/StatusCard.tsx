import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  XCircle, 
  Trash2, 
  Edit,
  Database,
  Clock,
  Hash,
  AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { QueryResult, ExecutionStatistics } from '@/types';
import type { SQLStatementType } from '@/utils/sqlTypeDetector';

interface StatusCardProps {
  result: QueryResult;
  statementType: SQLStatementType;
  className?: string;
}

/**
 * 格式化执行时间
 */
const formatExecutionTime = (ms?: number): string => {
  if (ms === undefined || ms === null) return '-';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
};

/**
 * 格式化数字
 */
const formatNumber = (num?: number): string => {
  if (num === undefined || num === null) return '0';
  return num.toLocaleString('zh-CN');
};

/**
 * 获取状态配置
 */
const getStatusConfig = (
  statementType: SQLStatementType,
  hasError: boolean
) => {
  if (hasError) {
    return {
      icon: XCircle,
      title: '执行失败',
      borderColor: 'border-l-red-500',
      bgColor: 'bg-red-100 dark:bg-red-900/30',
      iconColor: 'text-red-600 dark:text-red-400',
      titleColor: 'text-red-700 dark:text-red-400',
      badgeVariant: 'destructive' as const,
    };
  }

  switch (statementType) {
    case 'INSERT':
    case 'INSERT_SELECT':
      return {
        icon: CheckCircle,
        title: '数据插入成功',
        borderColor: 'border-l-green-500',
        bgColor: 'bg-green-100 dark:bg-green-900/30',
        iconColor: 'text-green-600 dark:text-green-400',
        titleColor: 'text-green-700 dark:text-green-400',
        badgeVariant: 'default' as const,
      };
    case 'UPDATE':
      return {
        icon: Edit,
        title: '数据更新成功',
        borderColor: 'border-l-blue-500',
        bgColor: 'bg-blue-100 dark:bg-blue-900/30',
        iconColor: 'text-blue-600 dark:text-blue-400',
        titleColor: 'text-blue-700 dark:text-blue-400',
        badgeVariant: 'default' as const,
      };
    case 'DELETE':
    case 'TRUNCATE':
      return {
        icon: Trash2,
        title: '数据删除成功',
        borderColor: 'border-l-orange-500',
        bgColor: 'bg-orange-100 dark:bg-orange-900/30',
        iconColor: 'text-orange-600 dark:text-orange-400',
        titleColor: 'text-orange-700 dark:text-orange-400',
        badgeVariant: 'default' as const,
      };
    default:
      return {
        icon: Database,
        title: '操作执行成功',
        borderColor: 'border-l-blue-500',
        bgColor: 'bg-blue-100 dark:bg-blue-900/30',
        iconColor: 'text-blue-600 dark:text-blue-400',
        titleColor: 'text-blue-700 dark:text-blue-400',
        badgeVariant: 'default' as const,
      };
  }
};

/**
 * 获取操作描述
 */
const getOperationDescription = (
  statementType: SQLStatementType,
  statistics?: ExecutionStatistics,
  rowCount?: number,
  executionTime?: number
): string => {
  const affectedRows = statistics?.affectedRows ||
                       statistics?.insertedRows ||
                       statistics?.updatedRows ||
                       statistics?.deletedRows ||
                       rowCount;
  const time = formatExecutionTime(executionTime);

  switch (statementType) {
    case 'INSERT':
    case 'INSERT_SELECT':
      if (affectedRows !== undefined && affectedRows !== null) {
        return `成功插入 ${formatNumber(affectedRows)} 行数据，耗时 ${time}`;
      }
      return `数据插入操作已执行，耗时 ${time}`;
    case 'UPDATE':
      if (affectedRows !== undefined && affectedRows !== null) {
        return `成功更新 ${formatNumber(affectedRows)} 行数据，耗时 ${time}`;
      }
      return `数据更新操作已执行，耗时 ${time}`;
    case 'DELETE':
      // DELETE操作通常不返回具体删除的行数（InfluxDB特性）
      if (affectedRows !== undefined && affectedRows !== null && affectedRows > 0) {
        return `成功删除 ${formatNumber(affectedRows)} 行数据，耗时 ${time}`;
      }
      return `删除操作已成功执行，耗时 ${time}`;
    case 'TRUNCATE':
      return `成功清空表数据，耗时 ${time}`;
    default:
      if (affectedRows !== undefined && affectedRows !== null) {
        return `操作成功，影响 ${formatNumber(affectedRows)} 行，耗时 ${time}`;
      }
      return `操作已成功执行，耗时 ${time}`;
  }
};

/**
 * 状态卡片组件
 * 用于展示 INSERT/UPDATE/DELETE 等操作的执行状态
 */
export const StatusCard: React.FC<StatusCardProps> = ({ 
  result, 
  statementType,
  className 
}) => {
  const hasError = !!result.error;
  const config = getStatusConfig(statementType, hasError);
  const Icon = config.icon;

  return (
    <div className={cn('p-4 space-y-4', className)}>
      {/* 主状态卡片 */}
      <Card className={cn('border-l-4', config.borderColor)}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            {/* 状态图标 */}
            <div className={cn(
              'flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center',
              config.bgColor
            )}>
              <Icon className={cn('w-5 h-5', config.iconColor)} />
            </div>
            
            {/* 状态信息 */}
            <div className="flex-1">
              <h3 className={cn('font-semibold', config.titleColor)}>
                {hasError ? '执行失败' : config.title}
              </h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                {hasError 
                  ? result.error 
                  : getOperationDescription(
                      statementType, 
                      result.statistics, 
                      result.rowCount, 
                      result.executionTime
                    )
                }
              </p>
            </div>
            
            {/* 类型徽章 */}
            <Badge variant={config.badgeVariant} className="text-xs">
              {statementType}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* 详细统计信息 */}
      {!hasError && (() => {
        const affectedRows = result.statistics?.affectedRows ||
                            result.statistics?.insertedRows ||
                            result.statistics?.updatedRows ||
                            result.statistics?.deletedRows ||
                            result.rowCount;

        // 对于DELETE操作，如果没有具体的行数信息，就不显示影响行数卡片
        const showAffectedRows = statementType !== 'DELETE' ||
                                (affectedRows !== undefined && affectedRows !== null && affectedRows > 0);

        return (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* 影响行数 - 仅在有意义时显示 */}
            {showAffectedRows && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Hash className="w-4 h-4" />
                    影响行数
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatNumber(affectedRows || 0)}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 执行时间 */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  执行时间
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatExecutionTime(result.executionTime)}
                </div>
              </CardContent>
            </Card>

            {/* 警告数 */}
            {result.statistics?.warnings !== undefined && result.statistics.warnings > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    警告
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                    {formatNumber(result.statistics.warnings)}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 错误数 */}
            {result.statistics?.errors !== undefined && result.statistics.errors > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <XCircle className="w-4 h-4" />
                    错误
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {formatNumber(result.statistics.errors)}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        );
      })()}

      {/* 特定操作类型的额外信息 */}
      {!hasError && (
        <>
          {/* DELETE 操作的特殊提示 */}
          {statementType === 'DELETE' && (
            <Card className="border-orange-200 dark:border-orange-800">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-600" />
                  DELETE 操作说明
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>✅ DELETE 语句已成功执行</p>
                  <p className="text-xs">
                    ℹ️ InfluxDB 不返回删除的具体行数，这是正常的数据库行为
                  </p>
                  <div className="mt-3 p-3 bg-orange-50 dark:bg-orange-950/30 rounded-md border border-orange-200 dark:border-orange-800">
                    <p className="text-xs font-medium text-orange-900 dark:text-orange-200 mb-2">
                      ⚠️ 重要提示：
                    </p>
                    <ul className="text-xs space-y-1 text-orange-800 dark:text-orange-300">
                      <li>• DELETE WHERE 条件只能使用 <strong>tags</strong> 和 <strong>time</strong></li>
                      <li>• 不能使用 <strong>fields</strong> 作为 WHERE 条件</li>
                      <li>• 如果数据未被删除，请检查 WHERE 条件是否使用了 field</li>
                      <li>• 可以使用 <code className="px-1 py-0.5 bg-orange-100 dark:bg-orange-900 rounded">SHOW TAG KEYS</code> 查看哪些是 tag</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 操作详情 */}
          {result.statistics && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">操作详情</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  {result.statistics.insertedRows !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">插入行数:</span>
                      <span className="font-medium">{formatNumber(result.statistics.insertedRows)}</span>
                    </div>
                  )}
                  {result.statistics.updatedRows !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">更新行数:</span>
                      <span className="font-medium">{formatNumber(result.statistics.updatedRows)}</span>
                    </div>
                  )}
                  {result.statistics.deletedRows !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">删除行数:</span>
                      <span className="font-medium">{formatNumber(result.statistics.deletedRows)}</span>
                    </div>
                  )}
                  {result.statistics.affectedRows !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">总影响行数:</span>
                      <span className="font-medium">{formatNumber(result.statistics.affectedRows)}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default StatusCard;

