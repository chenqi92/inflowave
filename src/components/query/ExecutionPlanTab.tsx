import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  ChevronRight,
  ChevronDown,
  Activity,
  TrendingUp,
  Hash,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ExecutionPlan, ExecutionPlanStep } from '@/types';
import { useTranslation } from '@/hooks/useTranslation';

interface ExecutionPlanTabProps {
  executionPlan?: ExecutionPlan;
  className?: string;
}

/**
 * 格式化成本
 */
const formatCost = (cost?: number): string => {
  if (cost === undefined || cost === null) return '-';
  return cost.toFixed(2);
};

/**
 * 格式化行数
 */
const formatRows = (rows?: number): string => {
  if (rows === undefined || rows === null) return '-';
  return rows.toLocaleString('zh-CN');
};

/**
 * 获取成本颜色
 */
const getCostColor = (cost?: number): string => {
  if (!cost) return 'text-muted-foreground';
  if (cost < 10) return 'text-green-600 dark:text-green-400';
  if (cost < 100) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
};

/**
 * 执行计划步骤组件
 */
const ExecutionPlanStepItem: React.FC<{
  step: ExecutionPlanStep;
  level: number;
}> = ({ step, level }) => {
  const { t } = useTranslation('query');
  const [expanded, setExpanded] = useState(true);
  const hasChildren = step.children && step.children.length > 0;

  return (
    <div className={cn('border-l-2 border-muted', level > 0 && 'ml-6')}>
      <div 
        className={cn(
          'flex items-start gap-2 p-3 rounded-lg hover:bg-muted/50 transition-colors',
          hasChildren && 'cursor-pointer'
        )}
        onClick={() => hasChildren && setExpanded(!expanded)}
      >
        {/* 展开/折叠图标 */}
        <div className="flex-shrink-0 mt-0.5">
          {hasChildren ? (
            expanded ? (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            )
          ) : (
            <div className="w-4 h-4" />
          )}
        </div>

        {/* 步骤内容 */}
        <div className="flex-1 min-w-0">
          {/* 操作名称 */}
          <div className="flex items-center gap-2 mb-1">
            <Activity className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="font-medium text-sm">{step.operation}</span>
          </div>

          {/* 成本和行数 */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground mb-1">
            {step.cost !== undefined && (
              <div className="flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                <span>{t('execution_plan_tab.cost')}:</span>
                <span className={cn('font-medium', getCostColor(step.cost))}>
                  {formatCost(step.cost)}
                </span>
              </div>
            )}
            {step.rows !== undefined && (
              <div className="flex items-center gap-1">
                <Hash className="w-3 h-3" />
                <span>{t('execution_plan_tab.rows')}:</span>
                <span className="font-medium">{formatRows(step.rows)}</span>
              </div>
            )}
          </div>

          {/* 详细信息 */}
          {step.details && (
            <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded mt-2">
              {step.details}
            </div>
          )}
        </div>
      </div>

      {/* 子步骤 */}
      {hasChildren && expanded && (
        <div className="mt-1">
          {step.children!.map((childStep, index) => (
            <ExecutionPlanStepItem
              key={index}
              step={childStep}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * 执行计划 Tab 组件
 * 展示 EXPLAIN 查询的执行计划
 */
export const ExecutionPlanTab: React.FC<ExecutionPlanTabProps> = ({
  executionPlan,
  className
}) => {
  const { t } = useTranslation('query');

  // 如果没有执行计划
  if (!executionPlan || !executionPlan.steps || executionPlan.steps.length === 0) {
    return (
      <div className={cn('h-full flex items-center justify-center', className)}>
        <div className="text-center text-muted-foreground">
          <Info className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">{t('execution_plan_tab.no_data')}</p>
          <p className="text-xs mt-1">{t('execution_plan_tab.no_data_hint')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('h-full p-4', className)}>
      {/* 执行计划概览 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              {t('execution_plan_tab.total_cost')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn('text-2xl font-bold', getCostColor(executionPlan.totalCost))}>
              {formatCost(executionPlan.totalCost)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Hash className="w-4 h-4" />
              {t('execution_plan_tab.estimated_rows')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatRows(executionPlan.estimatedRows)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Activity className="w-4 h-4" />
              {t('execution_plan_tab.execution_steps')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {executionPlan.steps.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 执行计划树 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="w-4 h-4" />
            {t('execution_plan_tab.plan_details')}
            <Badge variant="outline" className="ml-2 text-xs">
              {t('execution_plan_tab.tree_view')}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            <div className="space-y-2">
              {executionPlan.steps.map((step, index) => (
                <ExecutionPlanStepItem
                  key={index}
                  step={step}
                  level={0}
                />
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* 优化建议 */}
      {executionPlan.totalCost && executionPlan.totalCost > 100 && (
        <Card className="mt-4 border-yellow-500">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
              <Info className="w-4 h-4" />
              {t('execution_plan_tab.optimization_suggestions')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground space-y-2">
              <p>• {t('execution_plan_tab.suggestion_add_index')}</p>
              <p>• {t('execution_plan_tab.suggestion_optimize_where')}</p>
              <p>• {t('execution_plan_tab.suggestion_check_join')}</p>
              <p>• {t('execution_plan_tab.suggestion_partition')}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ExecutionPlanTab;

