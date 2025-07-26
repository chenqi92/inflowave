import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E 测试配置
 * 
 * 配置端到端测试环境，包括真实数据库连接测试
 */
export default defineConfig({
  testDir: './tests/e2e',
  
  /* 并行运行测试 */
  fullyParallel: true,
  
  /* 在 CI 环境中失败时不重试，本地开发时重试一次 */
  retries: process.env.CI ? 2 : 0,
  
  /* 在 CI 环境中选择较少的 worker */
  workers: process.env.CI ? 1 : undefined,
  
  /* 测试报告配置 */
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/results.xml' }]
  ],
  
  /* 全局测试配置 */
  use: {
    /* 基础 URL */
    baseURL: 'http://localhost:1420',
    
    /* 收集失败测试的追踪信息 */
    trace: 'on-first-retry',
    
    /* 截图配置 */
    screenshot: 'only-on-failure',
    
    /* 视频录制 */
    video: 'retain-on-failure',
    
    /* 忽略 HTTPS 错误 */
    ignoreHTTPSErrors: true,
    
    /* 等待超时 */
    actionTimeout: 30000,
    navigationTimeout: 30000,
  },

  /* 配置不同浏览器的测试项目 */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    /* 移动端测试 */
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },

    /* Microsoft Edge 测试 */
    {
      name: 'Microsoft Edge',
      use: { ...devices['Desktop Edge'], channel: 'msedge' },
    },

    /* Google Chrome 测试 */
    {
      name: 'Google Chrome',
      use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    },
  ],

  /* 启动本地开发服务器 */
  webServer: {
    command: 'npm run tauri dev',
    url: 'http://localhost:1420',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000, // 2 分钟启动超时
  },

  /* 测试输出目录 */
  outputDir: 'test-results/',
  
  /* 全局设置 */
  globalSetup: './tests/global-setup.ts',
  globalTeardown: './tests/global-teardown.ts',
  
  /* 测试超时 */
  timeout: 60 * 1000, // 1 分钟
  
  /* 期望超时 */
  expect: {
    timeout: 10 * 1000, // 10 秒
  },
});
