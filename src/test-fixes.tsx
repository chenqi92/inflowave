import React from 'react';
import { Table, Typography, Result, Tooltip, TooltipTrigger, TooltipContent, AntParagraph, Button } from '@/components/ui';

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
      <Typography variant="h1">Error Fixes Test</Typography>
      
      {/* Test 1: Tooltip with TooltipProvider */}
      <div>
        <Typography variant="h2">1. Tooltip Test</Typography>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button className="px-4 py-2">
              Hover me
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            This tooltip should work without errors
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Test 2: Table with Ant Design props */}
      <div>
        <Typography variant="h2">2. Table Test</Typography>
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
        <Typography variant="h2">3. Typography Test</Typography>
        <AntParagraph wrap={true} code={false} copyable={false}>
          This paragraph should not pass invalid props to DOM
        </AntParagraph>
        <Text strong type="success">
          This text should render correctly
        </Text>
      </div>

      {/* Test 4: Result with wrap prop */}
      <div>
        <Typography variant="h2">4. Result Test</Typography>
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
