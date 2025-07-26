# 测试框架使用指南

## 🎯 概述

本项目已配置完整的测试框架，包括：
- **单元测试**: Vitest + React Testing Library
- **E2E测试**: Playwright
- **真实数据库集成测试**: 基于 192.168.0.120 的测试环境
- **性能测试**: 响应时间和内存使用监控

## 📋 测试命令

### 单元测试
```bash
# 运行单元测试
npm test

# 运行测试并生成覆盖率报告
npm run test:coverage

# 运行测试 UI 界面
npm run test:ui
```

### E2E 测试
```bash
# 运行所有 E2E 测试
npm run test:e2e

# 运行 E2E 测试 UI 界面
npm run test:e2e:ui

# 调试模式运行 E2E 测试
npm run test:e2e:debug

# 有头模式运行 E2E 测试（显示浏览器）
npm run test:e2e:headed

# 运行数据库集成测试
npm run test:integration

# 运行性能测试
npm run test:performance

# 运行所有测试
npm run test:all
```

## 🏷️ 测试标识符 (data-testid) 规范

为了确保测试的稳定性，所有可测试的 UI 元素都应该添加 `data-testid` 属性。

### 主要布局元素
```tsx
// 应用主要结构
<div data-testid="app-loaded">          // 应用加载完成标识
<div data-testid="main-layout">         // 主布局
<div data-testid="sidebar">             // 侧边栏
<div data-testid="main-content">        // 主内容区
<div data-testid="mobile-layout">       // 移动端布局
```

### 导航元素
```tsx
// 导航按钮
<button data-testid="nav-home">         // 首页导航
<button data-testid="nav-multi-database"> // 多数据库工作台
<button data-testid="nav-iotdb-test">   // IoTDB 测试页面
<button data-testid="nav-query">        // 查询页面
<button data-testid="nav-visualization"> // 可视化页面

// 侧边栏控制
<button data-testid="sidebar-toggle">   // 侧边栏折叠按钮
<button data-testid="mobile-menu-btn">  // 移动端菜单按钮
```

### 页面容器
```tsx
// 页面主容器
<div data-testid="home-page">           // 首页
<div data-testid="multi-database-page"> // 多数据库页面
<div data-testid="iotdb-test-page">     // IoTDB 测试页面
<div data-testid="query-page">          // 查询页面
<div data-testid="visualization-page">  // 可视化页面
```

### 连接管理
```tsx
// 连接管理
<button data-testid="connection-manager-btn">     // 连接管理按钮
<div data-testid="connection-manager-dialog">     // 连接管理对话框
<div data-testid="connection-list">               // 连接列表
<button data-testid="add-connection-btn">         // 添加连接按钮
<div data-testid="connection-form">               // 连接表单
<div data-testid="connection-{id}">               // 特定连接项

// 连接表单字段
<input data-testid="connection-name">             // 连接名称
<select data-testid="db-type">                    // 数据库类型
<input data-testid="host">                        // 主机地址
<input data-testid="port">                        // 端口
<input data-testid="username">                    // 用户名
<input data-testid="password">                    // 密码
<input data-testid="database">                    // 数据库名
<input data-testid="token">                       // Token
<input data-testid="org">                         // 组织
<input data-testid="bucket">                      // 存储桶

// 连接操作
<button data-testid="test-connection-btn">        // 测试连接
<button data-testid="save-connection-btn">        // 保存连接
<button data-testid="edit-connection-btn">        // 编辑连接
<button data-testid="delete-connection-btn">      // 删除连接
<div data-testid="connection-result">             // 连接测试结果
```

### 查询功能
```tsx
// 查询编辑器
<div data-testid="query-editor">                  // 查询编辑器
<button data-testid="execute-query-btn">          // 执行查询
<button data-testid="save-query-btn">             // 保存查询
<button data-testid="clear-query-btn">            // 清空查询
<button data-testid="example-query-btn">          // 示例查询

// 查询结果
<div data-testid="query-result-area">             // 查询结果区域
<div data-testid="query-result">                  // 查询结果
<div data-testid="query-error">                   // 查询错误
<table data-testid="result-table">                // 结果表格
<div data-testid="result-tab">                    // 结果标签页
<div data-testid="history-tab">                   // 历史标签页
```

### 数据源浏览
```tsx
// 数据源树
<div data-testid="data-source-tree">              // 数据源树
<div data-testid="active-connection">             // 当前活动连接
<div data-testid="database-node">                 // 数据库节点
<div data-testid="measurement-node">              // 测量值节点
<div data-testid="field-node">                    // 字段节点
<div data-testid="storage-group-node">            // 存储组节点
<div data-testid="device-node">                   // 设备节点
```

### 可视化功能
```tsx
// 图表管理
<div data-testid="chart-container">               // 图表容器
<button data-testid="create-chart-btn">           // 创建图表
<div data-testid="create-chart-dialog">           // 创建图表对话框
<input data-testid="chart-title">                 // 图表标题
<select data-testid="chart-type">                 // 图表类型
<textarea data-testid="chart-query">              // 图表查询
```

### 设置功能
```tsx
// 设置对话框
<button data-testid="settings-btn">               // 设置按钮
<div data-testid="settings-dialog">               // 设置对话框
<div data-testid="general-settings-tab">          // 通用设置标签页
<div data-testid="query-settings-tab">            // 查询设置标签页
<button data-testid="theme-toggle">               // 主题切换
<input data-testid="query-timeout">               // 查询超时设置
```

### 通用元素
```tsx
// 通用按钮和控件
<button data-testid="close-btn">                  // 关闭按钮
<button data-testid="cancel-btn">                 // 取消按钮
<button data-testid="confirm-btn">                // 确认按钮
<button data-testid="refresh-btn">                // 刷新按钮

// 错误和状态
<div data-testid="loading-spinner">               // 加载指示器
<div data-testid="error-message">                 // 错误消息
<div data-testid="success-message">               // 成功消息
<div data-testid="network-error">                 // 网络错误
```

## 🗄️ 测试数据库配置

测试使用真实的数据库实例，配置如下：

### InfluxDB 1.8
- **地址**: 192.168.0.120:8086
- **用户名**: admin
- **密码**: abc9987
- **数据库**: allbs

### InfluxDB 2.7
- **地址**: 192.168.0.120:8087
- **用户名**: admin
- **密码**: 6;A]]Hs/GdG4:1Ti
- **组织**: my-org
- **存储桶**: allbs
- **Token**: [)^1qm*]Fm+[?|~3}-|2rSt~u/6*6^3q{Z%gru]kQ-9TH

### IoTDB
- **地址**: 192.168.0.120:6667
- **用户名**: root
- **密码**: abc9877

## 📊 性能基准

测试框架包含以下性能基准：

### 连接性能
- **连接建立时间**: < 1000ms
- **连接测试超时**: 5000ms

### 查询性能
- **简单查询**: < 2000ms
- **复杂查询**: < 10000ms
- **大数据量查询**: < 30000ms

### UI 性能
- **页面导航**: < 1000ms
- **对话框打开**: < 500ms
- **表单输入响应**: < 100ms

## 🔧 添加新测试

### 1. 添加 data-testid 属性
```tsx
// 在组件中添加测试标识符
<button 
  data-testid="my-new-button"
  onClick={handleClick}
>
  点击我
</button>
```

### 2. 编写单元测试
```typescript
// src/components/__tests__/MyComponent.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import MyComponent from '../MyComponent';

test('应该正确渲染按钮', () => {
  render(<MyComponent />);
  
  const button = screen.getByTestId('my-new-button');
  expect(button).toBeInTheDocument();
  
  fireEvent.click(button);
  // 验证点击行为
});
```

### 3. 编写 E2E 测试
```typescript
// tests/e2e/my-feature.spec.ts
import { test, expect } from '@playwright/test';

test('应该能够使用新功能', async ({ page }) => {
  await page.goto('/');
  
  const button = page.locator('[data-testid="my-new-button"]');
  await expect(button).toBeVisible();
  
  await button.click();
  // 验证功能行为
});
```

## 🚀 最佳实践

1. **始终使用 data-testid**: 不要依赖类名或文本内容进行测试
2. **描述性命名**: 使用清晰、描述性的测试标识符
3. **独立测试**: 每个测试应该独立运行，不依赖其他测试
4. **真实数据**: 集成测试使用真实数据库，确保测试的有效性
5. **性能监控**: 定期运行性能测试，确保应用性能不退化
6. **错误处理**: 测试各种错误场景和边界情况

## 📈 测试报告

测试完成后，报告将生成在以下位置：
- **单元测试覆盖率**: `coverage/index.html`
- **E2E 测试报告**: `playwright-report/index.html`
- **测试结果**: `test-results/`

通过这个完整的测试框架，我们可以确保 InfloWave 应用的质量和稳定性！
