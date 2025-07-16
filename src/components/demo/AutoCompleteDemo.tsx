/**
 * 全面智能查询编辑器功能演示组件
 */

import React from 'react';
import { Card, Typography, Alert, Badge } from '@/components/ui';
import { 
  Info, Lightbulb, Code, Database, Zap, Shield, 
  Paintbrush, Keyboard, CheckCircle, AlertTriangle, 
  MessageSquare, Settings, Sparkles, Target
} from 'lucide-react';

const { Title, Paragraph, Text } = Typography;

const SmartQueryEditorDemo: React.FC = () => {
  return (
    <div className="space-y-6">
      <Card>
        <div className="flex items-center gap-3 mb-4">
          <Sparkles className="w-6 h-6 text-blue-600" />
          <Title level={3}>全面智能查询编辑器</Title>
          <Badge color="green" text="全新升级" />
        </div>
        
        <Alert 
          type="success" 
          message="重大升级完成"
          description="查询编辑器已全面升级，提供极致用户友好的 InfluxDB 查询体验，包含智能补全、语法验证、自动格式化等专业功能。"
          showIcon
          icon={<CheckCircle className="w-4 h-4" />}
          className="mb-6"
        />

        <div className="space-y-6">
          {/* 核心功能 */}
          <div>
            <Title level={4} className="flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-600" />
              核心功能特性
            </Title>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
              <div className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <Code className="w-5 h-5 text-green-600" />
                  <Text strong>全语法智能补全</Text>
                </div>
                <Paragraph className="text-sm text-muted-foreground mb-0">
                  覆盖所有 InfluxDB 关键词、函数、操作符，支持模糊匹配和上下文感知
                </Paragraph>
              </div>
              
              <div className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-5 h-5 text-blue-600" />
                  <Text strong>实时语法验证</Text>
                </div>
                <Paragraph className="text-sm text-muted-foreground mb-0">
                  即时检查语法错误、提供修复建议，确保查询语句的正确性
                </Paragraph>
              </div>
              
              <div className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <Paintbrush className="w-5 h-5 text-purple-600" />
                  <Text strong>专业格式化</Text>
                </div>
                <Paragraph className="text-sm text-muted-foreground mb-0">
                  自动格式化查询语句，提高代码可读性和维护性
                </Paragraph>
              </div>
              
              <div className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <Database className="w-5 h-5 text-indigo-600" />
                  <Text strong>动态数据感知</Text>
                </div>
                <Paragraph className="text-sm text-muted-foreground mb-0">
                  实时获取数据库结构，提供准确的表名、字段名和标签提示
                </Paragraph>
              </div>
              
              <div className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-5 h-5 text-yellow-600" />
                  <Text strong>性能优化建议</Text>
                </div>
                <Paragraph className="text-sm text-muted-foreground mb-0">
                  智能检测性能问题，提供优化建议和最佳实践提醒
                </Paragraph>
              </div>
              
              <div className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <Keyboard className="w-5 h-5 text-red-600" />
                  <Text strong>丰富快捷键</Text>
                </div>
                <Paragraph className="text-sm text-muted-foreground mb-0">
                  专业的快捷键支持，提高查询编写和调试效率
                </Paragraph>
              </div>
            </div>
          </div>

          {/* 智能提示示例 */}
          <div>
            <Title level={4} className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-orange-600" />
              智能提示示例
            </Title>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="space-y-3">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-3 rounded-lg border-l-4 border-blue-500">
                  <Text code className="text-blue-800">输入 "s" → 提示 "SELECT"</Text>
                  <Text className="text-sm text-blue-600 mt-1">关键词智能匹配</Text>
                </div>
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-3 rounded-lg border-l-4 border-green-500">
                  <Text code className="text-green-800">SELECT 后 → 提示 "*", 字段名, 函数</Text>
                  <Text className="text-sm text-green-600 mt-1">上下文感知提示</Text>
                </div>
                <div className="bg-gradient-to-r from-purple-50 to-violet-50 p-3 rounded-lg border-l-4 border-purple-500">
                  <Text code className="text-purple-800">FROM 后 → 提示当前数据库的测量名</Text>
                  <Text className="text-sm text-purple-600 mt-1">动态数据库结构</Text>
                </div>
              </div>
              <div className="space-y-3">
                <div className="bg-gradient-to-r from-orange-50 to-red-50 p-3 rounded-lg border-l-4 border-orange-500">
                  <Text code className="text-orange-800">WHERE 后 → 智能提示字段和操作符</Text>
                  <Text className="text-sm text-orange-600 mt-1">条件语句辅助</Text>
                </div>
                <div className="bg-gradient-to-r from-cyan-50 to-blue-50 p-3 rounded-lg border-l-4 border-cyan-500">
                  <Text code className="text-cyan-800">函数名 → 自动补全参数括号</Text>
                  <Text className="text-sm text-cyan-600 mt-1">函数调用辅助</Text>
                </div>
                <div className="bg-gradient-to-r from-pink-50 to-rose-50 p-3 rounded-lg border-l-4 border-pink-500">
                  <Text code className="text-pink-800">时间条件 → 提供常用时间表达式</Text>
                  <Text className="text-sm text-pink-600 mt-1">时间查询优化</Text>
                </div>
              </div>
            </div>
          </div>

          {/* 支持的完整语法 */}
          <div>
            <Title level={4} className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-gray-600" />
              支持的完整 InfluxDB 语法
            </Title>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
              <div className="p-3 bg-blue-50 rounded-lg">
                <Text strong className="text-blue-800">查询操作</Text>
                <ul className="text-sm text-blue-600 mt-2 space-y-1">
                  <li>• SELECT / FROM / WHERE</li>
                  <li>• GROUP BY / ORDER BY</li>
                  <li>• LIMIT / OFFSET / SLIMIT</li>
                  <li>• 子查询支持</li>
                </ul>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <Text strong className="text-green-800">聚合函数</Text>
                <ul className="text-sm text-green-600 mt-2 space-y-1">
                  <li>• COUNT / SUM / MEAN</li>
                  <li>• MIN / MAX / FIRST / LAST</li>
                  <li>• PERCENTILE / MEDIAN</li>
                  <li>• 技术分析函数</li>
                </ul>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg">
                <Text strong className="text-purple-800">管理操作</Text>
                <ul className="text-sm text-purple-600 mt-2 space-y-1">
                  <li>• SHOW DATABASES</li>
                  <li>• SHOW MEASUREMENTS</li>
                  <li>• CREATE / DROP</li>
                  <li>• 用户权限管理</li>
                </ul>
              </div>
              <div className="p-3 bg-orange-50 rounded-lg">
                <Text strong className="text-orange-800">高级特性</Text>
                <ul className="text-sm text-orange-600 mt-2 space-y-1">
                  <li>• 正则表达式匹配</li>
                  <li>• 时间序列分析</li>
                  <li>• 连续查询 (CQ)</li>
                  <li>• 保留策略管理</li>
                </ul>
              </div>
            </div>
          </div>

          {/* 快捷键指南 */}
          <div>
            <Title level={4} className="flex items-center gap-2">
              <Keyboard className="w-5 h-5 text-gray-600" />
              快捷键指南
            </Title>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center p-2 bg-muted/50 rounded">
                  <Text className="text-sm">执行查询</Text>
                  <Badge variant="outline">Ctrl+Enter / F5</Badge>
                </div>
                <div className="flex justify-between items-center p-2 bg-muted/50 rounded">
                  <Text className="text-sm">保存查询</Text>
                  <Badge variant="outline">Ctrl+S</Badge>
                </div>
                <div className="flex justify-between items-center p-2 bg-muted/50 rounded">
                  <Text className="text-sm">格式化代码</Text>
                  <Badge variant="outline">Shift+Alt+F</Badge>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center p-2 bg-muted/50 rounded">
                  <Text className="text-sm">触发智能提示</Text>
                  <Badge variant="outline">Ctrl+Space</Badge>
                </div>
                <div className="flex justify-between items-center p-2 bg-muted/50 rounded">
                  <Text className="text-sm">注释/取消注释</Text>
                  <Badge variant="outline">Ctrl+/</Badge>
                </div>
                <div className="flex justify-between items-center p-2 bg-muted/50 rounded">
                  <Text className="text-sm">多光标编辑</Text>
                  <Badge variant="outline">Ctrl+D</Badge>
                </div>
              </div>
            </div>
          </div>

          {/* 性能和安全提示 */}
          <div>
            <Title level={4} className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
              性能和安全提示
            </Title>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <Alert
                type="warning"
                message="性能优化"
                description="系统会自动检测可能的性能问题，如全表扫描、大时间范围查询等，并提供优化建议。"
                showIcon
                className="h-full"
              />
              <Alert
                type="info"
                message="安全检查"
                description="对于 DROP、DELETE 等危险操作，系统会提供额外的安全提醒和确认。"
                showIcon
                className="h-full"
              />
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default SmartQueryEditorDemo;