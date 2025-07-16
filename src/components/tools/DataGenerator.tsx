import { useForm } from 'react-hook-form';
import React, { useState } from 'react';
import { Button, Select,  Alert, Progress, Typography, Tag, List } from '@/components/ui';
import { showMessage, showNotification } from '@/utils/message';
// TODO: Replace these Ant Design components: message, Divider
import { PlayCircle, Database, RefreshCw, CheckCircle } from 'lucide-react';


import { useConnectionStore } from '@/store/connection';
import { safeTauriInvoke } from '@/utils/tauri';
import { dataExplorerRefresh } from '@/utils/refreshEvents';
import type { DataPoint, BatchWriteRequest, WriteResult } from '@/types';

const { Option } = Select;
const { Title, Text } = Typography;

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

const DataGenerator: React.FC<DataGeneratorProps> = ({ database = 'test_db' }) => {
  const { activeConnectionId } = useConnectionStore();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTask, setCurrentTask] = useState('');
  const [completedTasks, setCompletedTasks] = useState<string[]>([]);
  const [selectedDatabase, setSelectedDatabase] = useState(database);
  const [databases, setDatabases] = useState<string[]>([]);
  const form = useForm();

  // 预定义的数据生成任务
  const generatorTasks: GeneratorTask[] = [
    {
      name: 'IoT传感器数据',
      measurement: 'sensor_data',
      description: '温度、湿度、压力传感器数据',
      fields: ['temperature', 'humidity', 'pressure', 'battery_level'],
      tags: ['device_id', 'location', 'sensor_type'],
      recordCount: 1000,
      timeRange: '24h'},
    {
      name: '系统监控数据',
      measurement: 'system_metrics',
      description: 'CPU、内存、磁盘使用率监控',
      fields: ['cpu_usage', 'memory_usage', 'disk_usage', 'network_io'],
      tags: ['hostname', 'environment', 'service'],
      recordCount: 500,
      timeRange: '12h'},
    {
      name: '业务指标数据',
      measurement: 'business_metrics',
      description: '收入、订单、用户活跃度指标',
      fields: ['revenue', 'order_count', 'active_users', 'conversion_rate'],
      tags: ['department', 'product', 'region'],
      recordCount: 300,
      timeRange: '7d'},
    {
      name: '网络流量数据',
      measurement: 'network_traffic',
      description: '网络带宽、延迟、丢包率数据',
      fields: ['bytes_in', 'bytes_out', 'latency', 'packet_loss'],
      tags: ['interface', 'protocol', 'direction'],
      recordCount: 800,
      timeRange: '6h'},
    {
      name: '应用性能数据',
      measurement: 'app_performance',
      description: '响应时间、错误率、吞吐量数据',
      fields: ['response_time', 'error_rate', 'throughput', 'concurrent_users'],
      tags: ['app_name', 'endpoint', 'method'],
      recordCount: 600,
      timeRange: '4h'},
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
            value = ['beijing', 'shanghai', 'guangzhou', 'shenzhen', 'hangzhou'][Math.floor(Math.random() * 5)];
            break;
          case 'sensor_type':
            value = ['temperature', 'humidity', 'pressure'][Math.floor(Math.random() * 3)];
            break;
          case 'hostname':
            value = `server-${String(Math.floor(Math.random() * 10) + 1).padStart(2, '0')}`;
            break;
          case 'environment':
            value = ['production', 'staging', 'development'][Math.floor(Math.random() * 3)];
            break;
          case 'service':
            value = ['api', 'web', 'database', 'cache'][Math.floor(Math.random() * 4)];
            break;
          case 'department':
            value = ['sales', 'marketing', 'engineering', 'support'][Math.floor(Math.random() * 4)];
            break;
          case 'product':
            value = ['product_a', 'product_b', 'product_c'][Math.floor(Math.random() * 3)];
            break;
          case 'region':
            value = ['north', 'south', 'east', 'west'][Math.floor(Math.random() * 4)];
            break;
          case 'interface':
            value = ['eth0', 'eth1', 'lo', 'wlan0'][Math.floor(Math.random() * 4)];
            break;
          case 'protocol':
            value = ['tcp', 'udp', 'icmp'][Math.floor(Math.random() * 3)];
            break;
          case 'direction':
            value = ['inbound', 'outbound'][Math.floor(Math.random() * 2)];
            break;
          case 'app_name':
            value = ['user-service', 'order-service', 'payment-service'][Math.floor(Math.random() * 3)];
            break;
          case 'endpoint':
            value = ['/api/users', '/api/orders', '/api/payments', '/api/auth'][Math.floor(Math.random() * 4)];
            break;
          case 'method':
            value = ['GET', 'POST', 'PUT', 'DELETE'][Math.floor(Math.random() * 4)];
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
            value = Math.round((Math.random() * 100) * 100) / 100; // 0-100%
            break;
          case 'cpu_usage':
            value = Math.round((Math.random() * 100) * 100) / 100; // 0-100%
            break;
          case 'memory_usage':
            value = Math.round((Math.random() * 100) * 100) / 100; // 0-100%
            break;
          case 'disk_usage':
            value = Math.round((Math.random() * 100) * 100) / 100; // 0-100%
            break;
          case 'network_io':
            value = Math.round((Math.random() * 1000) * 100) / 100; // 0-1000 MB/s
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
            value = Math.round((Math.random() * 10) * 100) / 100; // 0-10%
            break;
          case 'bytes_in':
            value = Math.floor(Math.random() * 1000000); // 0-1M bytes
            break;
          case 'bytes_out':
            value = Math.floor(Math.random() * 1000000); // 0-1M bytes
            break;
          case 'latency':
            value = Math.round((Math.random() * 100) * 100) / 100; // 0-100ms
            break;
          case 'packet_loss':
            value = Math.round((Math.random() * 5) * 100) / 100; // 0-5%
            break;
          case 'response_time':
            value = Math.round((Math.random() * 1000) * 100) / 100; // 0-1000ms
            break;
          case 'error_rate':
            value = Math.round((Math.random() * 10) * 100) / 100; // 0-10%
            break;
          case 'throughput':
            value = Math.round((Math.random() * 1000) * 100) / 100; // 0-1000 req/s
            break;
          case 'concurrent_users':
            value = Math.floor(Math.random() * 500); // 0-500
            break;
          default:
            value = Math.round((Math.random() * 100) * 100) / 100;
        }
        fields[field] = value;
      });
      
      // 构建DataPoint对象
      const dataPoint: DataPoint = {
        measurement: task.measurement,
        tags,
        fields,
        timestamp};
      data.push(dataPoint);
    }
    
    return data;
  };

  // 解析时间范围
  const parseTimeRange = (timeRange: string): number => {
    const num = parseInt(timeRange);
    const unit = timeRange.slice(-1);
    switch (unit) {
      case 'h': return num * 60 * 60 * 1000;
      case 'd': return num * 24 * 60 * 60 * 1000;
      case 'm': return num * 60 * 1000;
      default: return 60 * 60 * 1000; // 默认1小时
    }
  };

  // 加载数据库列表
  const loadDatabases = async () => {
    if (!activeConnectionId) return;

    try {
      const dbList = await safeTauriInvoke<string[]>('get_databases', {
        connectionId: activeConnectionId});
      setDatabases(dbList);
      if (dbList.length > 0 && !selectedDatabase) {
        setSelectedDatabase(dbList[0]);
      }
    } catch (error) {
      console.error('加载数据库列表失败:', error);
    }
  };

  // 执行数据生成
  const generateData = async () => {
    if (!activeConnectionId) {
      showMessage.error("请先连接到InfluxDB");
      return;
    }

    if (!selectedDatabase) {
      showMessage.error("请选择目标数据库");
      return;
    }

    setLoading(true);
    setProgress(0);
    setCompletedTasks([]);

    try {
      for (let i = 0; i < generatorTasks.length; i++) {
        const task = generatorTasks[i];
        setCurrentTask(task.name);
        
        // 生成数据
        const dataPoints = generateDataPoints(task);
        
        // 分批写入数据
        const batchSize = 100;
        const batches = Math.ceil(dataPoints.length / batchSize);
        
        for (let j = 0; j < batches; j++) {
          const batch = dataPoints.slice(j * batchSize, (j + 1) * batchSize);
          
          const request: BatchWriteRequest = {
            connectionId: activeConnectionId,
            database: selectedDatabase,
            points: batch,
            precision: 'ms'};
          
          try {
            const result = await safeTauriInvoke<WriteResult>('write_data_points', { request });
            if (result.success) {
              console.log(`成功写入批次 ${j + 1}/${batches} 到数据库 "${selectedDatabase}", 表: "${task.measurement}", 数据点: ${batch.length}`);
            } else {
              console.error(`写入批次 ${j + 1} 失败:`, result.errors);
            }
          } catch (error) {
            console.error(`写入批次 ${j + 1} 失败:`, error);
            // 继续处理下一批次
          }
          
          // 更新进度
          const batchProgress = ((j + 1) / batches) * (1 / generatorTasks.length);
          const totalProgress = (i / generatorTasks.length) + batchProgress;
          setProgress(Math.round(totalProgress * 100));
        }
        
        setCompletedTasks(prev => [...prev, task.name]);
        console.log(`表 "${task.measurement}" 在数据库 "${selectedDatabase}" 中生成完成`);
        showNotification.success({
          message: "数据生成完成",
          description: `${task.name} (${task.recordCount} 条记录)`
        });
      }
      
      setProgress(100);
      setCurrentTask('');
      showMessage.success(`所有测试数据已生成到数据库 "${selectedDatabase}"！`);
      
      // 触发数据源面板刷新
      setTimeout(() => {
        dataExplorerRefresh.trigger();
      }, 1000); // 延迟1秒刷新，确保数据已经写入
      
    } catch (error) {
      console.error('数据生成失败:', error);
      showNotification.error({
        message: "数据生成失败",
        description: String(error)
      });
    } finally {
      setLoading(false);
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
      showMessage.error("请先连接到InfluxDB");
      return;
    }

    setLoading(true);
    try {
      for (const task of generatorTasks) {
        await safeTauriInvoke('execute_query', {
          request: {
            connectionId: activeConnectionId,
            database: selectedDatabase,
            query: `DROP MEASUREMENT "${task.measurement}"`}
        });
      }
      setCompletedTasks([]);
      showMessage.success("测试数据已清空" );
    } catch (error) {
      console.error('清空数据失败:', error);
      showNotification.error({
        message: "清空数据失败",
        description: String(error)
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      title={
        <div className="flex gap-2">
          <Database className="w-4 h-4"  />
          InfluxDB 测试数据生成器
        </div>
      }
      extra={
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span>目标数据库:</span>
            <Select
              value={selectedDatabase}
              onValueChange={setSelectedDatabase}
              style={{ minWidth: 150 }}
              placeholder="选择数据库"
            >
              {databases.map(db => (
                <Select.Option key={db} value={db}>
                  {db}
                </Select.Option>
              ))}
            </Select>
          </div>
          <div className="flex gap-2">
            <Button 
              icon={<PlayCircle />}
              type="primary"
              onClick={generateData}
              disabled={loading || !activeConnectionId || !selectedDatabase}
            >
              生成数据
            </Button>
            <Button 
              icon={<RefreshCw className="w-4 h-4"  />}
              onClick={clearData}
              disabled={loading || !activeConnectionId || !selectedDatabase}
            >
              清空数据
            </Button>
          </div>
        </div>
      }
    >
      {!activeConnectionId && (
        <Alert
          message="请先连接到InfluxDB"
          description="在连接管理页面选择一个InfluxDB连接并激活后，才能生成测试数据。"
          type="warning"
          style={{ marginBottom: 16 }}
        />
      )}

      {activeConnectionId && !selectedDatabase && databases.length === 0 && (
        <Alert
          message="未找到数据库"
          description="当前连接中没有可用的数据库，请先创建一个数据库。"
          type="warning"
          style={{ marginBottom: 16 }}
        />
      )}

      {activeConnectionId && databases.length > 0 && !selectedDatabase && (
        <Alert
          message="请选择目标数据库"
          description="请从上方的下拉框中选择一个数据库来生成测试数据。"
          type="warning"
          style={{ marginBottom: 16 }}
        />
      )}

      {loading && (
        <div style={{ marginBottom: 16 }}>
          <Progress 
            percent={progress} 
            status={progress === 100 ? 'success' : 'active'}
          />
          {currentTask && (
            <Text type="secondary" style={{ marginTop: 8, display: 'block' }}>
              正在生成: {currentTask}
            </Text>
          )}
        </div>
      )}

      <Title level={4}>将要创建的数据表</Title>
      <List
        itemLayout="horizontal"
        dataSource={generatorTasks}
        renderItem={(task, index) => (
          <List.Item
            extra={
              completedTasks.includes(task.name) ? (
                <Tag color="success" icon={<CheckCircle />}>
                  已完成
                </Tag>
              ) : (
                <Tag color="default">
                  {task.recordCount} 条记录
                </Tag>
              )
            }
          >
            <List.Item.Meta
              title={task.name}
              description={
                <div>
                  <Text>{task.description}</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    表名: {task.measurement} | 时间范围: {task.timeRange} | 
                    标签: {task.tags.join(', ')} | 
                    字段: {task.fields.join(', ')}
                  </Text>
                </div>
              }
            />
          </List.Item>
        )}
      />

      <div className="border-t border my-4" />
      
      <Alert
        message="数据生成说明"
        description={
          <div>
            <p>• 将在数据库 <code>{selectedDatabase || '未选择'}</code> 中创建 {generatorTasks.length} 张测试数据表</p>
            <p>• 总共将生成约 {generatorTasks.reduce((sum, task) => sum + task.recordCount, 0)} 条测试记录</p>
            <p>• 数据时间戳将分布在指定的时间范围内</p>
            <p>• 所有数值都是随机生成的模拟数据</p>
          </div>
        }
        type="info"
      />
    </div>
  );
};

export default DataGenerator;