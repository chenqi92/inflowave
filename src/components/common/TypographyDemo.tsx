import React from 'react';
import { Typography } from '@/components/ui';
import { Space } from '@/components/ui';


const { Text } = Typography;

const TypographyDemo: React.FC = () => {
  return (
    <div className="p-4 bg-white rounded-lg border">
      <Typography variant="h3" className="mb-4 text-lg font-semibold">Typography 样式测试</Typography>
      
      <div className="flex gap-2" direction="vertical" size="md" style={{ width: '100%' }}>
        <div>
          <Text strong>基础文本样式：</Text>
          <br />
          <div className="flex gap-2" wrap>
            <Text>普通文本</Text>
            <Text type="secondary">次要文本</Text>
            <Text type="success">成功文本</Text>
            <Text type="warning">警告文本</Text>
            <Text type="danger">危险文本</Text>
          </div>
        </div>

        <div>
          <Text strong>文本装饰：</Text>
          <br />
          <div className="flex gap-2" wrap>
            <Text strong>粗体文本</Text>
            <Text italic>斜体文本</Text>
            <Text underline>下划线文本</Text>
            <Text delete>删除线文本</Text>
            <Text code>代码文本</Text>
            <Text mark>标记文本</Text>
          </div>
        </div>

        <div>
          <Text strong>Tailwind CSS 尺寸类：</Text>
          <br />
          <div className="flex gap-2" direction="vertical">
            <Text className="text-xs">超小文本 (text-xs)</Text>
            <Text className="text-sm">小文本 (text-sm)</Text>
            <Text className="text-base">基础文本 (text-base)</Text>
            <Text className="text-lg">大文本 (text-lg) - 这里应该正常显示</Text>
            <Text className="text-xl">超大文本 (text-xl)</Text>
          </div>
        </div>

        <div>
          <Text strong>混合样式：</Text>
          <br />
          <Text>
            这是一个包含 
            <Text strong className="text-lg">粗体大文本</Text>、
            <Text type="danger" className="text-sm">小号危险文本</Text>、
            <Text code className="text-base">基础代码文本</Text> 
            的混合样式段落。
          </Text>
        </div>

        <div>
          <Text strong>嵌套 Typography：</Text>
          <br />
          <Text>
            外层文本 
            <Text type="secondary">
              次要文本 
              <Text strong className="text-lg">
                嵌套的粗体大文本
              </Text> 
              继续次要文本
            </Text> 
            外层文本结束
          </Text>
        </div>
      </div>
    </div>
  );
};

export default TypographyDemo;
