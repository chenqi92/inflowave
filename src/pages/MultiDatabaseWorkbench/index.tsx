/**
 * 多数据库工作台页面
 * 
 * 展示新的多数据库工作台功能
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Alert,
  AlertDescription,
  Button,
  Badge,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui';
import {
  Database,
  TreePine,
  BarChart,
  Search,
  Rocket,
  Info,
  ExternalLink,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { MultiDatabaseWorkbench } from '@/components/workbench/MultiDatabaseWorkbench';
import { useConnectionStore } from '@/store/connection';
import { showMessage } from '@/utils/message';

// 状态类型定义
type FeatureStatus = 'completed' | 'in-progress' | 'planned';

// 功能特性列表
const FEATURES = [
  {
    icon: <Database className="w-5 h-5 text-blue-500" />,
    title: 'InfluxDB 支持',
    description: '完整的 InfluxDB 1.x/2.x 支持，包括 InfluxQL 和 Flux 查询语言',
    status: 'completed' as FeatureStatus,
  },
  {
    icon: <TreePine className="w-5 h-5 text-green-500" />,
    title: 'IoTDB 支持',
    description: '物联网时间序列数据库 IoTDB 的原生支持',
    status: 'in-progress' as FeatureStatus,
  },
  {
    icon: <BarChart className="w-5 h-5 text-orange-500" />,
    title: 'Prometheus 支持',
    description: '监控系统 Prometheus 的 PromQL 查询支持',
    status: 'planned' as FeatureStatus,
  },
  {
    icon: <Search className="w-5 h-5 text-purple-500" />,
    title: 'Elasticsearch 支持',
    description: '搜索引擎 Elasticsearch 的 Query DSL 支持',
    status: 'planned' as FeatureStatus,
  },
];

// 状态图标映射
const STATUS_ICONS: Record<FeatureStatus, React.ReactElement> = {
  completed: <CheckCircle className="w-4 h-4 text-green-500" />,
  'in-progress': <AlertCircle className="w-4 h-4 text-yellow-500" />,
  planned: <AlertCircle className="w-4 h-4 text-gray-400" />,
};

// 状态标签映射
const STATUS_LABELS: Record<FeatureStatus, string> = {
  completed: '已完成',
  'in-progress': '开发中',
  planned: '计划中',
};

const MultiDatabaseWorkbenchPage: React.FC = () => {
  // Store hooks
  const { connections, activeConnectionId } = useConnectionStore();

  // State
  const [activeTab, setActiveTab] = useState('workbench');
  const [showIntro, setShowIntro] = useState(true);

  // 获取当前连接
  const currentConnection = connections.find(conn => conn.id === activeConnectionId);

  // 检查是否有连接
  const hasConnections = connections.length > 0;
  const hasActiveConnection = !!currentConnection;

  // 自动隐藏介绍
  useEffect(() => {
    if (hasActiveConnection) {
      const timer = setTimeout(() => setShowIntro(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [hasActiveConnection]);

  return (
    <div className="h-full flex flex-col space-y-4 p-4">
      {/* 页面标题 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Rocket className="w-6 h-6 text-blue-500" />
            <span>多数据库工作台</span>
            <Badge variant="outline" className="bg-blue-50 text-blue-700">
              Beta
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            统一的多数据库查询、管理和可视化平台，支持 InfluxDB、IoTDB、Prometheus、Elasticsearch 等多种数据库。
          </p>
        </CardContent>
      </Card>

      {/* 连接状态提示 */}
      {!hasConnections && (
        <Alert>
          <Info className="w-4 h-4" />
          <AlertDescription>
            欢迎使用多数据库工作台！请先{' '}
            <Button
              variant="link"
              className="p-0 h-auto"
              onClick={() => window.location.href = '/connections'}
            >
              创建数据库连接
            </Button>
            {' '}以开始使用。
          </AlertDescription>
        </Alert>
      )}

      {!hasActiveConnection && hasConnections && (
        <Alert>
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>
            请在连接管理页面中激活一个数据库连接以使用工作台功能。
          </AlertDescription>
        </Alert>
      )}

      {/* 主要内容 */}
      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="workbench">工作台</TabsTrigger>
            <TabsTrigger value="features">功能特性</TabsTrigger>
            <TabsTrigger value="docs">文档</TabsTrigger>
          </TabsList>

          {/* 工作台标签页 */}
          <TabsContent value="workbench" className="h-full mt-4">
            {showIntro && hasActiveConnection && (
              <Alert className="mb-4">
                <CheckCircle className="w-4 h-4" />
                <AlertDescription>
                  已连接到 <strong>{currentConnection.name}</strong> ({currentConnection.dbType?.toUpperCase()})。
                  您可以开始使用多数据库工作台的所有功能。
                  <Button
                    variant="link"
                    className="p-0 h-auto ml-2"
                    onClick={() => setShowIntro(false)}
                  >
                    关闭提示
                  </Button>
                </AlertDescription>
              </Alert>
            )}
            
            <MultiDatabaseWorkbench />
          </TabsContent>

          {/* 功能特性标签页 */}
          <TabsContent value="features" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>支持的数据库类型</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {FEATURES.map((feature, index) => (
                    <Card key={index} className="border-l-4 border-l-blue-500">
                      <CardContent className="p-4">
                        <div className="flex items-start space-x-3">
                          {feature.icon}
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <h3 className="font-semibold">{feature.title}</h3>
                              <div className="flex items-center space-x-1">
                                {STATUS_ICONS[feature.status]}
                                <Badge variant="outline" className="text-xs">
                                  {STATUS_LABELS[feature.status]}
                                </Badge>
                              </div>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {feature.description}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>核心功能</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <h4 className="font-medium">数据源管理</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• 统一的数据源浏览器</li>
                      <li>• 智能的元数据管理</li>
                      <li>• 收藏和快速访问</li>
                      <li>• 实时连接状态监控</li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium">查询引擎</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• 多语言查询支持</li>
                      <li>• 智能代码补全</li>
                      <li>• 查询历史和保存</li>
                      <li>• 实时执行监控</li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium">数据可视化</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• 多种图表类型</li>
                      <li>• 智能字段映射</li>
                      <li>• 实时数据更新</li>
                      <li>• 导出和分享</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 文档标签页 */}
          <TabsContent value="docs" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>快速开始</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-medium">1. 创建数据库连接</h4>
                  <p className="text-sm text-muted-foreground">
                    在连接管理页面中添加您的数据库连接信息，支持 InfluxDB、IoTDB 等多种数据库类型。
                  </p>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium">2. 浏览数据源</h4>
                  <p className="text-sm text-muted-foreground">
                    使用左侧的数据源浏览器查看数据库、表和字段结构，支持搜索和收藏功能。
                  </p>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium">3. 执行查询</h4>
                  <p className="text-sm text-muted-foreground">
                    在查询编辑器中编写和执行查询，支持多种查询语言和智能补全。
                  </p>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium">4. 可视化数据</h4>
                  <p className="text-sm text-muted-foreground">
                    将查询结果转换为图表，支持折线图、柱状图、饼图等多种可视化类型。
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>支持的查询语言</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="font-medium flex items-center space-x-2">
                      <Database className="w-4 h-4 text-blue-500" />
                      <span>InfluxDB</span>
                    </h4>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p><strong>InfluxQL:</strong> SELECT * FROM "measurement" WHERE time &gt;= now() - 1h</p>
                      <p><strong>Flux:</strong> from(bucket: "my-bucket") |&gt; range(start: -1h)</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-medium flex items-center space-x-2">
                      <TreePine className="w-4 h-4 text-green-500" />
                      <span>IoTDB</span>
                    </h4>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p><strong>SQL:</strong> SELECT * FROM root.sg1.d1 WHERE time &gt;= now() - 1h</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>相关链接</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Button variant="outline" className="w-full justify-start">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    InfluxDB 官方文档
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    IoTDB 官方文档
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    项目 GitHub 仓库
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default MultiDatabaseWorkbenchPage;
