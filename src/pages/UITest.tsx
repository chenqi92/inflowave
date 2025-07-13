import React, { useState } from 'react';
import { Button, Input, Select, Table, Tabs, TabsContent, TabsList, TabsTrigger, Alert, AlertTitle, AlertDescription, Tag, Empty, Spin, Form, Title, Text, Paragraph, Statistic, Row, Col } from '@/components/ui';
import { Card, CardHeader, CardTitle, CardContent, toast, Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui';

const UITest: React.FC = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const tableColumns = [
    {
      key: 'name',
      title: 'Name',
      dataIndex: 'name'},
    {
      key: 'age',
      title: 'Age',
      dataIndex: 'age'},
    {
      key: 'email',
      title: 'Email',
      dataIndex: 'email'},
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

  const handleFormSubmit = (values: any) => {
    console.log('Form values:', values);
    toast({ title: "成功", description: "Form submitted successfully!" });
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
          <div className="flex flex-wrap gap-2">
            <Button variant="default">Default</Button>
            <Button variant="default">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Danger</Button>
            <Button disabled>Loading</Button>
            <Button disabled>Disabled</Button>
          </div>
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
          <Tabs defaultValue="tab1">
            <TabsList>
              <TabsTrigger value="tab1">Tab 1</TabsTrigger>
              <TabsTrigger value="tab2">Tab 2</TabsTrigger>
              <TabsTrigger value="tab3">Tab 3</TabsTrigger>
            </TabsList>
            <TabsContent value="tab1" className="p-4">Content of Tab 1</TabsContent>
            <TabsContent value="tab2" className="p-4">Content of Tab 2</TabsContent>
            <TabsContent value="tab3" className="p-4">Content of Tab 3</TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Alerts */}
      <div className="space-y-4">
        <Alert>
          <AlertTitle>Info Alert</AlertTitle>
          <AlertDescription>This is an info alert</AlertDescription>
        </Alert>
        <Alert>
          <AlertTitle>Success Alert</AlertTitle>
          <AlertDescription>This is a success alert</AlertDescription>
        </Alert>
        <Alert variant="destructive">
          <AlertTitle>Warning Alert</AlertTitle>
          <AlertDescription>This is a warning alert</AlertDescription>
        </Alert>
        <Alert variant="destructive">
          <AlertTitle>Error Alert</AlertTitle>
          <AlertDescription>This is an error alert</AlertDescription>
        </Alert>
      </div>

      {/* Tags */}
      <Card>
        <CardHeader>
          <CardTitle>Tags</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Tag>Default</Tag>
            <Tag variant="secondary">Primary</Tag>
            <Tag variant="success">Success</Tag>
            <Tag variant="warning">Warning</Tag>
            <Tag variant="destructive">Error</Tag>
            <Tag variant="processing">Processing</Tag>
            <Tag closable>Closable</Tag>
          </div>
        </CardContent>
      </Card>

      {/* Modal */}
      <Card>
        <CardHeader>
          <CardTitle>Modal</CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={() => setModalOpen(true)}>Open Modal</Button>
          <Dialog open={modalOpen} onOpenChange={setModalOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Test Modal</DialogTitle>
              </DialogHeader>
              <p>This is a test modal content.</p>
              <div className="flex gap-2 justify-end mt-4">
                <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
                <Button onClick={() => setModalOpen(false)}>OK</Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      {/* Messages */}
      <Card>
        <CardHeader>
          <CardTitle>Messages</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button onClick={() => toast({ title: "信息", description: "This is an info message" })}>Info</Button>
            <Button onClick={() => toast({ title: "成功", description: "This is a success message" })}>Success</Button>
            <Button onClick={() => toast({ title: "警告", description: "This is a warning message" })}>Warning</Button>
            <Button onClick={() => toast({ title: "错误", description: "This is an error message", variant: "destructive" })}>Error</Button>
            <Button onClick={() => toast({ title: "加载中", description: "Loading..." })}>Loading</Button>
          </div>
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
          <div className="flex gap-4 items-center">
            <Spin size="small" />
            <Spin size="default" />
            <Spin size="large" />
            <Spin spinning={loading} tip="Loading...">
              <div className="p-8 bg-gray-100 rounded">
                <Button onClick={() => setLoading(!loading)}>
                  Toggle Loading
                </Button>
              </div>
            </Spin>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UITest;
