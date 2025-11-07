import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Plus,
  Trash2,
  Copy,
  Play,
  Code,
} from 'lucide-react';
import { safeTauriInvoke } from '@/utils/tauri';
import { showMessage } from '@/utils/message';
import { SimpleCodeEditor } from '@/components/common/SimpleCodeEditor';
import { useTheme } from '@/components/providers/ThemeProvider';
import logger from '@/utils/logger';

interface QueryBuilderProps {
  open: boolean;
  onClose: () => void;
  connectionId: string;
  database: string;
  table: string;
  onExecute?: (query: string) => void;
}

interface FieldInfo {
  name: string;
  type?: string;
  field_type?: string;
}

interface WhereCondition {
  id: string;
  field: string;
  operator: string;
  value: string;
  logicalOperator: 'AND' | 'OR';
}

const OPERATORS = ['=', '!=', '>', '<', '>=', '<=', 'LIKE', 'IN'];
const AGGREGATE_FUNCTIONS = ['MEAN', 'MAX', 'MIN', 'COUNT', 'SUM', 'FIRST', 'LAST', 'MEDIAN', 'STDDEV'];
const TIME_RANGES = [
  { label: '最近 1 小时', value: 'now() - 1h' },
  { label: '最近 6 小时', value: 'now() - 6h' },
  { label: '最近 12 小时', value: 'now() - 12h' },
  { label: '最近 24 小时', value: 'now() - 24h' },
  { label: '最近 7 天', value: 'now() - 7d' },
  { label: '最近 30 天', value: 'now() - 30d' },
  { label: '自定义', value: 'custom' },
];

export const QueryBuilder: React.FC<QueryBuilderProps> = ({
  open,
  onClose,
  connectionId,
  database,
  table,
  onExecute,
}) => {
  const { resolvedTheme } = useTheme();
  const [fields, setFields] = useState<FieldInfo[]>([]);
  const [tags, setTags] = useState<FieldInfo[]>([]);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [whereConditions, setWhereConditions] = useState<WhereCondition[]>([]);
  const [timeRange, setTimeRange] = useState<string>('now() - 1h');
  const [customTimeStart, setCustomTimeStart] = useState<string>('');
  const [customTimeEnd, setCustomTimeEnd] = useState<string>('');
  const [aggregateFunction, setAggregateFunction] = useState<string>('none');
  const [groupByFields, setGroupByFields] = useState<string[]>([]);
  const [groupByTime, setGroupByTime] = useState<string>('');
  const [orderBy, setOrderBy] = useState<string>('time');
  const [orderDirection, setOrderDirection] = useState<'ASC' | 'DESC'>('DESC');
  const [limit, setLimit] = useState<string>('100');
  const [generatedQuery, setGeneratedQuery] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // 重置所有状态
  const resetState = () => {
    setFields([]);
    setTags([]);
    setSelectedFields([]);
    setSelectedTags([]);
    setWhereConditions([]);
    setTimeRange('now() - 1h');
    setCustomTimeStart('');
    setCustomTimeEnd('');
    setAggregateFunction('none');
    setGroupByFields([]);
    setGroupByTime('');
    setOrderBy('time');
    setOrderDirection('DESC');
    setLimit('100');
    setGeneratedQuery('');
  };

  // 加载字段和标签信息
  useEffect(() => {
    if (open && connectionId && database && table) {
      loadTableSchema();
    } else if (!open) {
      // 对话框关闭时重置状态
      resetState();
    }
  }, [open, connectionId, database, table]);

  const loadTableSchema = async () => {
    setLoading(true);
    try {
      const schema = await safeTauriInvoke<{ tags: FieldInfo[]; fields: FieldInfo[] }>(
        'get_table_schema',
        {
          connectionId,
          database,
          measurement: table,
        }
      );

      setFields(schema.fields || []);
      setTags(schema.tags || []);
    } catch (error) {
      logger.error('加载表结构失败:', error);
      showMessage.error(`加载表结构失败: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // 生成查询语句
  useEffect(() => {
    generateQuery();
  }, [
    selectedFields,
    selectedTags,
    whereConditions,
    timeRange,
    customTimeStart,
    customTimeEnd,
    aggregateFunction,
    groupByFields,
    groupByTime,
    orderBy,
    orderDirection,
    limit,
  ]);

  const generateQuery = () => {
    let query = 'SELECT ';

    // 构建 SELECT 子句
    const selectFields: string[] = [];

    if (aggregateFunction && aggregateFunction !== 'none') {
      // 如果有聚合函数，应用到所有选中的字段
      selectedFields.forEach(field => {
        selectFields.push(`${aggregateFunction}("${field}") AS "${field}_${aggregateFunction.toLowerCase()}"`);
      });
    } else {
      // 没有聚合函数，直接选择字段
      selectedFields.forEach(field => {
        selectFields.push(`"${field}"`);
      });
    }

    // 添加选中的标签
    selectedTags.forEach(tag => {
      selectFields.push(`"${tag}"`);
    });

    if (selectFields.length === 0) {
      selectFields.push('*');
    }

    query += selectFields.join(', ');

    // FROM 子句
    query += ` FROM "${table}"`;

    // WHERE 子句
    const whereClauses: string[] = [];

    // 添加时间范围
    if (timeRange === 'custom' && customTimeStart && customTimeEnd) {
      whereClauses.push(`time >= '${customTimeStart}' AND time <= '${customTimeEnd}'`);
    } else if (timeRange !== 'custom') {
      whereClauses.push(`time > ${timeRange}`);
    }

    // 添加自定义条件
    whereConditions.forEach((condition, index) => {
      if (condition.field && condition.operator && condition.value) {
        let conditionStr = '';
        if (index > 0) {
          conditionStr += ` ${condition.logicalOperator} `;
        }
        
        if (condition.operator === 'IN') {
          conditionStr += `"${condition.field}" ${condition.operator} (${condition.value})`;
        } else if (condition.operator === 'LIKE') {
          conditionStr += `"${condition.field}" ${condition.operator} '${condition.value}'`;
        } else {
          // 判断值是否为数字
          const isNumber = !isNaN(Number(condition.value));
          if (isNumber) {
            conditionStr += `"${condition.field}" ${condition.operator} ${condition.value}`;
          } else {
            conditionStr += `"${condition.field}" ${condition.operator} '${condition.value}'`;
          }
        }
        whereClauses.push(conditionStr);
      }
    });

    if (whereClauses.length > 0) {
      query += ` WHERE ${  whereClauses.join('')}`;
    }

    // GROUP BY 子句
    const groupByClauses: string[] = [];
    if (groupByTime) {
      groupByClauses.push(`time(${groupByTime})`);
    }
    groupByFields.forEach(field => {
      groupByClauses.push(`"${field}"`);
    });

    if (groupByClauses.length > 0) {
      query += ` GROUP BY ${  groupByClauses.join(', ')}`;
    }

    // ORDER BY 子句
    if (orderBy) {
      query += ` ORDER BY ${orderBy} ${orderDirection}`;
    }

    // LIMIT 子句
    if (limit) {
      query += ` LIMIT ${limit}`;
    }

    setGeneratedQuery(query);
  };

  const addWhereCondition = () => {
    const newCondition: WhereCondition = {
      id: Date.now().toString(),
      field: '',
      operator: '=',
      value: '',
      logicalOperator: 'AND',
    };
    setWhereConditions([...whereConditions, newCondition]);
  };

  const removeWhereCondition = (id: string) => {
    setWhereConditions(whereConditions.filter(c => c.id !== id));
  };

  const updateWhereCondition = (id: string, updates: Partial<WhereCondition>) => {
    setWhereConditions(
      whereConditions.map(c => (c.id === id ? { ...c, ...updates } : c))
    );
  };

  const handleCopyQuery = async () => {
    try {
      await navigator.clipboard.writeText(generatedQuery);
      showMessage.success('查询已复制到剪贴板');
    } catch (error) {
      showMessage.error('复制失败');
    }
  };

  const handleExecuteQuery = () => {
    if (onExecute) {
      onExecute(generatedQuery);
      onClose();
    }
  };

  const toggleFieldSelection = (fieldName: string) => {
    setSelectedFields(prev =>
      prev.includes(fieldName)
        ? prev.filter(f => f !== fieldName)
        : [...prev, fieldName]
    );
  };

  const toggleTagSelection = (tagName: string) => {
    setSelectedTags(prev =>
      prev.includes(tagName)
        ? prev.filter(t => t !== tagName)
        : [...prev, tagName]
    );
  };

  const toggleGroupByField = (fieldName: string) => {
    setGroupByFields(prev =>
      prev.includes(fieldName)
        ? prev.filter(f => f !== fieldName)
        : [...prev, fieldName]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle>查询构建器</DialogTitle>
          <DialogDescription>
            可视化构建 InfluxQL 查询语句 - {database}.{table}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex gap-4 px-6 pb-6 min-h-0">
          {/* 左侧：查询配置 */}
          <ScrollArea className="flex-1">
            <div className="space-y-4 pr-4">
              {/* 字段选择 */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">选择字段</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {fields.length === 0 ? (
                    <p className="text-sm text-muted-foreground">加载中...</p>
                  ) : (
                    fields.map(field => (
                      <div key={field.name} className="flex items-center space-x-2">
                        <Checkbox
                          id={`field-${field.name}`}
                          checked={selectedFields.includes(field.name)}
                          onCheckedChange={() => toggleFieldSelection(field.name)}
                        />
                        <label
                          htmlFor={`field-${field.name}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                        >
                          {field.name}
                          <Badge variant="outline" className="ml-2 text-xs">
                            {field.type || field.field_type}
                          </Badge>
                        </label>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              {/* 标签选择 */}
              {tags.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">选择标签</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {tags.map(tag => (
                      <div key={tag.name} className="flex items-center space-x-2">
                        <Checkbox
                          id={`tag-${tag.name}`}
                          checked={selectedTags.includes(tag.name)}
                          onCheckedChange={() => toggleTagSelection(tag.name)}
                        />
                        <label
                          htmlFor={`tag-${tag.name}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {tag.name}
                        </label>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* 时间范围 */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">时间范围</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <Label>预设时间范围</Label>
                    <Select value={timeRange} onValueChange={setTimeRange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TIME_RANGES.map(range => (
                          <SelectItem key={range.value} value={range.value}>
                            {range.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {timeRange === 'custom' && (
                    <div className="space-y-2">
                      <div>
                        <Label>开始时间</Label>
                        <Input
                          type="datetime-local"
                          value={customTimeStart}
                          onChange={(e) => setCustomTimeStart(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>结束时间</Label>
                        <Input
                          type="datetime-local"
                          value={customTimeEnd}
                          onChange={(e) => setCustomTimeEnd(e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* WHERE 条件 */}
              <Card>
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                  <CardTitle className="text-sm">WHERE 条件</CardTitle>
                  <Button size="sm" variant="outline" onClick={addWhereCondition}>
                    <Plus className="w-4 h-4 mr-1" />
                    添加条件
                  </Button>
                </CardHeader>
                <CardContent className="space-y-3">
                  {whereConditions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">暂无条件</p>
                  ) : (
                    whereConditions.map((condition, index) => (
                      <div key={condition.id} className="space-y-2 p-3 border rounded-md">
                        {index > 0 && (
                          <Select
                            value={condition.logicalOperator}
                            onValueChange={(value: 'AND' | 'OR') =>
                              updateWhereCondition(condition.id, { logicalOperator: value })
                            }
                          >
                            <SelectTrigger className="w-24">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="AND">AND</SelectItem>
                              <SelectItem value="OR">OR</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                        <div className="grid grid-cols-12 gap-2">
                          <div className="col-span-4">
                            <Select
                              value={condition.field || undefined}
                              onValueChange={(value) =>
                                updateWhereCondition(condition.id, { field: value })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="选择字段" />
                              </SelectTrigger>
                              <SelectContent>
                                {[...fields, ...tags].map(f => (
                                  <SelectItem key={f.name} value={f.name}>
                                    {f.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="col-span-3">
                            <Select
                              value={condition.operator || undefined}
                              onValueChange={(value) =>
                                updateWhereCondition(condition.id, { operator: value })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="选择操作符" />
                              </SelectTrigger>
                              <SelectContent>
                                {OPERATORS.map(op => (
                                  <SelectItem key={op} value={op}>
                                    {op}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="col-span-4">
                            <Input
                              placeholder="值"
                              value={condition.value}
                              onChange={(e) =>
                                updateWhereCondition(condition.id, { value: e.target.value })
                              }
                            />
                          </div>
                          <div className="col-span-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => removeWhereCondition(condition.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              {/* 聚合函数 */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">聚合函数</CardTitle>
                </CardHeader>
                <CardContent>
                  <Select value={aggregateFunction} onValueChange={setAggregateFunction}>
                    <SelectTrigger>
                      <SelectValue placeholder="选择聚合函数（可选）" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">无</SelectItem>
                      {AGGREGATE_FUNCTIONS.map(func => (
                        <SelectItem key={func} value={func}>
                          {func}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>

              {/* GROUP BY */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">GROUP BY</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <Label>时间分组</Label>
                    <Input
                      placeholder="例如: 1h, 5m, 1d"
                      value={groupByTime}
                      onChange={(e) => setGroupByTime(e.target.value)}
                    />
                  </div>
                  {tags.length > 0 && (
                    <div className="space-y-2">
                      <Label>标签分组</Label>
                      {tags.map(tag => (
                        <div key={tag.name} className="flex items-center space-x-2">
                          <Checkbox
                            id={`group-${tag.name}`}
                            checked={groupByFields.includes(tag.name)}
                            onCheckedChange={() => toggleGroupByField(tag.name)}
                          />
                          <label
                            htmlFor={`group-${tag.name}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            {tag.name}
                          </label>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* ORDER BY 和 LIMIT */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">排序和限制</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>排序字段</Label>
                      <Select value={orderBy} onValueChange={setOrderBy}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="time">time</SelectItem>
                          {selectedFields.map(field => (
                            <SelectItem key={field} value={field}>
                              {field}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>排序方向</Label>
                      <Select value={orderDirection} onValueChange={(value: 'ASC' | 'DESC') => setOrderDirection(value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ASC">升序 (ASC)</SelectItem>
                          <SelectItem value="DESC">降序 (DESC)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>限制行数</Label>
                    <Input
                      type="number"
                      placeholder="100"
                      value={limit}
                      onChange={(e) => setLimit(e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </ScrollArea>

          {/* 右侧：查询预览 */}
          <div className="flex-1 flex flex-col min-h-0">
            <Card className="flex-1 flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Code className="w-4 h-4" />
                    生成的查询
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={handleCopyQuery}>
                      <Copy className="w-4 h-4 mr-1" />
                      复制
                    </Button>
                    <Button size="sm" onClick={handleExecuteQuery}>
                      <Play className="w-4 h-4 mr-1" />
                      执行
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 p-0 min-h-0">
                <SimpleCodeEditor
                  value={generatedQuery}
                  height="100%"
                  language="sql"
                  readOnly={true}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QueryBuilder;

