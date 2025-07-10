import React, { useState } from 'react';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Input,
  Select,
  Table,
  Tabs,
  Typography,
  Space,
  Alert,
  Tag,
  Empty,
  Spin,
  Modal,
  Form,
  FormItem,
  Row,
  Col,
  Statistic,
  message,
} from '@/components/ui';

const { Title, Text, Paragraph } = Typography;

const UITest: React.FC = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const tableColumns = [
    {
      key: 'name',
      title: 'Name',
      dataIndex: 'name',
    },
    {
      key: 'age',
      title: 'Age',
      dataIndex: 'age',
    },
    {
      key: 'email',
      title: 'Email',
      dataIndex: 'email',
    },
  ];

  const tableData = [
    { key: '1', name: 'John Doe', age: 32, email: 'john@example.com' },
    { key: '2', name: 'Jane Smith', age: 28, email: 'jane@example.com' },
    { key: '3', name: 'Bob Johnson', age: 35, email: 'bob@example.com' },
  ];

  const selectOptions = [
    { value: 'option1', label: 'Option 1' },
    { value: 'option2', label: 'Option 2' },
    { value: 'option3', label: 'Option 3' },
  ];

  const tabItems = [
    {
      key: 'tab1',
      label: 'Tab 1',
      children: <div className="p-4">Content of Tab 1</div>,
    },
    {
      key: 'tab2',
      label: 'Tab 2',
      children: <div className="p-4">Content of Tab 2</div>,
    },
    {
      key: 'tab3',
      label: 'Tab 3',
      children: <div className="p-4">Content of Tab 3</div>,
    },
  ];

  const handleFormSubmit = (values: any) => {
    console.log('Form values:', values);
    message.success('Form submitted successfully!');
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      <Title level={1}>UI Components Test</Title>
      
      {/* Buttons */}
      <Card>
        <CardHeader>
          <CardTitle>Buttons</CardTitle>
        </CardHeader>
        <CardContent>
          <Space wrap>
            <Button variant="default">Default</Button>
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
            <Button loading>Loading</Button>
            <Button disabled>Disabled</Button>
          </Space>
        </CardContent>
      </Card>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Form</CardTitle>
        </CardHeader>
        <CardContent>
          <Form onFinish={handleFormSubmit} className="max-w-md">
            <FormItem label="Name" name="name" required>
              <Input placeholder="Enter your name" />
            </FormItem>
            
            <FormItem label="Email" name="email" required>
              <Input type="email" placeholder="Enter your email" />
            </FormItem>
            
            <FormItem label="Country" name="country">
              <Select options={selectOptions} placeholder="Select country" />
            </FormItem>
            
            <FormItem>
              <Button type="submit" variant="primary">Submit</Button>
            </FormItem>
          </Form>
        </CardContent>
      </Card>

      {/* Statistics */}
      <Row gutter={[16, 16]}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Users"
              value={1234}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Active Sessions"
              value={567}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Revenue"
              value={89.3}
              precision={2}
              suffix="%"
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Loading"
              loading
            />
          </Card>
        </Col>
      </Row>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Table</CardTitle>
        </CardHeader>
        <CardContent>
          <Table
            columns={tableColumns}
            dataSource={tableData}
            bordered
          />
        </CardContent>
      </Card>

      {/* Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Tabs</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs items={tabItems} />
        </CardContent>
      </Card>

      {/* Alerts */}
      <Space direction="vertical" className="w-full">
        <Alert type="info" message="Info Alert" description="This is an info alert" showIcon />
        <Alert type="success" message="Success Alert" description="This is a success alert" showIcon />
        <Alert type="warning" message="Warning Alert" description="This is a warning alert" showIcon />
        <Alert type="error" message="Error Alert" description="This is an error alert" showIcon />
      </Space>

      {/* Tags */}
      <Card>
        <CardHeader>
          <CardTitle>Tags</CardTitle>
        </CardHeader>
        <CardContent>
          <Space wrap>
            <Tag>Default</Tag>
            <Tag color="primary">Primary</Tag>
            <Tag color="success">Success</Tag>
            <Tag color="warning">Warning</Tag>
            <Tag color="error">Error</Tag>
            <Tag color="processing">Processing</Tag>
            <Tag closable>Closable</Tag>
          </Space>
        </CardContent>
      </Card>

      {/* Modal */}
      <Card>
        <CardHeader>
          <CardTitle>Modal</CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={() => setModalOpen(true)}>Open Modal</Button>
          <Modal
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            title="Test Modal"
            footer={
              <Space>
                <Button onClick={() => setModalOpen(false)}>Cancel</Button>
                <Button variant="primary" onClick={() => setModalOpen(false)}>OK</Button>
              </Space>
            }
          >
            <p>This is a test modal content.</p>
          </Modal>
        </CardContent>
      </Card>

      {/* Messages */}
      <Card>
        <CardHeader>
          <CardTitle>Messages</CardTitle>
        </CardHeader>
        <CardContent>
          <Space>
            <Button onClick={() => message.info('This is an info message')}>Info</Button>
            <Button onClick={() => message.success('This is a success message')}>Success</Button>
            <Button onClick={() => message.warning('This is a warning message')}>Warning</Button>
            <Button onClick={() => message.error('This is an error message')}>Error</Button>
            <Button onClick={() => message.loading('Loading...', 2000)}>Loading</Button>
          </Space>
        </CardContent>
      </Card>

      {/* Empty */}
      <Card>
        <CardHeader>
          <CardTitle>Empty State</CardTitle>
        </CardHeader>
        <CardContent>
          <Empty description="No data available" />
        </CardContent>
      </Card>

      {/* Spin */}
      <Card>
        <CardHeader>
          <CardTitle>Loading Spinner</CardTitle>
        </CardHeader>
        <CardContent>
          <Space>
            <Spin size="sm" />
            <Spin size="md" />
            <Spin size="lg" />
            <Spin spinning={loading} tip="Loading...">
              <div className="p-8 bg-gray-100 rounded">
                <Button onClick={() => setLoading(!loading)}>
                  Toggle Loading
                </Button>
              </div>
            </Spin>
          </Space>
        </CardContent>
      </Card>
    </div>
  );
};

export default UITest;
