import React from 'react';
import { Typography } from 'antd';
import { Card, Space } from '@/components/ui';
// TODO: Replace these Ant Design components: Divider

const { Title, Paragraph, Text, Link } = Typography;

const TypographyTest: React.FC = () => {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Card title="Typography 组件样式测试" className="mb-6">
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          
          {/* 标题测试 */}
          <div>
            <Title level={4}>标题样式测试</Title>
            <Title level={1}>H1 标题</Title>
            <Title level={2}>H2 标题</Title>
            <Title level={3}>H3 标题</Title>
            <Title level={4}>H4 标题</Title>
            <Title level={5}>H5 标题</Title>
          </div>

          <Divider />

          {/* 文本样式测试 */}
          <div>
            <Title level={4}>文本样式测试</Title>
            <Paragraph>
              这是一个普通的段落文本。Lorem ipsum dolor sit amet, consectetur adipiscing elit, 
              sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
            </Paragraph>
            
            <Space wrap>
              <Text>普通文本</Text>
              <Text type="secondary">次要文本</Text>
              <Text type="success">成功文本</Text>
              <Text type="warning">警告文本</Text>
              <Text type="danger">危险文本</Text>
            </Space>
            
            <br /><br />
            
            <Space wrap>
              <Text strong>粗体文本</Text>
              <Text italic>斜体文本</Text>
              <Text underline>下划线文本</Text>
              <Text delete>删除线文本</Text>
              <Text code>代码文本</Text>
              <Text mark>标记文本</Text>
            </Space>
          </div>

          <Divider />

          {/* 尺寸测试 */}
          <div>
            <Title level={4}>文本尺寸测试</Title>
            <Space direction="vertical">
              <Text className="text-xs">超小文本 (text-xs)</Text>
              <Text className="text-sm">小文本 (text-sm)</Text>
              <Text className="text-base">基础文本 (text-base)</Text>
              <Text className="text-lg">大文本 (text-lg)</Text>
              <Text className="text-xl">超大文本 (text-xl)</Text>
              <Text className="text-2xl">2XL文本 (text-2xl)</Text>
            </Space>
          </div>

          <Divider />

          {/* 链接测试 */}
          <div>
            <Title level={4}>链接样式测试</Title>
            <Space wrap>
              <Link href="https://ant.design" target="_blank">
                普通链接
              </Link>
              <Link href="https://ant.design" target="_blank" strong>
                粗体链接
              </Link>
              <Link href="https://ant.design" target="_blank" underline>
                下划线链接
              </Link>
              <Link href="https://ant.design" target="_blank" disabled>
                禁用链接
              </Link>
            </Space>
          </div>

          <Divider />

          {/* 列表测试 */}
          <div>
            <Title level={4}>列表样式测试</Title>
            <Paragraph>
              <ul>
                <li>无序列表项 1</li>
                <li>无序列表项 2</li>
                <li>无序列表项 3</li>
              </ul>
            </Paragraph>
            
            <Paragraph>
              <ol>
                <li>有序列表项 1</li>
                <li>有序列表项 2</li>
                <li>有序列表项 3</li>
              </ol>
            </Paragraph>
          </div>

          <Divider />

          {/* 引用测试 */}
          <div>
            <Title level={4}>引用样式测试</Title>
            <Paragraph>
              <blockquote>
                这是一个引用块。引用块通常用于显示来自其他来源的文本或重要信息。
                它应该有适当的缩进和边框样式。
              </blockquote>
            </Paragraph>
          </div>

          <Divider />

          {/* 代码块测试 */}
          <div>
            <Title level={4}>代码样式测试</Title>
            <Paragraph>
              这是内联代码：<Text code>console.log('Hello World')</Text>
            </Paragraph>
            
            <Paragraph>
              <pre style={{ 
                background: '#f6f8fa', 
                padding: '16px', 
                borderRadius: '6px',
                overflow: 'auto'
              }}>
{`function greet(name) {
  console.log('Hello, ' + name + '!');
}

greet('World');`}
              </pre>
            </Paragraph>
          </div>

          <Divider />

          {/* 混合样式测试 */}
          <div>
            <Title level={4}>混合样式测试</Title>
            <Paragraph>
              这是一个包含多种样式的段落：
              <Text strong>粗体</Text>、
              <Text italic>斜体</Text>、
              <Text underline>下划线</Text>、
              <Text type="danger">危险文本</Text>、
              <Text code>代码</Text>、
              <Link href="#" target="_blank">链接</Link>
              等多种样式的组合。
            </Paragraph>
          </div>

        </Space>
      </Card>
    </div>
  );
};

export default TypographyTest;
