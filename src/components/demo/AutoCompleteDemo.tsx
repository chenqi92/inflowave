/**
 * 智能自动补全功能演示组件
 */

import React from 'react';
import { Card, Typography, Alert } from '@/components/ui';
import { Info, Lightbulb, Code, Database } from 'lucide-react';

const { Title, Paragraph, Text } = Typography;

const AutoCompleteDemo: React.FC = () => {
  return (
    <div className="space-y-6">
      <Card>
        <div className="flex items-center gap-3 mb-4">
          <Lightbulb className="w-6 h-6 text-blue-600" />
          <Title level={3}>智能自动补全功能</Title>
        </div>
        
        <Alert 
          type="info" 
          message="升级提示"
          description="查询编辑器现已升级为上下文感知的智能自动补全系统，支持完整的 InfluxDB SQL 语法。"
          showIcon
          icon={<Info className="w-4 h-4" />}
          className="mb-4"
        />

        <div className="space-y-4">
          <div>
            <Title level={4}>主要功能特性：</Title>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Code className="w-5 h-5 text-green-600 mt-0.5" />
                  <div>
                    <Text strong>智能关键词提示</Text>
                    <Paragraph className="text-sm text-muted-foreground mb-0">
                      输入 "s" 或 "se" 自动提示 "SELECT"，支持所有 InfluxDB 关键词的模糊匹配
                    </Paragraph>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <Database className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <Text strong>上下文感知</Text>
                    <Paragraph className="text-sm text-muted-foreground mb-0">
                      根据当前位置智能提示：SELECT 后提示字段，FROM 后提示表名
                    </Paragraph>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-purple-600 mt-0.5" />
                  <div>
                    <Text strong>动态数据提示</Text>
                    <Paragraph className="text-sm text-muted-foreground mb-0">
                      实时获取当前数据库的测量名、字段名和标签名进行提示
                    </Paragraph>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <Lightbulb className="w-5 h-5 text-orange-600 mt-0.5" />
                  <div>
                    <Text strong>查询模板</Text>
                    <Paragraph className="text-sm text-muted-foreground mb-0">
                      提供常用查询模板，快速生成标准 InfluxDB 查询语句
                    </Paragraph>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <Title level={4}>使用示例：</Title>
            <div className="space-y-3">
              <div className="bg-muted/50 p-3 rounded-lg">
                <Text code>1. 输入 "s" → 自动提示 "SELECT"</Text>
              </div>
              <div className="bg-muted/50 p-3 rounded-lg">
                <Text code>2. SELECT 后自动提示 "*" 和可用字段</Text>
              </div>
              <div className="bg-muted/50 p-3 rounded-lg">
                <Text code>3. FROM 后根据当前数据库提示测量名</Text>
              </div>
              <div className="bg-muted/50 p-3 rounded-lg">
                <Text code>4. WHERE 后智能提示字段名和操作符</Text>
              </div>
            </div>
          </div>

          <div>
            <Title level={4}>支持的语法：</Title>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Text strong>查询语句：</Text>
                <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                  <li>• SELECT / FROM / WHERE</li>
                  <li>• GROUP BY / ORDER BY</li>
                  <li>• LIMIT / OFFSET</li>
                  <li>• 聚合函数</li>
                </ul>
              </div>
              <div>
                <Text strong>管理语句：</Text>
                <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                  <li>• SHOW MEASUREMENTS</li>
                  <li>• SHOW FIELD KEYS</li>
                  <li>• SHOW TAG KEYS</li>
                  <li>• CREATE / DROP</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default AutoCompleteDemo;