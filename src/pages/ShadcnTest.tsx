import React, { useState } from 'react';
import { Button, Input, Card, CardHeader, CardTitle, CardContent, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Avatar, AvatarFallback, AvatarImage, Badge, Checkbox, Switch, Slider, Textarea, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, toast, Toaster } from '@/components/ui';

const ShadcnTest: React.FC = () => {
  const [inputValue, setInputValue] = useState('');
  const [checked, setChecked] = useState(false);
  const [switchValue, setSwitchValue] = useState(false);
  const [sliderValue, setSliderValue] = useState([50]);
  const [selectValue, setSelectValue] = useState('');

  const showToast = () => {
    toast({
      title: "测试通知",
      description: "这是一个Shadcn/ui的Toast通知"});
  };

  const tableData = [
    { id: 1, name: "张三", email: "zhangsan@example.com", role: "管理员" },
    { id: 2, name: "李四", email: "lisi@example.com", role: "用户" },
    { id: 3, name: "王五", email: "wangwu@example.com", role: "编辑" },
  ];

  return (
    <div className="p-6 space-y-6 bg-background min-h-screen">
      <Toaster />
      
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Shadcn/ui 组件测试</h1>

        {/* 按钮测试 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>按钮组件</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <Button variant="default">默认按钮</Button>
              <Button variant="secondary">次要按钮</Button>
              <Button variant="destructive">危险按钮</Button>
              <Button variant="outline">轮廓按钮</Button>
              <Button variant="ghost">幽灵按钮</Button>
              <Button variant="link">链接按钮</Button>
              <Button size="sm">小按钮</Button>
              <Button size="lg">大按钮</Button>
              <Button disabled>禁用按钮</Button>
            </div>
          </CardContent>
        </Card>

        {/* 输入组件测试 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>输入组件</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">普通输入框</label>
                <Input
                  placeholder="请输入内容"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">文本域</label>
                <Textarea placeholder="请输入多行文本" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">选择器</label>
                <Select value={selectValue} onValueChange={setSelectValue}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="请选择选项" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="option1">选项1</SelectItem>
                    <SelectItem value="option2">选项2</SelectItem>
                    <SelectItem value="option3">选项3</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 表格测试 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>表格组件</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>姓名</TableHead>
                  <TableHead>邮箱</TableHead>
                  <TableHead>角色</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tableData.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.id}</TableCell>
                    <TableCell>{row.name}</TableCell>
                    <TableCell>{row.email}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{row.role}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* 其他组件测试 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>其他组件</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* 头像 */}
              <div>
                <h3 className="text-lg font-medium mb-2">头像</h3>
                <div className="flex gap-4">
                  <Avatar>
                    <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
                    <AvatarFallback>CN</AvatarFallback>
                  </Avatar>
                  <Avatar>
                    <AvatarFallback>AB</AvatarFallback>
                  </Avatar>
                </div>
              </div>

              {/* 复选框和开关 */}
              <div>
                <h3 className="text-lg font-medium mb-2">复选框和开关</h3>
                <div className="flex gap-6">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="terms"
                      checked={checked}
                      onCheckedChange={setChecked}
                    />
                    <label htmlFor="terms">同意条款</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={switchValue}
                      onCheckedChange={setSwitchValue}
                    />
                    <label>启用功能</label>
                  </div>
                </div>
              </div>

              {/* 滑块 */}
              <div>
                <h3 className="text-lg font-medium mb-2">滑块</h3>
                <Slider
                  value={sliderValue}
                  onValueChange={setSliderValue}
                  max={100}
                  step={1}
                  className="w-[200px]"
                />
                <p className="text-sm text-muted-foreground mt-2">
                  当前值: {sliderValue[0]}
                </p>
              </div>

              {/* 对话框和通知 */}
              <div>
                <h3 className="text-lg font-medium mb-2">对话框和通知</h3>
                <div className="flex gap-4">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline">打开对话框</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>测试对话框</DialogTitle>
                        <DialogDescription>
                          这是一个Shadcn/ui的对话框组件示例。
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter>
                        <Button variant="outline">取消</Button>
                        <Button>确认</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  <Button onClick={showToast}>显示通知</Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ShadcnTest;
