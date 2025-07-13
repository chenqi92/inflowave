import React from 'react';
import { Table, Typography, Result, Tooltip, TooltipTrigger, TooltipContent, AntParagraph } from '@/components/ui';

const { Text } = Typography;

// Test component to verify fixes
const TestFixes: React.FC = () => {
  // Test data for Table
  const columns = [
    { title: 'Name', dataIndex: 'name', key: 'name' },
    { title: 'Age', dataIndex: 'age', key: 'age' },
    { title: 'Address', dataIndex: 'address', key: 'address' },
  ];

  const dataSource = [
    { key: '1', name: 'John', age: 32, address: 'New York' },
    { key: '2', name: 'Jane', age: 28, address: 'London' },
  ];

  return (
    <div className="p-6 space-y-6">
      <h1>Error Fixes Test</h1>
      
      {/* Test 1: Tooltip with TooltipProvider */}
      <div>
        <h2>1. Tooltip Test</h2>
        <Tooltip>
          <TooltipTrigger asChild>
            <button className="px-4 py-2 bg-blue-500 text-white rounded">
              Hover me
            </button>
          </TooltipTrigger>
          <TooltipContent>
            This tooltip should work without errors
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Test 2: Table with Ant Design props */}
      <div>
        <h2>2. Table Test</h2>
        <Table
          columns={columns}
          dataSource={dataSource}
          disabled={false}
          rowKey="key"
          rowClassName="test-row"
          size="small"
          bordered
        />
      </div>

      {/* Test 3: Typography with Ant Design props */}
      <div>
        <h2>3. Typography Test</h2>
        <AntParagraph wrap={true} code={false} copyable={false}>
          This paragraph should not pass invalid props to DOM
        </AntParagraph>
        <Text strong type="success">
          This text should render correctly
        </Text>
      </div>

      {/* Test 4: Result with wrap prop */}
      <div>
        <h2>4. Result Test</h2>
        <Result
          status="success"
          title="Success"
          subTitle="This result component should not pass wrap prop to DOM"
          wrap={true}
        />
      </div>
    </div>
  );
};

export default TestFixes;
