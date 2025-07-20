/**
 * InputNumber 组件使用示例
 * 展示新的单位集成功能和不同布局方式
 */

import React, { useState } from 'react';
import { InputNumber } from '../InputNumber';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../card';

export const InputNumberExample: React.FC = () => {
  const [value1, setValue1] = useState<number | null>(100);
  const [value2, setValue2] = useState<number | null>(30);
  const [value3, setValue3] = useState<number | null>(5000);
  const [value4, setValue4] = useState<number | null>(1024);

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>动态跟随单位模式（推荐）</CardTitle>
          <CardDescription>
            单位紧跟在数字后面，增减按钮在最右侧，布局更自然
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 超时设置 - 毫秒 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">连接超时</label>
            <InputNumber
              value={value1}
              onChange={setValue1}
              unit="ms"
              min={0}
              max={60000}
              step={100}
              placeholder="请输入超时时间"
              className="w-48"
            />
          </div>

          {/* 刷新间隔 - 秒 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">自动刷新间隔</label>
            <InputNumber
              value={value2}
              onChange={setValue2}
              unit="秒"
              min={1}
              max={3600}
              step={1}
              placeholder="请输入刷新间隔"
              className="w-48"
            />
          </div>

          {/* 端口号 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">服务端口</label>
            <InputNumber
              value={value3}
              onChange={setValue3}
              min={1}
              max={65535}
              step={1}
              placeholder="请输入端口号"
              className="w-48"
            />
          </div>

          {/* 内存大小 - MB */}
          <div className="space-y-2">
            <label className="text-sm font-medium">内存限制</label>
            <InputNumber
              value={value4}
              onChange={setValue4}
              unit="MB"
              min={128}
              max={8192}
              step={128}
              placeholder="请输入内存大小"
              className="w-48"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>addonAfter 用法（现在也是动态跟随）</CardTitle>
          <CardDescription>
            使用 addonAfter 属性的单位也会紧跟数字显示，不再有独立框
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 使用 addonAfter 的传统方式 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">连接超时（传统方式）</label>
            <InputNumber
              value={value1}
              onChange={setValue1}
              addonAfter="ms"
              min={0}
              max={60000}
              step={100}
              placeholder="请输入超时时间"
              className="w-48"
            />
          </div>

          {/* 使用 unit + addon 模式 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">内存限制（addonAfter内联）</label>
            <InputNumber
              value={value4}
              onChange={setValue4}
              addonAfter="MB"
              min={128}
              max={8192}
              step={128}
              placeholder="请输入内存大小"
              className="w-48"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>不同尺寸和配置</CardTitle>
          <CardDescription>
            展示不同大小和配置选项
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 小尺寸 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">小尺寸</label>
            <InputNumber
              defaultValue={30}
              unit="s"
              size="sm"
              min={0}
              max={300}
              step={5}
              className="w-32"
            />
          </div>

          {/* 大尺寸 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">大尺寸</label>
            <InputNumber
              defaultValue={1000}
              unit="MB"
              size="lg"
              min={0}
              max={10000}
              step={100}
              className="w-64"
            />
          </div>

          {/* 禁用控制按钮 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">无控制按钮</label>
            <InputNumber
              defaultValue={8080}
              controls={false}
              min={1}
              max={65535}
              placeholder="端口号"
              className="w-48"
            />
          </div>

          {/* 高精度小数 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">高精度</label>
            <InputNumber
              defaultValue={3.14159}
              unit="π"
              precision={5}
              step={0.00001}
              className="w-48"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>当前值状态</CardTitle>
          <CardDescription>
            实时显示各个输入框的值
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p>连接超时: <code>{value1}</code> ms</p>
            <p>刷新间隔: <code>{value2}</code> 秒</p>
            <p>服务端口: <code>{value3}</code></p>
            <p>内存限制: <code>{value4}</code> MB</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InputNumberExample;