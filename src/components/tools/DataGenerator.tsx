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
  Input,
  Label,
  Checkbox,
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

interface TableInfo {
  name: string;
  fields: FieldInfo[];
  tags: FieldInfo[];
}

interface FieldInfo {
  name: string;
  type: 'float' | 'int' | 'string' | 'boolean' | 'time';
  lastValue?: any;
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
  
  // 新增性能优化状态
  const [generatedCount, setGeneratedCount] = useState(0);
  const [generationSpeed, setGenerationSpeed] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [startTime, setStartTime] = useState<number>(0);
  
  // 新增状态
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [tables, setTables] = useState<string[]>([]);
  const [tableInfo, setTableInfo] = useState<TableInfo | null>(null);
  const [recordCount, setRecordCount] = useState<number>(100);
  const [mode, setMode] = useState<'predefined' | 'custom'>('predefined');
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);

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
    {
      name: '电商交易数据 (大数据量)',
      measurement: 'ecommerce_transactions',
      description: '电商平台交易记录，包含用户行为、订单和支付信息',
      fields: [
        'order_amount', 'quantity', 'discount_amount', 'tax_amount', 'shipping_cost',
        'payment_processing_time', 'user_age', 'session_duration', 'page_views',
        'cart_items_count', 'is_mobile', 'is_first_purchase', 'loyalty_points_used'
      ],
      tags: [
        'user_id', 'product_category', 'payment_method', 'shipping_method',
        'promotion_code', 'device_type', 'browser', 'country', 'city',
        'seller_id', 'warehouse_location', 'customer_segment'
      ],
      recordCount: 50000,
      timeRange: '30d',
    },
    {
      name: '金融市场数据 (高频)',
      measurement: 'financial_market_data',
      description: '股票、期货、外汇等金融市场实时交易数据',
      fields: [
        'open_price', 'high_price', 'low_price', 'close_price', 'volume',
        'bid_price', 'ask_price', 'bid_volume', 'ask_volume', 'spread',
        'volatility', 'rsi', 'macd', 'bollinger_upper', 'bollinger_lower',
        'trade_count', 'vwap', 'market_cap_change'
      ],
      tags: [
        'symbol', 'exchange', 'currency', 'sector', 'market_type',
        'trading_session', 'data_provider', 'instrument_type',
        'country_code', 'listing_status'
      ],
      recordCount: 100000,
      timeRange: '7d',
    },
    {
      name: '社交媒体分析 (多维度)',
      measurement: 'social_media_analytics',
      description: '社交媒体平台用户行为和内容分析数据',
      fields: [
        'likes_count', 'shares_count', 'comments_count', 'views_count',
        'engagement_rate', 'reach', 'impressions', 'click_through_rate',
        'sentiment_score', 'influence_score', 'follower_growth',
        'content_length', 'hashtag_count', 'mention_count', 'response_time'
      ],
      tags: [
        'platform', 'content_type', 'author_id', 'topic_category',
        'language', 'region', 'age_group', 'gender', 'device_type',
        'time_zone', 'campaign_id', 'brand_category', 'verified_account'
      ],
      recordCount: 75000,
      timeRange: '14d',
    },
    {
      name: '物联网设备监控 (海量数据)',
      measurement: 'iot_device_monitoring',
      description: '大规模物联网设备状态监控和遥测数据',
      fields: [
        'cpu_temperature', 'ambient_temperature', 'humidity', 'pressure',
        'battery_voltage', 'signal_strength', 'data_throughput', 'error_count',
        'uptime_seconds', 'memory_usage_mb', 'storage_usage_gb',
        'network_latency_ms', 'power_consumption_watts', 'vibration_level',
        'light_intensity', 'noise_level_db', 'co2_level', 'air_quality_index'
      ],
      tags: [
        'iot_device_id', 'device_type', 'manufacturer', 'model', 'firmware_version',
        'deployment_location', 'building_id', 'floor', 'room', 'zone',
        'network_type', 'gateway_id', 'maintenance_status', 'installation_date'
      ],
      recordCount: 200000,
      timeRange: '3d',
    },
    {
      name: '云基础设施监控 (超大数据)',
      measurement: 'cloud_infrastructure_metrics',
      description: '云平台基础设施资源使用和性能指标',
      fields: [
        'cpu_utilization', 'memory_utilization', 'disk_io_read', 'disk_io_write',
        'network_bytes_in', 'network_bytes_out', 'network_packets_in', 'network_packets_out',
        'load_average_1m', 'load_average_5m', 'load_average_15m', 'active_connections',
        'database_connections', 'cache_hit_ratio', 'queue_depth', 'response_time_p50',
        'response_time_p95', 'response_time_p99', 'error_rate_4xx', 'error_rate_5xx',
        'ssl_cert_days_remaining', 'backup_success_rate', 'storage_usage_bytes'
      ],
      tags: [
        'instance_id', 'instance_type', 'availability_zone', 'region',
        'cloud_provider', 'service_name', 'application', 'cloud_environment',
        'team', 'cost_center', 'project', 'cluster_name', 'namespace',
        'container_name', 'image_version', 'orchestrator'
      ],
      recordCount: 500000,
      timeRange: '1d',
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
          // 电商相关标签
          case 'user_id':
            value = `user_${String(Math.floor(Math.random() * 100000) + 1).padStart(6, '0')}`;
            break;
          case 'product_category':
            value = ['electronics', 'clothing', 'books', 'home', 'sports', 'beauty', 'toys'][
              Math.floor(Math.random() * 7)
            ];
            break;
          case 'payment_method':
            value = ['credit_card', 'debit_card', 'paypal', 'apple_pay', 'bank_transfer'][
              Math.floor(Math.random() * 5)
            ];
            break;
          case 'shipping_method':
            value = ['standard', 'express', 'overnight', 'pickup'][
              Math.floor(Math.random() * 4)
            ];
            break;
          case 'device_type':
            value = ['mobile', 'desktop', 'tablet'][Math.floor(Math.random() * 3)];
            break;
          case 'browser':
            value = ['chrome', 'firefox', 'safari', 'edge'][Math.floor(Math.random() * 4)];
            break;
          case 'country':
            value = ['US', 'CN', 'JP', 'DE', 'UK', 'FR', 'CA', 'AU'][Math.floor(Math.random() * 8)];
            break;
          case 'city':
            value = ['beijing', 'shanghai', 'new_york', 'london', 'tokyo', 'paris'][
              Math.floor(Math.random() * 6)
            ];
            break;
          case 'customer_segment':
            value = ['vip', 'regular', 'new', 'returning'][Math.floor(Math.random() * 4)];
            break;
          // 金融相关标签
          case 'symbol':
            value = ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN', 'META', 'NVDA'][
              Math.floor(Math.random() * 7)
            ];
            break;
          case 'exchange':
            value = ['NASDAQ', 'NYSE', 'LSE', 'TSE', 'SSE'][Math.floor(Math.random() * 5)];
            break;
          case 'currency':
            value = ['USD', 'EUR', 'JPY', 'GBP', 'CNY'][Math.floor(Math.random() * 5)];
            break;
          case 'sector':
            value = ['technology', 'finance', 'healthcare', 'energy', 'consumer'][
              Math.floor(Math.random() * 5)
            ];
            break;
          // 社交媒体相关标签
          case 'platform':
            value = ['twitter', 'facebook', 'instagram', 'tiktok', 'linkedin'][
              Math.floor(Math.random() * 5)
            ];
            break;
          case 'content_type':
            value = ['post', 'video', 'image', 'story', 'live'][Math.floor(Math.random() * 5)];
            break;
          case 'language':
            value = ['en', 'zh', 'es', 'fr', 'de', 'ja'][Math.floor(Math.random() * 6)];
            break;
          case 'age_group':
            value = ['18-24', '25-34', '35-44', '45-54', '55+'][Math.floor(Math.random() * 5)];
            break;
          case 'gender':
            value = ['male', 'female', 'other'][Math.floor(Math.random() * 3)];
            break;
          // IoT设备相关标签  
          case 'iot_device_id':
            value = `device_${String(Math.floor(Math.random() * 10000) + 1).padStart(5, '0')}`;
            break;
          case 'manufacturer':
            value = ['cisco', 'intel', 'raspberry_pi', 'arduino', 'bosch'][
              Math.floor(Math.random() * 5)
            ];
            break;
          case 'model':
            value = ['model_a', 'model_b', 'model_c', 'model_d'][Math.floor(Math.random() * 4)];
            break;
          case 'building_id':
            value = `building_${Math.floor(Math.random() * 50) + 1}`;
            break;
          case 'floor':
            value = `floor_${Math.floor(Math.random() * 20) + 1}`;
            break;
          case 'room':
            value = `room_${String(Math.floor(Math.random() * 200) + 1).padStart(3, '0')}`;
            break;
          // 云基础设施相关标签
          case 'instance_id':
            value = `i-${Math.random().toString(36).substring(2, 19)}`;
            break;
          case 'instance_type':
            value = ['t3.micro', 't3.small', 'm5.large', 'c5.xlarge', 'r5.2xlarge'][
              Math.floor(Math.random() * 5)
            ];
            break;
          case 'availability_zone':
            value = ['us-east-1a', 'us-east-1b', 'us-west-2a', 'eu-west-1a'][
              Math.floor(Math.random() * 4)
            ];
            break;
          case 'cloud_provider':
            value = ['aws', 'azure', 'gcp', 'alibaba'][Math.floor(Math.random() * 4)];
            break;
          case 'cloud_environment':
            value = ['production', 'staging', 'development', 'testing'][
              Math.floor(Math.random() * 4)
            ];
            break;
          default:
            value = `value_${Math.floor(Math.random() * 1000)}`;
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
          // 电商相关字段
          case 'order_amount':
            value = Math.round((Math.random() * 500 + 10) * 100) / 100; // $10-$510
            break;
          case 'quantity':
            value = Math.floor(Math.random() * 10) + 1; // 1-10
            break;
          case 'discount_amount':
            value = Math.round(Math.random() * 50 * 100) / 100; // $0-$50
            break;
          case 'tax_amount':
            value = Math.round(Math.random() * 40 * 100) / 100; // $0-$40
            break;
          case 'shipping_cost':
            value = Math.round((Math.random() * 20 + 5) * 100) / 100; // $5-$25
            break;
          case 'payment_processing_time':
            value = Math.round((Math.random() * 5 + 0.5) * 100) / 100; // 0.5-5.5s
            break;
          case 'user_age':
            value = Math.floor(Math.random() * 60) + 18; // 18-78
            break;
          case 'session_duration':
            value = Math.floor(Math.random() * 3600); // 0-3600 seconds
            break;
          case 'page_views':
            value = Math.floor(Math.random() * 20) + 1; // 1-20
            break;
          case 'cart_items_count':
            value = Math.floor(Math.random() * 15) + 1; // 1-15
            break;
          case 'is_mobile':
            value = Math.random() > 0.4 ? 1 : 0; // 60% mobile
            break;
          case 'is_first_purchase':
            value = Math.random() > 0.7 ? 1 : 0; // 30% first purchase
            break;
          case 'loyalty_points_used':
            value = Math.floor(Math.random() * 1000); // 0-1000 points
            break;
          // 金融市场相关字段
          case 'open_price':
            value = Math.round((Math.random() * 1000 + 10) * 100) / 100; // $10-$1010
            break;
          case 'high_price':
            value = Math.round((Math.random() * 1100 + 10) * 100) / 100; // $10-$1110
            break;
          case 'low_price':
            value = Math.round((Math.random() * 900 + 10) * 100) / 100; // $10-$910
            break;
          case 'close_price':
            value = Math.round((Math.random() * 1000 + 10) * 100) / 100; // $10-$1010
            break;
          case 'volume':
            value = Math.floor(Math.random() * 10000000); // 0-10M shares
            break;
          case 'bid_price':
            value = Math.round((Math.random() * 1000 + 10) * 100) / 100;
            break;
          case 'ask_price':
            value = Math.round((Math.random() * 1000 + 10) * 100) / 100;
            break;
          case 'spread':
            value = Math.round(Math.random() * 5 * 100) / 100; // $0-$5
            break;
          case 'volatility':
            value = Math.round(Math.random() * 100 * 100) / 100; // 0-100%
            break;
          case 'rsi':
            value = Math.round(Math.random() * 100 * 100) / 100; // 0-100
            break;
          case 'macd':
            value = Math.round((Math.random() * 20 - 10) * 100) / 100; // -10 to 10
            break;
          // 社交媒体相关字段
          case 'likes_count':
            value = Math.floor(Math.random() * 10000); // 0-10k likes
            break;
          case 'shares_count':
            value = Math.floor(Math.random() * 1000); // 0-1k shares
            break;
          case 'comments_count':
            value = Math.floor(Math.random() * 500); // 0-500 comments
            break;
          case 'views_count':
            value = Math.floor(Math.random() * 100000); // 0-100k views
            break;
          case 'engagement_rate':
            value = Math.round(Math.random() * 20 * 100) / 100; // 0-20%
            break;
          case 'reach':
            value = Math.floor(Math.random() * 50000); // 0-50k reach
            break;
          case 'impressions':
            value = Math.floor(Math.random() * 200000); // 0-200k impressions
            break;
          case 'sentiment_score':
            value = Math.round((Math.random() * 2 - 1) * 100) / 100; // -1 to 1
            break;
          case 'influence_score':
            value = Math.round(Math.random() * 100 * 100) / 100; // 0-100
            break;
          case 'follower_growth':
            value = Math.floor(Math.random() * 1000 - 100); // -100 to 900
            break;
          // IoT设备相关字段
          case 'cpu_temperature':
            value = Math.round((Math.random() * 60 + 20) * 100) / 100; // 20-80°C
            break;
          case 'ambient_temperature':
            value = Math.round((Math.random() * 40 + 10) * 100) / 100; // 10-50°C
            break;
          case 'battery_voltage':
            value = Math.round((Math.random() * 2 + 3) * 100) / 100; // 3-5V
            break;
          case 'signal_strength':
            value = Math.round((Math.random() * 50 - 100) * 100) / 100; // -100 to -50 dBm
            break;
          case 'data_throughput':
            value = Math.round(Math.random() * 1000 * 100) / 100; // 0-1000 Mbps
            break;
          case 'error_count':
            value = Math.floor(Math.random() * 10); // 0-10 errors
            break;
          case 'uptime_seconds':
            value = Math.floor(Math.random() * 86400); // 0-24 hours in seconds
            break;
          case 'memory_usage_mb':
            value = Math.round(Math.random() * 8192 * 100) / 100; // 0-8GB
            break;
          case 'storage_usage_gb':
            value = Math.round(Math.random() * 500 * 100) / 100; // 0-500GB
            break;
          case 'power_consumption_watts':
            value = Math.round((Math.random() * 100 + 5) * 100) / 100; // 5-105W
            break;
          case 'vibration_level':
            value = Math.round(Math.random() * 10 * 100) / 100; // 0-10 m/s²
            break;
          case 'light_intensity':
            value = Math.round(Math.random() * 1000 * 100) / 100; // 0-1000 lux
            break;
          case 'noise_level_db':
            value = Math.round((Math.random() * 60 + 30) * 100) / 100; // 30-90 dB
            break;
          case 'co2_level':
            value = Math.round((Math.random() * 2000 + 400) * 100) / 100; // 400-2400 ppm
            break;
          case 'air_quality_index':
            value = Math.round(Math.random() * 300 * 100) / 100; // 0-300 AQI
            break;
          // 云基础设施相关字段
          case 'cpu_utilization':
            value = Math.round(Math.random() * 100 * 100) / 100; // 0-100%
            break;
          case 'memory_utilization':
            value = Math.round(Math.random() * 100 * 100) / 100; // 0-100%
            break;
          case 'disk_io_read':
            value = Math.round(Math.random() * 1000 * 100) / 100; // 0-1000 MB/s
            break;
          case 'disk_io_write':
            value = Math.round(Math.random() * 1000 * 100) / 100; // 0-1000 MB/s
            break;
          case 'network_bytes_in':
            value = Math.floor(Math.random() * 10000000); // 0-10MB
            break;
          case 'network_bytes_out':
            value = Math.floor(Math.random() * 10000000); // 0-10MB
            break;
          case 'load_average_1m':
            value = Math.round(Math.random() * 10 * 100) / 100; // 0-10
            break;
          case 'load_average_5m':
            value = Math.round(Math.random() * 10 * 100) / 100; // 0-10
            break;
          case 'load_average_15m':
            value = Math.round(Math.random() * 10 * 100) / 100; // 0-10
            break;
          case 'active_connections':
            value = Math.floor(Math.random() * 10000); // 0-10k connections
            break;
          case 'database_connections':
            value = Math.floor(Math.random() * 1000); // 0-1k connections
            break;
          case 'cache_hit_ratio':
            value = Math.round(Math.random() * 100 * 100) / 100; // 0-100%
            break;
          case 'queue_depth':
            value = Math.floor(Math.random() * 100); // 0-100
            break;
          case 'response_time_p50':
            value = Math.round(Math.random() * 1000 * 100) / 100; // 0-1000ms
            break;
          case 'response_time_p95':
            value = Math.round(Math.random() * 2000 * 100) / 100; // 0-2000ms
            break;
          case 'response_time_p99':
            value = Math.round(Math.random() * 5000 * 100) / 100; // 0-5000ms
            break;
          case 'error_rate_4xx':
            value = Math.round(Math.random() * 20 * 100) / 100; // 0-20%
            break;
          case 'error_rate_5xx':
            value = Math.round(Math.random() * 5 * 100) / 100; // 0-5%
            break;
          case 'ssl_cert_days_remaining':
            value = Math.floor(Math.random() * 365); // 0-365 days
            break;
          case 'backup_success_rate':
            value = Math.round((Math.random() * 20 + 80) * 100) / 100; // 80-100%
            break;
          case 'storage_usage_bytes':
            value = Math.floor(Math.random() * 1000000000); // 0-1GB
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
      showMessage.error('请先连接到InfluxDB', undefined, 'connection');
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
        showMessage.success(`已加载 ${dbList.length} 个数据库`, undefined, 'data');
      } else {
        setSelectedDatabase('');
        showMessage.info('未找到数据库，请先创建数据库', undefined, 'data');
      }
    } catch (error) {
      console.error('加载数据库列表失败:', error);
      showMessage.error(`加载数据库列表失败: ${error}`, undefined, 'data');
      setDatabases([]);
      setSelectedDatabase('');
    }
  };

  // 加载表列表
  const loadTables = async () => {
    if (!activeConnectionId || !selectedDatabase) {
      showMessage.error('请先选择数据库');
      return;
    }

    try {
      const tableList = await safeTauriInvoke<string[]>('get_measurements', {
        connectionId: activeConnectionId,
        database: selectedDatabase,
      });
      const newTables = tableList || [];
      setTables(newTables);
      
      if (newTables.length > 0) {
        showMessage.success(`已加载 ${newTables.length} 个表`);
        // 如果当前选中的表不在新的表列表中，才清除选择
        if (selectedTable && !newTables.includes(selectedTable)) {
          setSelectedTable('');
          setTableInfo(null);
        }
      } else {
        showMessage.info('数据库中暂无表');
        setSelectedTable('');
        setTableInfo(null);
      }
    } catch (error) {
      console.error('加载表列表失败:', error);
      showMessage.error(`加载表列表失败: ${error}`);
      setTables([]);
    }
  };

  // 获取表结构信息
  const loadTableInfo = async (tableName: string) => {
    if (!activeConnectionId || !selectedDatabase || !tableName) {
      console.log('❌ loadTableInfo: 参数检查失败', { activeConnectionId, selectedDatabase, tableName });
      setTableInfo(null);
      return;
    }

    console.log('🔄 开始加载表结构...', { tableName, database: selectedDatabase, connection: activeConnectionId });

    try {
      console.log(`开始分析表 "${tableName}" 的结构...`, { activeConnectionId, selectedDatabase });
      
      // 方法1：尝试使用SHOW FIELD KEYS和SHOW TAG KEYS
      const fields: FieldInfo[] = [];
      const tags: FieldInfo[] = [];

      try {
        // 获取字段信息 - 使用后端API而不是直接SQL查询
        let fieldResult;
        try {
          console.log('🔍 尝试获取字段信息:', { selectedDatabase, tableName });
          fieldResult = await safeTauriInvoke<any>('get_field_keys', {
            connection_id: activeConnectionId,
            database: selectedDatabase,
            measurement: tableName,
          });
          console.log('📦 字段信息响应:', fieldResult);
        } catch (error) {
          console.log('❌ 获取字段信息失败:', error);
          fieldResult = [];
        }

        // 定义字段查询语句
        const fieldQueries = [
          `SHOW FIELD KEYS FROM "${tableName}"`,
          `SHOW FIELD KEYS ON "${selectedDatabase}" FROM "${tableName}"`,
          `SHOW FIELD KEYS FROM ${tableName}`,
        ];

        for (const query of fieldQueries) {
          try {
            console.log('\ud83d\udd0e 尝试字段查询:', query);
            fieldResult = await safeTauriInvoke<any>('execute_query', {
              request: {
                connectionId: activeConnectionId,
                database: selectedDatabase,
                query,
              },
            });
            console.log('\ud83d\udce6 字段查询响应:', { 
              success: fieldResult.success, 
              dataLength: fieldResult.data?.length,
              hasError: fieldResult.error,
              query 
            });
            // 检查是否有数据（不依赖success字段，因为可能是undefined）
            const hasData = fieldResult.data && fieldResult.data.length > 0;
            const hasError = fieldResult.error || fieldResult.hasError;

            if (hasData && !hasError) {
              console.log('\u2705 字段查询成功，使用查询:', query);
              break;
            }
          } catch (queryError) {
            console.log(`\u274c 字段查询失败 \"${query}\":`, queryError);
            continue;
          }
        }

        // 检查字段查询结果（不依赖success字段）
        const hasFieldData = fieldResult && fieldResult.data && fieldResult.data.length > 0;
        const hasFieldError = fieldResult && (fieldResult.error || fieldResult.hasError);

        if (hasFieldData && !hasFieldError) {
          console.log('\ud83d\udcc8 字段查询结果:', fieldResult.data);
          console.log('\ud83d\udd0d 字段查询第一行数据:', fieldResult.data[0]);
          fieldResult.data.forEach((row: any) => {
            let fieldName: string;
            let fieldType: string;

            // 处理数组格式的响应 [fieldName, fieldType]
            if (Array.isArray(row) && row.length >= 2) {
              fieldName = row[0];
              fieldType = row[1];
              console.log('🔍 解析数组格式字段:', { fieldName, fieldType, rawRow: row });
            } else {
              // 处理对象格式的响应
              fieldName = row.fieldKey || row.key || row.field || Object.values(row)[0];
              fieldType = row.fieldType || row.type;
              console.log('🔍 解析对象格式字段:', { fieldName, fieldType, rawRow: row });
            }

            if (fieldName && typeof fieldName === 'string') {
              let type: FieldInfo['type'] = 'string';
              if (fieldType && typeof fieldType === 'string') {
                switch (fieldType.toLowerCase()) {
                  case 'integer':
                  case 'int':
                    type = 'int';
                    break;
                  case 'float':
                  case 'double':
                  case 'number':
                    type = 'float';
                    break;
                  case 'boolean':
                  case 'bool':
                    type = 'boolean';
                    break;
                  default:
                    type = 'string';
                }
              }
              fields.push({ name: fieldName, type });
              console.log('✅ 添加字段:', { name: fieldName, type, originalType: fieldType });
            }
          });
        } else {
          console.log('\u26a0\ufe0f 字段查询失败或无数据:', {
            hasResult: !!fieldResult,
            success: fieldResult?.success,
            dataLength: fieldResult?.data?.length,
            error: fieldResult?.error,
            hasFieldData,
            hasFieldError
          });
        }

        // 获取标签信息 - 智能检测数据库类型并生成正确的查询
        let tagResult;
        const isIoTDB = selectedDatabase.startsWith('root.');
        const tagQueries = isIoTDB ? [
          // IoTDB使用SHOW DEVICES语法
          `SHOW DEVICES ${selectedDatabase}.${tableName}`,
          `SHOW DEVICES ${selectedDatabase}.**`,
          `SHOW DEVICES ${tableName}`,
        ] : [
          // InfluxDB使用SHOW TAG KEYS语法
          `SHOW TAG KEYS ON "${selectedDatabase}" FROM "${tableName}"`,
          `SHOW TAG KEYS FROM "${tableName}"`,
          `SHOW TAG KEYS FROM ${tableName}`,
          `SHOW TAG KEYS ON "${selectedDatabase}"`,
          // 注意：避免使用可能导致retention policy错误的查询格式
          // `SHOW TAG KEYS FROM "${selectedDatabase}"."${tableName}"`,
          // `SHOW TAG KEYS FROM "${selectedDatabase}".."${tableName}"`,
          // `SHOW TAG KEYS FROM "${selectedDatabase}"."autogen"."${tableName}"`
        ];
        
        for (const query of tagQueries) {
          try {
            console.log('\ud83c\udff7\ufe0f 尝试标签查询:', query);
            tagResult = await safeTauriInvoke<any>('execute_query', {
              request: {
                connectionId: activeConnectionId,
                database: selectedDatabase,
                query,
              },
            });
            console.log('\ud83d\udce6 标签查询响应:', { 
              success: tagResult.success, 
              dataLength: tagResult.data?.length,
              hasError: tagResult.error,
              query 
            });
            // 检查是否有数据（不依赖success字段）
            const hasData = tagResult.data && tagResult.data.length > 0;
            const hasError = tagResult.error || tagResult.hasError;

            if (hasData && !hasError) {
              console.log('\u2705 标签查询成功，使用查询:', query);
              break;
            }
          } catch (queryError) {
            console.log(`\u274c 标签查询失败 \"${query}\":`, queryError);
            continue;
          }
        }

        // 检查标签查询结果（不依赖success字段）
        const hasTagData = tagResult && tagResult.data && tagResult.data.length > 0;
        const hasTagError = tagResult && (tagResult.error || tagResult.hasError);

        if (hasTagData && !hasTagError) {
          console.log('\ud83c\udff7\ufe0f 标签查询结果:', tagResult.data);
          console.log('\ud83d\udd0d 标签查询第一行数据:', tagResult.data[0]);
          tagResult.data.forEach((row: any) => {
            // 兼容不同版本的InfluxDB字段名称
            const tagName = row.tagKey || row.key || row.tag || Object.values(row)[0];
            if (tagName && typeof tagName === 'string') {
              tags.push({ name: tagName, type: 'string' });
              console.log('添加标签:', { name: tagName, type: 'string' });
            }
          });
        } else {
          console.log('\u26a0\ufe0f 标签查询失败或无数据:', {
            hasResult: !!tagResult,
            success: tagResult?.success,
            dataLength: tagResult?.data?.length,
            error: tagResult?.error,
            hasTagData,
            hasTagError
          });
        }
      } catch (schemaError) {
        console.log('使用SHOW语句查询失败，尝试采样数据方法:', schemaError);
      }

      // 方法2：如果SHOW语句失败，尝试获取retention policy信息
      if (fields.length === 0 && tags.length === 0) {
        console.log('尝试获取retention policy信息...');

        // 首先尝试获取retention policy列表
        let retentionPolicies: string[] = [];
        try {
          const rpResult = await safeTauriInvoke<any>('execute_query', {
            request: {
              connectionId: activeConnectionId,
              database: selectedDatabase,
              query: `SHOW RETENTION POLICIES ON "${selectedDatabase}"`,
            },
          });

          if (rpResult.success && rpResult.data && rpResult.data.length > 0) {
            console.log('获取到retention policies:', rpResult.data);
            retentionPolicies = rpResult.data.map((rp: any) => rp.name || rp.policyName || Object.values(rp)[0]).filter(Boolean);
            console.log('解析出的retention policy名称:', retentionPolicies);
          }
        } catch (rpError) {
          console.log('获取retention policy失败:', rpError);
        }

        // 如果获取到了retention policy，尝试使用完整格式查询
        if (retentionPolicies.length > 0) {
          for (const rp of retentionPolicies) {
            console.log(`尝试使用retention policy "${rp}" 查询字段和标签...`);

            // 尝试字段查询
            if (fields.length === 0) {
              try {
                // 智能检测数据库类型并生成正确的查询
                const isIoTDB = selectedDatabase.startsWith('root.');
                const fieldQuery = isIoTDB
                  ? `SHOW TIMESERIES ${selectedDatabase}.${tableName}.*`
                  : `SHOW FIELD KEYS FROM "${selectedDatabase}"."${rp}"."${tableName}"`;

                const rpFieldResult = await safeTauriInvoke<any>('execute_query', {
                  request: {
                    connectionId: activeConnectionId,
                    database: selectedDatabase,
                    query: fieldQuery,
                  },
                });

                if (rpFieldResult.success && rpFieldResult.data && rpFieldResult.data.length > 0) {
                  console.log(`使用retention policy "${rp}" 获取到字段:`, rpFieldResult.data);
                  rpFieldResult.data.forEach((row: any) => {
                    const fieldName = row.fieldKey || row.key || row.field || Object.values(row)[0];
                    if (fieldName && typeof fieldName === 'string') {
                      let type: FieldInfo['type'] = 'string';
                      const fieldType = row.fieldType || row.type;
                      if (fieldType) {
                        switch (fieldType.toLowerCase()) {
                          case 'integer':
                          case 'int':
                            type = 'int';
                            break;
                          case 'float':
                          case 'double':
                          case 'number':
                            type = 'float';
                            break;
                          case 'boolean':
                          case 'bool':
                            type = 'boolean';
                            break;
                          default:
                            type = 'string';
                        }
                      }
                      fields.push({ name: fieldName, type });
                    }
                  });
                }
              } catch (rpFieldError) {
                console.log(`使用retention policy "${rp}" 查询字段失败:`, rpFieldError);
              }
            }

            // 尝试标签查询
            if (tags.length === 0) {
              try {
                // 智能检测数据库类型并生成正确的查询
                const isIoTDB = selectedDatabase.startsWith('root.');
                const tagQuery = isIoTDB
                  ? `SHOW DEVICES ${selectedDatabase}.${tableName}`
                  : `SHOW TAG KEYS FROM "${selectedDatabase}"."${rp}"."${tableName}"`;

                const rpTagResult = await safeTauriInvoke<any>('execute_query', {
                  request: {
                    connectionId: activeConnectionId,
                    database: selectedDatabase,
                    query: tagQuery,
                  },
                });

                if (rpTagResult.success && rpTagResult.data && rpTagResult.data.length > 0) {
                  console.log(`使用retention policy "${rp}" 获取到标签:`, rpTagResult.data);
                  rpTagResult.data.forEach((row: any) => {
                    const tagName = row.tagKey || row.key || row.tag || Object.values(row)[0];
                    if (tagName && typeof tagName === 'string') {
                      tags.push({ name: tagName, type: 'string' });
                    }
                  });
                }
              } catch (rpTagError) {
                console.log(`使用retention policy "${rp}" 查询标签失败:`, rpTagError);
              }
            }

            // 如果已经获取到了字段和标签，就不需要继续尝试其他retention policy
            if (fields.length > 0 && tags.length > 0) {
              break;
            }
          }
        }

        console.log('尝试使用采样数据方法分析表结构...');
        
        // 首先尝试使用SHOW SERIES获取tag信息
        try {
          // 尝试多种SHOW SERIES查询格式
          let seriesResult;
          const seriesQueries = [
            `SHOW SERIES FROM "${tableName}" LIMIT 1`,
            `SHOW SERIES FROM ${tableName} LIMIT 1`,
            // 注意：不要直接使用数据库名称，因为可能需要指定retention policy
            // 以下查询可能会导致"retention policy not found"错误
            // `SHOW SERIES FROM "${selectedDatabase}"."${tableName}" LIMIT 1`,
            // `SHOW SERIES FROM "${selectedDatabase}".."${tableName}" LIMIT 1`,
            // `SHOW SERIES FROM "${selectedDatabase}"."autogen"."${tableName}" LIMIT 1`
          ];

          for (const query of seriesQueries) {
            try {
              console.log('尝试SHOW SERIES查询:', query);
              seriesResult = await safeTauriInvoke<any>('execute_query', {
                request: {
                  connectionId: activeConnectionId,
                  database: selectedDatabase,
                  query,
                },
              });

              // 检查是否有数据（不依赖success字段）
              const hasData = seriesResult.data && seriesResult.data.length > 0;
              const hasError = seriesResult.error || seriesResult.hasError;

              if (hasData && !hasError) {
                console.log('SHOW SERIES查询成功，使用查询:', query);
                break;
              }
            } catch (error) {
              console.log(`SHOW SERIES查询失败 "${query}":`, error);
              continue;
            }
          }
          
          // 检查SHOW SERIES结果（不依赖success字段）
          const hasSeriesData = seriesResult && seriesResult.data && seriesResult.data.length > 0;
          const hasSeriesError = seriesResult && (seriesResult.error || seriesResult.hasError);

          if (hasSeriesData && !hasSeriesError) {
            console.log('SHOW SERIES结果:', seriesResult.data[0]);
            // 从series信息中解析tag结构
            const seriesInfo = seriesResult.data[0];
            const seriesKey = seriesInfo.key || seriesInfo.series || Object.values(seriesInfo)[0];
            if (seriesKey && typeof seriesKey === 'string') {
              const parts = seriesKey.split(',');
              if (parts.length > 1) {
                for (let i = 1; i < parts.length; i++) {
                  const tagPart = parts[i];
                  const tagName = tagPart.split('=')[0];
                  if (tagName && !tags.find(t => t.name === tagName)) {
                    tags.push({ name: tagName, type: 'string' });
                  }
                }
              }
            }
          }
        } catch (seriesError) {
          console.log('SHOW SERIES查询失败:', seriesError);
        }
        
        // 然后采样数据来获取字段信息
        const sampleQueries = [
          `SELECT * FROM "${tableName}" ORDER BY time DESC LIMIT 5`,
          `SELECT * FROM ${tableName} ORDER BY time DESC LIMIT 5`,
          `SELECT * FROM "${tableName}" LIMIT 5`,
          `SELECT * FROM "${tableName}" WHERE time > now() - 30d LIMIT 5`,
          `SELECT * FROM "${tableName}" WHERE time > now() - 7d LIMIT 5`,
          // 注意：避免使用可能导致retention policy错误的查询格式
          // `SELECT * FROM "${selectedDatabase}"."${tableName}" LIMIT 5`,
          // `SELECT * FROM "${selectedDatabase}".."${tableName}" LIMIT 5`,
          // `SELECT * FROM "${selectedDatabase}"."autogen"."${tableName}" LIMIT 5`,
        ];
        
        for (const sampleQuery of sampleQueries) {
          try {
            console.log('尝试采样查询:', sampleQuery);
            const sampleResult = await safeTauriInvoke<any>('execute_query', {
              request: {
                connectionId: activeConnectionId,
                database: selectedDatabase,
                query: sampleQuery,
              },
            });

            // 检查是否有数据（不依赖success字段）
            const hasSampleData = sampleResult.data && sampleResult.data.length > 0;
            const hasSampleError = sampleResult.error || sampleResult.hasError;

            if (hasSampleData && !hasSampleError) {
              console.log('采样数据成功，使用查询:', sampleQuery);
              console.log('采样数据结果:', sampleResult.data[0]);
              const sample = sampleResult.data[0];

              Object.entries(sample).forEach(([key, value]) => {
                if (key === 'time') return; // 跳过时间字段
                
                // 如果已经被识别为tag，跳过
                if (tags.find(t => t.name === key)) return;

                let type: FieldInfo['type'] = 'string';
                if (typeof value === 'number') {
                  type = Number.isInteger(value) ? 'int' : 'float';
                } else if (typeof value === 'boolean') {
                  type = 'boolean';
                }

                // 更智能的字段和标签识别逻辑
                // 如果SHOW FIELD KEYS和SHOW TAG KEYS都没有数据，我们需要猜测
                if (fields.length === 0 && tags.length === 0) {
                  // 基于字段名和值的特征来判断
                  const isLikelyTag = (
                    typeof value === 'string' &&
                    value.length <= 100 &&
                    (
                      // 常见的标签字段名模式
                      /^(host|server|region|zone|env|environment|service|app|application|instance|node|cluster|datacenter|dc|location|tenant|user|client|device|platform|os|version|status|state|level|priority|category|type|kind|source|target|method|protocol|endpoint|path|route|component|module|namespace|project|team|owner|tag|label)$/i.test(key) ||
                      // 或者值看起来像标识符
                      /^[a-zA-Z0-9_.-]+$/.test(value)
                    )
                  );

                  if (isLikelyTag) {
                    tags.push({ name: key, type: 'string' });
                    console.log('推测为标签:', { name: key, type: 'string', value });
                  } else {
                    fields.push({ name: key, type });
                    console.log('推测为字段:', { name: key, type, value });
                  }
                } else {
                  // 如果已经有了一些字段或标签信息，默认添加为字段
                  fields.push({ name: key, type });
                  console.log('添加字段:', { name: key, type, value });
                }
              });
              break; // 成功处理了采样数据，退出循环
            }
          } catch (sampleError) {
            console.log(`采样查询失败 "${sampleQuery}":`, sampleError);
            continue;
          }
        }
      }

      const info: TableInfo = {
        name: tableName,
        fields,
        tags,
      };

      setTableInfo(info);
      console.log('表结构分析完成:', info);
      console.log('最终字段数量:', fields.length, '最终标签数量:', tags.length);
      
      // 强制触发重新渲染
      setTimeout(() => {
        if (fields.length > 0 || tags.length > 0) {
          showMessage.success(`已分析表 "${tableName}" 的结构：${fields.length} 个字段，${tags.length} 个标签`, undefined, 'data');
        } else {
          showMessage.warning(`表 "${tableName}" 暂无数据，无法分析字段类型`);
        }
      }, 100);
    } catch (error) {
      console.error('获取表结构失败:', error);
      showMessage.error(`获取表结构失败: ${error}`);
      // 即使失败也要设置一个空的tableInfo，这样UI能正确显示
      setTableInfo({
        name: tableName,
        fields: [],
        tags: [],
      });
    }
  };

  // 根据字段类型生成随机值
  const generateRandomValue = (field: FieldInfo): any => {
    switch (field.type) {
      case 'int':
        return Math.floor(Math.random() * 1000);
      case 'float':
        return Math.round(Math.random() * 1000 * 100) / 100;
      case 'boolean':
        return Math.random() > 0.5;
      case 'string':
        // 如果有历史值，基于历史值生成相似的字符串
        if (field.lastValue && typeof field.lastValue === 'string') {
          const variations = [
            field.lastValue,
            `${field.lastValue  }_${  Math.floor(Math.random() * 100)}`,
            field.lastValue.replace(/\d+/g, () => String(Math.floor(Math.random() * 100))),
          ];
          return variations[Math.floor(Math.random() * variations.length)];
        }
        return `value_${Math.floor(Math.random() * 1000)}`;
      default:
        return `random_${Math.floor(Math.random() * 1000)}`;
    }
  };

  // 优化后的异步分批生成数据点
  const generateCustomDataPointsBatch = async (batchIndex: number, batchSize: number): Promise<DataPoint[]> => {
    if (!tableInfo) return [];

    return new Promise((resolve) => {
      // 使用 requestIdleCallback 避免阻塞 UI
      const generateBatch = () => {
        const data: DataPoint[] = [];
        const now = Date.now();
        const startIdx = batchIndex * batchSize;

        for (let i = 0; i < batchSize; i++) {
          // 生成时间戳（最近24小时内随机分布）
          const timestamp = new Date(now - Math.random() * 24 * 60 * 60 * 1000);

          // 生成标签
          const tags: { [key: string]: string } = {};
          tableInfo.tags.forEach(tag => {
            const value = generateRandomValue(tag);
            tags[tag.name] = String(value);
          });

          // 生成字段
          const fields: { [key: string]: any } = {};
          tableInfo.fields.forEach(field => {
            const value = generateRandomValue(field);
            fields[field.name] = value;
          });

          // 构建DataPoint对象
          const dataPoint: DataPoint = {
            measurement: tableInfo.name,
            tags,
            fields,
            timestamp,
          };
          data.push(dataPoint);
        }

        resolve(data);
      };

      // 使用 setTimeout 让出控制权给其他任务
      if (typeof requestIdleCallback !== 'undefined') {
        requestIdleCallback(generateBatch);
      } else {
        setTimeout(generateBatch, 0);
      }
    });
  };

  // 保留原有的同步生成方法作为后备
  const generateCustomDataPoints = (count: number): DataPoint[] => {
    if (!tableInfo) return [];

    const data: DataPoint[] = [];
    const now = Date.now();

    for (let i = 0; i < count; i++) {
      // 生成时间戳（最近24小时内随机分布）
      const timestamp = new Date(now - Math.random() * 24 * 60 * 60 * 1000);

      // 生成标签
      const tags: { [key: string]: string } = {};
      tableInfo.tags.forEach(tag => {
        const value = generateRandomValue(tag);
        tags[tag.name] = String(value);
      });

      // 生成字段
      const fields: { [key: string]: any } = {};
      tableInfo.fields.forEach(field => {
        const value = generateRandomValue(field);
        fields[field.name] = value;
      });

      // 构建DataPoint对象
      const dataPoint: DataPoint = {
        measurement: tableInfo.name,
        tags,
        fields,
        timestamp,
      };
      data.push(dataPoint);
    }

    return data;
  };

  // 停止数据生成
  const stopGeneration = () => {
    setIsStopping(true);
    setShouldStop(true);
    setIsPaused(false);
    showMessage.info('正在停止数据生成...');
  };

  // 暂停/恢复数据生成
  const togglePause = () => {
    setIsPaused(!isPaused);
    showMessage.info(isPaused ? '恢复数据生成' : '暂停数据生成');
  };

  // 计算生成速度
  const updateGenerationSpeed = (currentCount: number, startTime: number) => {
    const elapsed = (Date.now() - startTime) / 1000; // 秒
    if (elapsed > 0) {
      setGenerationSpeed(Math.round(currentCount / elapsed));
    }
  };

  // 执行数据生成
  const generateData = async () => {
    if (!activeConnectionId) {
      showMessage.error('请先连接到InfluxDB', undefined, 'connection');
      return;
    }

    if (!selectedDatabase) {
      showMessage.error('请选择目标数据库', undefined, 'data');
      return;
    }

    setLoading(true);
    setProgress(0);
    setCompletedTasks([]);
    setShouldStop(false);

    try {
      if (mode === 'custom') {
        // 自定义表数据生成 - 优化后的流式生成
        if (!selectedTable || !tableInfo) {
          showMessage.error('请选择目标表', undefined, 'data');
          return;
        }

        setCurrentTask(`为表 "${selectedTable}" 生成数据`);
        const startTimeStamp = Date.now();
        setStartTime(startTimeStamp);
        setGeneratedCount(0);
        
        // 动态计算批次大小，避免内存过大
        const calculateBatchSize = (totalCount: number) => {
          if (totalCount <= 1000) return Math.min(500, totalCount);
          if (totalCount <= 10000) return 1000;
          if (totalCount <= 50000) return 2000;
          return 5000; // 大数据量时使用更大批次
        };

        const batchSize = calculateBatchSize(recordCount);
        const totalBatches = Math.ceil(recordCount / batchSize);
        let processedCount = 0;

        for (let batchIndex = 0; batchIndex < totalBatches && !shouldStop; batchIndex++) {
          // 检查暂停状态
          while (isPaused && !shouldStop) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }

          if (shouldStop) {
            showMessage.warning('数据生成已被用户停止', undefined, 'data');
            break;
          }

          // 计算当前批次实际大小
          const currentBatchSize = Math.min(batchSize, recordCount - processedCount);
          
          try {
            // 异步生成当前批次数据
            const batchData = await generateCustomDataPointsBatch(batchIndex, currentBatchSize);

            console.log(`🔧 生成批次 ${batchIndex + 1} 数据:`, {
              expectedSize: currentBatchSize,
              actualSize: batchData.length,
              tableInfo: {
                name: tableInfo?.name,
                fieldsCount: tableInfo?.fields.length,
                tagsCount: tableInfo?.tags.length
              },
              sampleData: batchData[0]
            });

            // 详细检查生成的数据点
            if (batchData.length > 0) {
              const samplePoint = batchData[0];
              console.log(`🔍 数据点详细信息:`, {
                measurement: samplePoint.measurement,
                tagsCount: Object.keys(samplePoint.tags || {}).length,
                fieldsCount: Object.keys(samplePoint.fields || {}).length,
                hasTimestamp: !!samplePoint.timestamp,
                tags: samplePoint.tags,
                fields: samplePoint.fields,
                timestamp: samplePoint.timestamp
              });
            }

            if (batchData.length === 0) {
              console.warn(`⚠️ 批次 ${batchIndex + 1} 生成的数据为空`);
              continue;
            }

            // 写入数据
            const request: BatchWriteRequest = {
              connectionId: activeConnectionId,
              database: selectedDatabase,
              points: batchData,
              precision: 'ms',
            };

            console.log(`📝 准备写入批次 ${batchIndex + 1}/${totalBatches}:`, {
              connectionId: activeConnectionId,
              database: selectedDatabase,
              pointsCount: batchData.length,
              samplePoint: batchData[0]
            });

            // 详细比较自定义数据和预定义数据的格式差异
            console.log(`🔍 自定义数据格式分析:`, {
              measurement: batchData[0]?.measurement,
              tagsType: typeof batchData[0]?.tags,
              fieldsType: typeof batchData[0]?.fields,
              timestampType: typeof batchData[0]?.timestamp,
              tagsKeys: Object.keys(batchData[0]?.tags || {}),
              fieldsKeys: Object.keys(batchData[0]?.fields || {}),
              sampleTagValue: Object.values(batchData[0]?.tags || {})[0],
              sampleFieldValue: Object.values(batchData[0]?.fields || {})[0],
              timestampValue: batchData[0]?.timestamp
            });

            const result = await safeTauriInvoke<WriteResult>(
              'write_data_points',
              { request }
            );

            console.log(`📊 写入结果:`, {
              success: result.success,
              pointsWritten: result.pointsWritten,
              errors: result.errors,
              duration: result.duration
            });

            if (result.success) {
              processedCount += currentBatchSize;
              setGeneratedCount(processedCount);
              updateGenerationSpeed(processedCount, startTimeStamp);

              // 使用实际的写入数量，如果未定义则使用预期数量
              const actualWritten = result.pointsWritten || currentBatchSize;
              console.log(
                `✅ 成功写入批次 ${batchIndex + 1}/${totalBatches} 到表 "${selectedTable}", 预期数据点: ${currentBatchSize}, 实际写入: ${actualWritten}`
              );

              // 检查是否有数据实际写入
              if (result.pointsWritten === undefined || result.pointsWritten === 0) {
                console.warn(`⚠️ 警告：批次 ${batchIndex + 1} 写入成功但 pointsWritten 为 ${result.pointsWritten}，这可能表示数据没有实际写入`);
              }
            } else {
              console.error(`❌ 批次 ${batchIndex + 1} 写入失败:`, result.errors);
              showMessage.error(`批次 ${batchIndex + 1} 写入失败: ${result.errors?.map(e => e.error).join(', ')}`, undefined, 'data');
            }
          } catch (error) {
            console.error(`批次 ${batchIndex + 1} 处理失败:`, error);
            showMessage.error(`批次 ${batchIndex + 1} 处理失败: ${error}`, undefined, 'data');
            // 继续处理下一批次，不中断整个过程
          }

          // 更新进度 (降低更新频率)
          if (batchIndex % 5 === 0 || batchIndex === totalBatches - 1) {
            const batchProgress = (batchIndex + 1) / totalBatches;
            setProgress(Math.round(batchProgress * 100));
          }

          // 动态调整延迟时间
          const delay = recordCount > 10000 ? 20 : 50;
          await new Promise(resolve => setTimeout(resolve, delay));
        }

        if (!shouldStop) {
          setProgress(100);
          setCurrentTask('');
          const elapsed = (Date.now() - startTimeStamp) / 1000;

          // 验证数据是否真的写入了
          console.log('🔍 验证数据写入情况...');
          try {
            // 尝试多种验证查询
            const verifyQueries = [
              `SELECT COUNT(*) FROM "${selectedTable}" WHERE time > now() - 1h`,
              `SELECT COUNT(*) FROM "${selectedTable}"`,
              `SELECT * FROM "${selectedTable}" ORDER BY time DESC LIMIT 1`
            ];

            let verificationSuccess = false;
            let dataCount = 0;

            for (const query of verifyQueries) {
              try {
                console.log(`🔍 尝试验证查询: ${query}`);
                const verifyResult = await safeTauriInvoke<any>('execute_query', {
                  request: {
                    connectionId: activeConnectionId,
                    database: selectedDatabase,
                    query,
                  },
                });

                console.log(`📊 验证查询结果:`, {
                  success: verifyResult.success,
                  dataLength: verifyResult.data?.length,
                  rowCount: verifyResult.rowCount,
                  sampleData: verifyResult.data?.[0]
                });

                if (verifyResult.success && verifyResult.data && verifyResult.data.length > 0) {
                  if (query.includes('COUNT(*)')) {
                    // COUNT查询的结果
                    dataCount = verifyResult.data[0][1] || verifyResult.data[0][0] || 0;
                    console.log(`✅ COUNT查询成功：表 "${selectedTable}" 中有 ${dataCount} 条数据`);
                  } else {
                    // SELECT查询的结果
                    dataCount = verifyResult.rowCount || verifyResult.data.length;
                    console.log(`✅ SELECT查询成功：表 "${selectedTable}" 中有数据，返回了 ${dataCount} 行`);
                  }
                  verificationSuccess = true;
                  break;
                }
              } catch (queryError) {
                console.log(`❌ 验证查询失败 "${query}":`, queryError);
                continue;
              }
            }

            if (verificationSuccess) {
              showMessage.success(
                `成功为表 "${selectedTable}" 生成 ${processedCount} 条数据！用时: ${elapsed.toFixed(1)}秒，验证：表中有 ${dataCount} 条数据`,
                undefined,
                'data'
              );
            } else {
              console.warn('⚠️ 所有验证查询都失败了');
              showMessage.success(
                `成功为表 "${selectedTable}" 生成 ${processedCount} 条数据！用时: ${elapsed.toFixed(1)}秒（无法验证写入情况）`,
                undefined,
                'data'
              );
            }
          } catch (verifyError) {
            console.error('❌ 验证数据写入时出错:', verifyError);
            showMessage.success(
              `成功为表 "${selectedTable}" 生成 ${processedCount} 条数据！用时: ${elapsed.toFixed(1)}秒（验证时出错）`
            );
          }

          // 不再触发全局刷新，避免清空数据源树的展开状态
          // setTimeout(() => {
          //   dataExplorerRefresh.trigger();
          // }, 1000);
        }
      } else {
        // 预定义任务数据生成 - 只生成选中的任务
        const selectedTasksToGenerate = generatorTasks.filter(task => selectedTasks.includes(task.name));
        
        for (let i = 0; i < selectedTasksToGenerate.length && !shouldStop; i++) {
          const task = selectedTasksToGenerate[i];
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

            console.log(`📝 预定义任务写入批次 ${j + 1}/${batches}:`, {
              task: task.name,
              measurement: task.measurement,
              database: selectedDatabase,
              pointsCount: batch.length,
              samplePoint: batch[0]
            });

            // 详细分析预定义数据格式
            console.log(`🔍 预定义数据格式分析:`, {
              measurement: batch[0]?.measurement,
              tagsType: typeof batch[0]?.tags,
              fieldsType: typeof batch[0]?.fields,
              timestampType: typeof batch[0]?.timestamp,
              tagsKeys: Object.keys(batch[0]?.tags || {}),
              fieldsKeys: Object.keys(batch[0]?.fields || {}),
              sampleTagValue: Object.values(batch[0]?.tags || {})[0],
              sampleFieldValue: Object.values(batch[0]?.fields || {})[0],
              timestampValue: batch[0]?.timestamp
            });

            try {
              const result = await safeTauriInvoke<WriteResult>(
                'write_data_points',
                { request }
              );

              console.log(`📊 预定义任务写入结果:`, {
                success: result.success,
                pointsWritten: result.pointsWritten,
                errors: result.errors,
                duration: result.duration
              });

              if (result.success) {
                console.log(
                  `✅ 成功写入批次 ${j + 1}/${batches} 到数据库 "${selectedDatabase}", 表: "${task.measurement}", 数据点: ${batch.length}, 实际写入: ${result.pointsWritten}`
                );
              } else {
                console.error(`❌ 写入批次 ${j + 1} 失败:`, result.errors);
                showMessage.error(`批次 ${j + 1} 写入失败: ${result.errors?.map(e => e.error).join(', ')}`);
                // 如果有错误但不是全部失败，继续处理
                if (result.errors && result.errors.length < batch.length) {
                  showMessage.warning(
                    `批次 ${j + 1} 部分写入失败，继续处理下一批次`
                  );
                }
              }
            } catch (error) {
              console.error(`❌ 写入批次 ${j + 1} 失败:`, error);
              showMessage.error(`写入批次 ${j + 1} 失败: ${error}`);
              // 继续处理下一批次
            }

            // 更新进度
            const batchProgress =
              ((j + 1) / batches) * (1 / selectedTasksToGenerate.length);
            const totalProgress = i / selectedTasksToGenerate.length + batchProgress;
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

          // 不再触发全局刷新，避免清空数据源树的展开状态
          // setTimeout(() => {
          //   dataExplorerRefresh.trigger();
          // }, 1000); // 延迟1秒刷新，确保数据已经写入
        } else {
          setCurrentTask('');
          showMessage.info('数据生成已停止');
        }
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

  // 当选择的数据库改变时加载表列表
  React.useEffect(() => {
    if (selectedDatabase && mode === 'custom') {
      loadTables();
    }
  }, [selectedDatabase, mode]);

  // 当选择的表改变时加载表结构
  React.useEffect(() => {
    if (selectedTable && mode === 'custom' && activeConnectionId && selectedDatabase) {
      console.log('useEffect 触发 loadTableInfo:', { selectedTable, mode, activeConnectionId, selectedDatabase });
      loadTableInfo(selectedTable);
    } else {
      console.log('useEffect 未触发 loadTableInfo，条件不满足:', { selectedTable, mode, activeConnectionId, selectedDatabase });
      if (!selectedTable && tableInfo) {
        setTableInfo(null);
      }
    }
  }, [selectedTable, mode, activeConnectionId, selectedDatabase]);

  // 处理任务选择
  const handleTaskSelection = (taskName: string, checked: boolean) => {
    if (checked) {
      setSelectedTasks(prev => [...prev, taskName]);
    } else {
      setSelectedTasks(prev => prev.filter(name => name !== taskName));
    }
  };

  // 全选/全不选
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedTasks(generatorTasks.map(task => task.name));
    } else {
      setSelectedTasks([]);
    }
  };

  // 清空数据
  const clearData = async () => {
    if (!activeConnectionId) {
      showMessage.error('请先连接到InfluxDB');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'custom') {
        if (!selectedTable) {
          showMessage.error('请选择要清空的表');
          return;
        }
        
        await safeTauriInvoke('execute_query', {
          request: {
            connectionId: activeConnectionId,
            database: selectedDatabase,
            query: `DROP MEASUREMENT "${selectedTable}"`,
          },
        });
        showMessage.success(`表 "${selectedTable}" 数据已清空`);
      } else {
        // 预定义任务模式 - 只清空选中的任务
        const selectedTasksToDelete = generatorTasks.filter(task => selectedTasks.includes(task.name));
        
        if (selectedTasksToDelete.length === 0) {
          showMessage.warning('请先选择要清空的数据表');
          return;
        }
        
        for (const task of selectedTasksToDelete) {
          await safeTauriInvoke('execute_query', {
            request: {
              connectionId: activeConnectionId,
              database: selectedDatabase,
              query: `DROP MEASUREMENT "${task.measurement}"`,
            },
          });
        }
        setCompletedTasks(prev => prev.filter(name => !selectedTasks.includes(name)));
        showMessage.success(`已清空 ${selectedTasksToDelete.length} 个选中数据表的数据`);
      }
    } catch (error) {
      console.error('清空数据失败:', error);
      showMessage.error(`清空数据失败: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='space-y-4'>
      {/* 操作区域 - 所有控制元素在同一行，仅在已连接时显示 */}
      {activeConnectionId && (
        <div className='flex flex-wrap items-center gap-3 p-4 border rounded-lg bg-muted/30'>
        {/* 目标数据库 */}
        <div className='flex items-center gap-2'>
          <span className='text-sm font-medium whitespace-nowrap'>目标数据库:</span>
          <Select
            value={selectedDatabase}
            onValueChange={setSelectedDatabase}
            disabled={!activeConnectionId || databases.length === 0}
          >
            <SelectTrigger className='w-[160px] h-8 text-sm'>
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
            <SelectContent className="min-w-[160px] max-w-[300px]">
              {databases.length > 0 ? (
                databases.map(db => (
                  <SelectItem key={db} value={db}>
                    <span className="truncate block" title={db}>{db}</span>
                  </SelectItem>
                ))
              ) : (
                <div className="px-2 py-1.5 text-sm text-muted-foreground">
                  暂无数据库
                </div>
              )}
            </SelectContent>
          </Select>
          <Button
            onClick={loadDatabases}
            disabled={!activeConnectionId}
            variant='outline'
            size='sm'
            className='h-8 px-2'
          >
            <RefreshCw className='w-4 h-4' />
          </Button>
        </div>
        
        {/* 生成模式 */}
        <div className='flex items-center gap-2'>
          <span className='text-sm font-medium whitespace-nowrap'>生成模式:</span>
          <Select value={mode} onValueChange={(value: 'predefined' | 'custom') => {
            setMode(value);
            setSelectedTasks([]);
          }}>
            <SelectTrigger className='w-[120px] h-8 text-sm'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="predefined">预定义任务</SelectItem>
              <SelectItem value="custom">自定义表</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 自定义模式的表选择 */}
        {mode === 'custom' && (
          <>
            <div className='flex items-center gap-2'>
              <span className='text-sm font-medium whitespace-nowrap'>目标表:</span>
              <Select
                value={selectedTable}
                onValueChange={setSelectedTable}
                disabled={!selectedDatabase || tables.length === 0}
              >
                <SelectTrigger className='w-[160px] h-8 text-sm'>
                  <SelectValue 
                    placeholder={
                      !selectedDatabase 
                        ? '请先选择数据库' 
                        : tables.length === 0 
                          ? '暂无表' 
                          : '选择表'
                    } 
                  />
                </SelectTrigger>
                <SelectContent className="min-w-[160px] max-w-[300px]">
                  {tables.length > 0 ? (
                    tables.map(table => (
                      <SelectItem key={table} value={table}>
                        <span className="truncate block" title={table}>{table}</span>
                      </SelectItem>
                    ))
                  ) : (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      暂无表
                    </div>
                  )}
                </SelectContent>
              </Select>
              <Button
                onClick={loadTables}
                disabled={!selectedDatabase}
                variant='outline'
                size='sm'
                className='h-8 px-2'
                title="刷新表列表"
              >
                <RefreshCw className='w-4 h-4' />
              </Button>
              {selectedTable && (
                <Button
                  onClick={() => loadTableInfo(selectedTable)}
                  disabled={!selectedTable || loading}
                  variant='outline'
                  size='sm'
                  className='h-8 px-3 flex items-center gap-1.5'
                  title="刷新表结构信息"
                >
                  <Database className='w-4 h-4' />
                  <span className='text-xs hidden sm:inline'>刷新结构</span>
                </Button>
              )}
            </div>
            
            <div className='flex items-center gap-2'>
              <Label htmlFor="recordCount" className='text-sm font-medium whitespace-nowrap'>
                生成数量:
              </Label>
              <Input
                id="recordCount"
                type="number"
                value={recordCount}
                onChange={(e) => setRecordCount(Number(e.target.value))}
                className='w-20 h-8 text-sm'
                min={1}
                max={10000}
              />
            </div>
          </>
        )}
        
        {/* 操作按钮 */}
        <div className='flex items-center gap-2 ml-auto'>
          {!loading ? (
            <Button
              onClick={generateData}
              disabled={
                !activeConnectionId || 
                !selectedDatabase || 
                (mode === 'custom' && (!selectedTable || !tableInfo)) ||
                (mode === 'predefined' && selectedTasks.length === 0)
              }
              className='h-8 text-sm'
            >
              <PlayCircle className='w-4 h-4 mr-2' />
              生成数据
            </Button>
          ) : (
            <div className='flex gap-2'>
              <Button
                onClick={togglePause}
                variant='outline'
                className='h-8 text-sm'
              >
                {isPaused ? (
                  <>
                    <PlayCircle className='w-4 h-4 mr-2' />
                    恢复
                  </>
                ) : (
                  <>
                    <Square className='w-4 h-4 mr-2' />
                    暂停
                  </>
                )}
              </Button>
              <Button
                onClick={stopGeneration}
                disabled={isStopping}
                variant='destructive'
                className='h-8 text-sm'
              >
                <Square className='w-4 h-4 mr-2' />
                {isStopping ? '正在停止...' : '停止生成'}
              </Button>
            </div>
          )}
          <Button
            onClick={clearData}
            disabled={
              loading || 
              !activeConnectionId || 
              !selectedDatabase ||
              (mode === 'custom' && !selectedTable)
            }
            variant='outline'
            className='h-8 text-sm'
          >
            <RefreshCw className='w-4 h-4 mr-2' />
            清空数据
          </Button>
        </div>
        </div>
      )}

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
            <div className='flex justify-between items-center text-sm text-muted-foreground mb-2'>
              <span>{currentTask || '正在处理...'}</span>
              <span>{progress}%</span>
            </div>
            
            {/* 性能指标显示 */}
            <div className='grid grid-cols-2 gap-4 p-3 bg-muted/50 rounded-lg text-sm'>
              <div className='flex justify-between'>
                <span>已生成:</span>
                <span className='font-medium'>{generatedCount.toLocaleString()} 条</span>
              </div>
              <div className='flex justify-between'>
                <span>生成速度:</span>
                <span className='font-medium'>{generationSpeed} 条/秒</span>
              </div>
              <div className='flex justify-between'>
                <span>状态:</span>
                <span className={`font-medium ${isPaused ? 'text-yellow-600' : 'text-green-600'}`}>
                  {isPaused ? '已暂停' : '生成中'}
                </span>
              </div>
              <div className='flex justify-between'>
                <span>用时:</span>
                <span className='font-medium'>
                  {startTime > 0 ? Math.floor((Date.now() - startTime) / 1000) : 0} 秒
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 自定义表信息显示 */}
        {mode === 'custom' && tableInfo && (
          <Card className='mb-6'>
            <CardHeader className="pb-3">
              <CardTitle className='flex items-center gap-2 text-base'>
                <Database className='w-4 h-4' />
                表结构信息: {tableInfo.name}
              </CardTitle>
              <CardDescription className="text-sm">
                将为此表生成 {recordCount} 条随机数据
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                {/* 字段信息 */}
                <div>
                  <h5 className='text-sm font-medium mb-3 flex items-center gap-2'>
                    <Database className='w-3 h-3' />
                    字段 ({tableInfo.fields.length} 个)
                  </h5>
                  <div className='space-y-2'>
                    {tableInfo.fields.length > 0 ? (
                      tableInfo.fields.map((field, index) => (
                        <div key={`field-${field.name}-${index}`} className='flex items-center justify-between p-2 bg-muted rounded text-sm'>
                          <span className='text-sm font-medium'>{field.name}</span>
                          <div className='flex items-center gap-2'>
                            <Badge variant='outline' className="text-xs">{field.type}</Badge>
                            {field.lastValue !== undefined && (
                              <span className='text-xs text-muted-foreground'>
                                示例: {String(field.lastValue).substring(0, 20)}
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className='text-sm text-muted-foreground'>暂无字段</div>
                    )}
                  </div>
                </div>

                {/* 标签信息 */}
                <div>
                  <h5 className='text-sm font-medium mb-3 flex items-center gap-2'>
                    <TagIcon className='w-3 h-3' />
                    标签 ({tableInfo.tags.length} 个)
                  </h5>
                  <div className='space-y-2'>
                    {tableInfo.tags.length > 0 ? (
                      tableInfo.tags.map((tag, index) => (
                        <div key={`tag-${tag.name}-${index}`} className='flex items-center justify-between p-2 bg-muted rounded text-sm'>
                          <span className='text-sm font-medium'>{tag.name}</span>
                          <div className='flex items-center gap-2'>
                            <Badge variant='outline' className="text-xs">{tag.type}</Badge>
                            {tag.lastValue !== undefined && (
                              <span className='text-xs text-muted-foreground'>
                                示例: {String(tag.lastValue).substring(0, 20)}
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className='text-sm text-muted-foreground'>暂无标签</div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {mode === 'predefined' && (
          <>
            <div className='flex items-center justify-between mb-4'>
              <h4 className='text-lg font-semibold'>数据表选择</h4>
              <div className='flex items-center gap-3'>
                <div className='flex items-center gap-2'>
                  <Checkbox
                    id="selectAll"
                    checked={selectedTasks.length === generatorTasks.length && generatorTasks.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                  <Label htmlFor="selectAll" className='text-sm font-medium'>
                    全选 ({selectedTasks.length}/{generatorTasks.length})
                  </Label>
                </div>
              </div>
            </div>
            <div className='space-y-4'>
              {generatorTasks.map((task, index) => (
            <Card key={task.name} className={selectedTasks.includes(task.name) ? 'ring-2 ring-primary' : ''}>
              <CardHeader className='pb-3'>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-3 flex-1'>
                    <Checkbox
                      id={`task-${index}`}
                      checked={selectedTasks.includes(task.name)}
                      onCheckedChange={(checked) => handleTaskSelection(task.name, !!checked)}
                    />
                    <div className='flex-1'>
                      <CardTitle className='text-base'>{task.name}</CardTitle>
                      <CardDescription className='mt-1'>
                        {task.description}
                      </CardDescription>
                    </div>
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
                    中创建 {selectedTasks.length} 张选中的测试数据表
                  </p>
                  <p>
                    • 总共将生成约{' '}
                    {generatorTasks
                      .filter(task => selectedTasks.includes(task.name))
                      .reduce((sum, task) => sum + task.recordCount, 0)}{' '}
                    条测试记录
                  </p>
                  <p>• 请先勾选要生成的数据表，然后点击"生成数据"按钮</p>
                  <p>• 数据时间戳将分布在指定的时间范围内</p>
                  <p>• 所有数值都是随机生成的模拟数据</p>
                </div>
              </div>
            </Alert>
          </>
        )}
      </div>
    </div>
  );
};

export default DataGenerator;
