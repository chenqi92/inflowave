import React, { useState } from 'react';
import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Alert,
  Progress,
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Separator,
} from '@/components/ui';
import { showMessage } from '@/utils/message';
import {
  PlayCircle,
  Database,
  RefreshCw,
  CheckCircle,
  Clock,
  Tag as TagIcon,
  Square,
} from 'lucide-react';

import { useConnectionStore } from '@/store/connection';
import { safeTauriInvoke } from '@/utils/tauri';
import { dataExplorerRefresh } from '@/utils/refreshEvents';
import type { DataPoint, BatchWriteRequest, WriteResult } from '@/types';

interface DataGeneratorProps {
  database?: string;
}

interface GeneratorTask {
  name: string;
  measurement: string;
  description: string;
  fields: string[];
  tags: string[];
  recordCount: number;
  timeRange: string;
}

const DataGenerator: React.FC<DataGeneratorProps> = ({
  database = 'test_db',
}) => {
  const { activeConnectionId } = useConnectionStore();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTask, setCurrentTask] = useState('');
  const [completedTasks, setCompletedTasks] = useState<string[]>([]);
  const [selectedDatabase, setSelectedDatabase] = useState(database);
  const [databases, setDatabases] = useState<string[]>([]);
  const [isStopping, setIsStopping] = useState(false);
  const [shouldStop, setShouldStop] = useState(false);

  // 预定义的数据生成任务
  const generatorTasks: GeneratorTask[] = [
    {
      name: 'IoT传感器数据',
      measurement: 'sensor_data',
      description: '温度、湿度、压力传感器数据',
      fields: ['temperature', 'humidity', 'pressure', 'battery_level'],
      tags: ['device_id', 'location', 'sensor_type'],
      recordCount: 1000,
      timeRange: '24h',
    },
    {
      name: '系统监控数据',
      measurement: 'system_metrics',
      description: 'CPU、内存、磁盘使用率监控',
      fields: ['cpu_usage', 'memory_usage', 'disk_usage', 'network_io'],
      tags: ['hostname', 'environment', 'service'],
      recordCount: 500,
      timeRange: '12h',
    },
    {
      name: '业务指标数据',
      measurement: 'business_metrics',
      description: '收入、订单、用户活跃度指标',
      fields: ['revenue', 'order_count', 'active_users', 'conversion_rate'],
      tags: ['department', 'product', 'region'],
      recordCount: 300,
      timeRange: '7d',
    },
    {
      name: '网络流量数据',
      measurement: 'network_traffic',
      description: '网络带宽、延迟、丢包率数据',
      fields: ['bytes_in', 'bytes_out', 'latency', 'packet_loss'],
      tags: ['interface', 'protocol', 'direction'],
      recordCount: 800,
      timeRange: '6h',
    },
    {
      name: '应用性能数据',
      measurement: 'app_performance',
      description: '响应时间、错误率、吞吐量数据',
      fields: ['response_time', 'error_rate', 'throughput', 'concurrent_users'],
      tags: ['app_name', 'endpoint', 'method'],
      recordCount: 600,
      timeRange: '4h',
    },
  ];

  // 生成DataPoint格式的数据
  const generateDataPoints = (task: GeneratorTask): DataPoint[] => {
    const data: DataPoint[] = [];
    const now = Date.now();
    const timeRangeMs = parseTimeRange(task.timeRange);

    for (let i = 0; i < task.recordCount; i++) {
      // 生成时间戳（在指定时间范围内随机分布）
      const timestamp = new Date(now - Math.random() * timeRangeMs);

      // 生成标签
      const tags: { [key: string]: string } = {};
      task.tags.forEach(tag => {
        let value: string;
        switch (tag) {
          case 'device_id':
            value = `device_${String(Math.floor(Math.random() * 20) + 1).padStart(3, '0')}`;
            break;
          case 'location':
            value = [
              'beijing',
              'shanghai',
              'guangzhou',
              'shenzhen',
              'hangzhou',
            ][Math.floor(Math.random() * 5)];
            break;
          case 'sensor_type':
            value = ['temperature', 'humidity', 'pressure'][
              Math.floor(Math.random() * 3)
            ];
            break;
          case 'hostname':
            value = `server-${String(Math.floor(Math.random() * 10) + 1).padStart(2, '0')}`;
            break;
          case 'environment':
            value = ['production', 'staging', 'development'][
              Math.floor(Math.random() * 3)
            ];
            break;
          case 'service':
            value = ['api', 'web', 'database', 'cache'][
              Math.floor(Math.random() * 4)
            ];
            break;
          case 'department':
            value = ['sales', 'marketing', 'engineering', 'support'][
              Math.floor(Math.random() * 4)
            ];
            break;
          case 'product':
            value = ['product_a', 'product_b', 'product_c'][
              Math.floor(Math.random() * 3)
            ];
            break;
          case 'region':
            value = ['north', 'south', 'east', 'west'][
              Math.floor(Math.random() * 4)
            ];
            break;
          case 'interface':
            value = ['eth0', 'eth1', 'lo', 'wlan0'][
              Math.floor(Math.random() * 4)
            ];
            break;
          case 'protocol':
            value = ['tcp', 'udp', 'icmp'][Math.floor(Math.random() * 3)];
            break;
          case 'direction':
            value = ['inbound', 'outbound'][Math.floor(Math.random() * 2)];
            break;
          case 'app_name':
            value = ['user-service', 'order-service', 'payment-service'][
              Math.floor(Math.random() * 3)
            ];
            break;
          case 'endpoint':
            value = ['/api/users', '/api/orders', '/api/payments', '/api/auth'][
              Math.floor(Math.random() * 4)
            ];
            break;
          case 'method':
            value = ['GET', 'POST', 'PUT', 'DELETE'][
              Math.floor(Math.random() * 4)
            ];
            break;
          default:
            value = `value_${Math.floor(Math.random() * 5)}`;
        }
        tags[tag] = value;
      });

      // 生成字段
      const fields: { [key: string]: number } = {};
      task.fields.forEach(field => {
        let value: number;
        switch (field) {
          case 'temperature':
            value = Math.round((Math.random() * 40 + 10) * 100) / 100; // 10-50°C
            break;
          case 'humidity':
            value = Math.round((Math.random() * 60 + 30) * 100) / 100; // 30-90%
            break;
          case 'pressure':
            value = Math.round((Math.random() * 200 + 950) * 100) / 100; // 950-1150 hPa
            break;
          case 'battery_level':
            value = Math.round(Math.random() * 100 * 100) / 100; // 0-100%
            break;
          case 'cpu_usage':
            value = Math.round(Math.random() * 100 * 100) / 100; // 0-100%
            break;
          case 'memory_usage':
            value = Math.round(Math.random() * 100 * 100) / 100; // 0-100%
            break;
          case 'disk_usage':
            value = Math.round(Math.random() * 100 * 100) / 100; // 0-100%
            break;
          case 'network_io':
            value = Math.round(Math.random() * 1000 * 100) / 100; // 0-1000 MB/s
            break;
          case 'revenue':
            value = Math.round((Math.random() * 10000 + 1000) * 100) / 100; // 1000-11000
            break;
          case 'order_count':
            value = Math.floor(Math.random() * 100); // 0-100
            break;
          case 'active_users':
            value = Math.floor(Math.random() * 1000); // 0-1000
            break;
          case 'conversion_rate':
            value = Math.round(Math.random() * 10 * 100) / 100; // 0-10%
            break;
          case 'bytes_in':
            value = Math.floor(Math.random() * 1000000); // 0-1M bytes
            break;
          case 'bytes_out':
            value = Math.floor(Math.random() * 1000000); // 0-1M bytes
            break;
          case 'latency':
            value = Math.round(Math.random() * 100 * 100) / 100; // 0-100ms
            break;
          case 'packet_loss':
            value = Math.round(Math.random() * 5 * 100) / 100; // 0-5%
            break;
          case 'response_time':
            value = Math.round(Math.random() * 1000 * 100) / 100; // 0-1000ms
            break;
          case 'error_rate':
            value = Math.round(Math.random() * 10 * 100) / 100; // 0-10%
            break;
          case 'throughput':
            value = Math.round(Math.random() * 1000 * 100) / 100; // 0-1000 req/s
            break;
          case 'concurrent_users':
            value = Math.floor(Math.random() * 500); // 0-500
            break;
          default:
            value = Math.round(Math.random() * 100 * 100) / 100;
        }
        fields[field] = value;
      });

      // 构建DataPoint对象
      const dataPoint: DataPoint = {
        measurement: task.measurement,
        tags,
        fields,
        timestamp,
      };
      data.push(dataPoint);
    }

    return data;
  };

  // 解析时间范围
  const parseTimeRange = (timeRange: string): number => {
    const num = parseInt(timeRange);
    const unit = timeRange.slice(-1);
    switch (unit) {
      case 'h':
        return num * 60 * 60 * 1000;
      case 'd':
        return num * 24 * 60 * 60 * 1000;
      case 'm':
        return num * 60 * 1000;
      default:
        return 60 * 60 * 1000; // 默认1小时
    }
  };

  // 加载数据库列表
  const loadDatabases = async () => {
    if (!activeConnectionId) {
      showMessage.error('请先连接到InfluxDB');
      return;
    }

    try {
      const dbList = await safeTauriInvoke<string[]>('get_databases', {
        connectionId: activeConnectionId,
      });
      setDatabases(dbList || []);
      if (dbList && dbList.length > 0) {
        if (!selectedDatabase) {
          setSelectedDatabase(dbList[0]);
        }
        showMessage.success(`已加载 ${dbList.length} 个数据库`);
      } else {
        setSelectedDatabase('');
        showMessage.info('未找到数据库，请先创建数据库');
      }
    } catch (error) {
      console.error('加载数据库列表失败:', error);
      showMessage.error(`加载数据库列表失败: ${error}`);
      setDatabases([]);
      setSelectedDatabase('');
    }
  };

  // 停止数据生成
  const stopGeneration = () => {
    setIsStopping(true);
    setShouldStop(true);
    showMessage.info('正在停止数据生成...');
  };

  // 执行数据生成
  const generateData = async () => {
    if (!activeConnectionId) {
      showMessage.error('请先连接到InfluxDB');
      return;
    }

    if (!selectedDatabase) {
      showMessage.error('请选择目标数据库');
      return;
    }

    setLoading(true);
    setProgress(0);
    setCompletedTasks([]);
    setShouldStop(false);

    try {
      for (let i = 0; i < generatorTasks.length && !shouldStop; i++) {
        const task = generatorTasks[i];
        setCurrentTask(task.name);

        // 检查是否需要停止
        if (shouldStop) {
          showMessage.warning('数据生成已被用户停止');
          break;
        }

        // 生成数据
        const dataPoints = generateDataPoints(task);

        // 分批写入数据 - 增大批次大小以减少HTTP请求
        const batchSize = 500; // 从100增加到500
        const batches = Math.ceil(dataPoints.length / batchSize);

        for (let j = 0; j < batches && !shouldStop; j++) {
          // 检查是否需要停止
          if (shouldStop) {
            showMessage.warning('数据生成已被用户停止');
            break;
          }

          const batch = dataPoints.slice(j * batchSize, (j + 1) * batchSize);

          const request: BatchWriteRequest = {
            connectionId: activeConnectionId,
            database: selectedDatabase,
            points: batch,
            precision: 'ms',
          };

          try {
            const result = await safeTauriInvoke<WriteResult>(
              'write_data_points',
              { request }
            );
            if (result.success) {
              console.log(
                `成功写入批次 ${j + 1}/${batches} 到数据库 "${selectedDatabase}", 表: "${task.measurement}", 数据点: ${batch.length}`
              );
            } else {
              console.error(`写入批次 ${j + 1} 失败:`, result.errors);
              // 如果有错误但不是全部失败，继续处理
              if (result.errors.length < batch.length) {
                showMessage.warning(
                  `批次 ${j + 1} 部分写入失败，继续处理下一批次`
                );
              }
            }
          } catch (error) {
            console.error(`写入批次 ${j + 1} 失败:`, error);
            showMessage.error(`写入批次 ${j + 1} 失败: ${error}`);
            // 继续处理下一批次
          }

          // 更新进度
          const batchProgress =
            ((j + 1) / batches) * (1 / generatorTasks.length);
          const totalProgress = i / generatorTasks.length + batchProgress;
          setProgress(Math.round(totalProgress * 100));

          // 添加小延迟以避免过快的请求
          await new Promise(resolve => setTimeout(resolve, 50));
        }

        if (!shouldStop) {
          setCompletedTasks(prev => [...prev, task.name]);
          console.log(
            `表 "${task.measurement}" 在数据库 "${selectedDatabase}" 中生成完成`
          );
          showMessage.success(
            `数据生成完成: ${task.name} (${task.recordCount} 条记录)`
          );
        }
      }

      if (!shouldStop) {
        setProgress(100);
        setCurrentTask('');
        showMessage.success(
          `所有测试数据已生成到数据库 "${selectedDatabase}"！`
        );

        // 触发数据源面板刷新
        setTimeout(() => {
          dataExplorerRefresh.trigger();
        }, 1000); // 延迟1秒刷新，确保数据已经写入
      } else {
        setCurrentTask('');
        showMessage.info('数据生成已停止');
      }
    } catch (error) {
      console.error('数据生成失败:', error);
      showMessage.error(`数据生成失败: ${error}`);
    } finally {
      setLoading(false);
      setIsStopping(false);
      setShouldStop(false);
    }
  };

  // 组件初始化时加载数据库列表
  React.useEffect(() => {
    if (activeConnectionId) {
      loadDatabases();
    }
  }, [activeConnectionId]);

  // 清空数据
  const clearData = async () => {
    if (!activeConnectionId) {
      showMessage.error('请先连接到InfluxDB');
      return;
    }

    setLoading(true);
    try {
      for (const task of generatorTasks) {
        await safeTauriInvoke('execute_query', {
          request: {
            connectionId: activeConnectionId,
            database: selectedDatabase,
            query: `DROP MEASUREMENT "${task.measurement}"`,
          },
        });
      }
      setCompletedTasks([]);
      showMessage.success('测试数据已清空');
    } catch (error) {
      console.error('清空数据失败:', error);
      showMessage.error(`清空数据失败: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='space-y-6'>
      {/* 页面标题和操作区域 */}
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          <Database className='w-5 h-5' />
          <h2 className='text-xl font-semibold'>InfluxDB 测试数据生成器</h2>
        </div>
        <div className='flex items-center gap-4'>
          <div className='flex items-center gap-2'>
            <span className='text-sm font-medium whitespace-nowrap'>目标数据库:</span>
            <Select
              value={selectedDatabase}
              onValueChange={setSelectedDatabase}
              disabled={!activeConnectionId || databases.length === 0}
            >
              <SelectTrigger className='min-w-[150px]'>
                <SelectValue 
                  placeholder={
                    !activeConnectionId 
                      ? '请先连接数据库' 
                      : databases.length === 0 
                        ? '暂无数据库' 
                        : '选择数据库'
                  } 
                />
              </SelectTrigger>
              <SelectContent>
                {databases.length > 0 ? (
                  databases.map(db => (
                    <SelectItem key={db} value={db}>
                      {db}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="" disabled>
                    暂无数据库
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            <Button
              onClick={loadDatabases}
              disabled={!activeConnectionId}
              variant='outline'
              size='sm'
            >
              <RefreshCw className='w-4 h-4' />
            </Button>
          </div>
          <div className='flex gap-2'>
            {!loading ? (
              <Button
                onClick={generateData}
                disabled={!activeConnectionId || !selectedDatabase}
              >
                <PlayCircle className='w-4 h-4 mr-2' />
                生成数据
              </Button>
            ) : (
              <Button
                onClick={stopGeneration}
                disabled={isStopping}
                variant='destructive'
              >
                <Square className='w-4 h-4 mr-2' />
                {isStopping ? '正在停止...' : '停止生成'}
              </Button>
            )}
            <Button
              onClick={clearData}
              disabled={loading || !activeConnectionId || !selectedDatabase}
              variant='outline'
            >
              <RefreshCw className='w-4 h-4 mr-2' />
              清空数据
            </Button>
          </div>
        </div>
      </div>

      {/* 内容区域 */}
      <div className='space-y-4'>
        {!activeConnectionId && (
          <Alert>
            <div>
              <div className='font-medium'>请先连接到InfluxDB</div>
              <div className='text-sm text-muted-foreground'>
                在连接管理页面选择一个InfluxDB连接并激活后，才能生成测试数据。
              </div>
            </div>
          </Alert>
        )}

        {activeConnectionId && !selectedDatabase && databases.length === 0 && (
          <Alert>
            <div>
              <div className='font-medium'>未找到数据库</div>
              <div className='text-sm text-muted-foreground'>
                当前连接中没有可用的数据库，请先创建一个数据库。
              </div>
            </div>
          </Alert>
        )}

        {activeConnectionId && databases.length > 0 && !selectedDatabase && (
          <Alert className='mb-4'>
            <div>
              <div className='font-medium'>请选择目标数据库</div>
              <div className='text-sm text-muted-foreground'>
                请从上方的下拉框中选择一个数据库来生成测试数据。
              </div>
            </div>
          </Alert>
        )}

        {loading && (
          <div className='mb-4'>
            <Progress value={progress} className='mb-2' />
            {currentTask && (
              <div className='text-sm text-muted-foreground'>
                正在生成: {currentTask}
              </div>
            )}
          </div>
        )}

        <h4 className='text-lg font-semibold mb-4'>将要创建的数据表</h4>
        <div className='space-y-4'>
          {generatorTasks.map((task, index) => (
            <Card key={task.name}>
              <CardHeader className='pb-3'>
                <div className='flex items-center justify-between'>
                  <div className='flex-1'>
                    <CardTitle className='text-base'>{task.name}</CardTitle>
                    <CardDescription className='mt-1'>
                      {task.description}
                    </CardDescription>
                  </div>
                  <div className='flex items-center gap-2'>
                    {completedTasks.includes(task.name) ? (
                      <Badge
                        variant='default'
                        className='bg-green-500/10 text-green-700 border-green-200 dark:bg-green-500/20 dark:text-green-400 dark:border-green-800'
                      >
                        <CheckCircle className='w-3 h-3 mr-1' />
                        已完成
                      </Badge>
                    ) : (
                      <Badge variant='secondary'>
                        {task.recordCount} 条记录
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className='pt-0'>
                <div className='space-y-2'>
                  <div className='flex items-center gap-4 text-sm text-muted-foreground'>
                    <div className='flex items-center gap-1'>
                      <Database className='w-3 h-3' />
                      <span>表名: {task.measurement}</span>
                    </div>
                    <div className='flex items-center gap-1'>
                      <Clock className='w-3 h-3' />
                      <span>时间范围: {task.timeRange}</span>
                    </div>
                  </div>
                  <div className='flex items-center gap-4 text-sm text-muted-foreground'>
                    <div className='flex items-center gap-1'>
                      <TagIcon className='w-3 h-3' />
                      <span>标签: {task.tags.join(', ')}</span>
                    </div>
                    <div className='flex items-center gap-1'>
                      <Database className='w-3 h-3' />
                      <span>字段: {task.fields.join(', ')}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Separator className='my-4' />

        <Alert>
          <div>
            <div className='font-medium mb-2'>数据生成说明</div>
            <div className='space-y-1 text-sm text-muted-foreground'>
              <p>
                • 将在数据库{' '}
                <code className='bg-muted px-2 py-1 rounded text-sm font-mono'>
                  {selectedDatabase || '未选择'}
                </code>{' '}
                中创建 {generatorTasks.length} 张测试数据表
              </p>
              <p>
                • 总共将生成约{' '}
                {generatorTasks.reduce(
                  (sum, task) => sum + task.recordCount,
                  0
                )}{' '}
                条测试记录
              </p>
              <p>• 数据时间戳将分布在指定的时间范围内</p>
              <p>• 所有数值都是随机生成的模拟数据</p>
            </div>
          </div>
        </Alert>
      </div>
    </div>
  );
};

export default DataGenerator;
