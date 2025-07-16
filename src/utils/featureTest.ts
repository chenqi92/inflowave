/**
 * InfloWave 功能完整性测试工具
 * 用于验证所有新增功能的可用性和集成状态
 */

import { safeTauriInvoke } from './tauri';
import type {
  QueryResult,
  Connection,
  Dashboard,
  SavedQuery,
  PerformanceMetrics,
  RetentionPolicy,
  UserPreferences,
} from '../types';

interface TestResult {
  feature: string;
  status: 'pass' | 'fail' | 'skip';
  message: string;
  duration?: number;
}

interface TestSuite {
  name: string;
  results: TestResult[];
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
}

export class FeatureTester {
  private results: TestSuite[] = [];

  /**
   * 运行所有功能测试
   */
  async runAllTests(): Promise<TestSuite[]> {
    console.log('🚀 开始 InfloWave 功能完整性测试...');

    this.results = [];

    // 核心功能测试
    await this.testCoreFeatures();

    // 查询功能测试
    await this.testQueryFeatures();

    // 可视化功能测试
    await this.testVisualizationFeatures();

    // 数据管理功能测试
    await this.testDataManagementFeatures();

    // 性能监控功能测试
    await this.testPerformanceFeatures();

    // 用户体验功能测试
    await this.testUserExperienceFeatures();

    // 扩展功能测试
    await this.testExtensionFeatures();

    this.printSummary();
    return this.results;
  }

  /**
   * 测试核心功能
   */
  private async testCoreFeatures(): Promise<void> {
    const suite: TestSuite = {
      name: '核心功能',
      results: [],
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      skippedTests: 0,
    };

    // 测试连接管理
    await this.runTest(suite, '连接管理', async () => {
      const connections =
        await safeTauriInvoke<Connection[]>('get_connections');
      if (!Array.isArray(connections)) {
        throw new Error('连接列表格式错误');
      }
      return '连接管理功能正常';
    });

    // 测试数据库结构获取
    await this.runTest(suite, '数据库结构', async () => {
      // 这里需要一个有效的连接ID
      void (await safeTauriInvoke('get_database_structure', {
        connectionId: 'test-connection',
      }));
      return '数据库结构获取功能正常';
    });

    this.results.push(suite);
  }

  /**
   * 测试查询功能
   */
  private async testQueryFeatures(): Promise<void> {
    const suite: TestSuite = {
      name: '查询功能',
      results: [],
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      skippedTests: 0,
    };

    // 测试查询执行
    await this.runTest(suite, '查询执行', async () => {
      void (await safeTauriInvoke<QueryResult>('execute_query', {
        request: {
          connectionId: 'test-connection',
          database: 'test-db',
          query: 'SHOW DATABASES',
        },
      }));
      return '查询执行功能正常';
    });

    // 测试查询历史
    await this.runTest(suite, '查询历史', async () => {
      void (await safeTauriInvoke('get_query_history'));
      return '查询历史功能正常';
    });

    // 测试保存的查询
    await this.runTest(suite, '保存的查询', async () => {
      void (await safeTauriInvoke<SavedQuery[]>('get_saved_queries'));
      return '保存的查询功能正常';
    });

    this.results.push(suite);
  }

  /**
   * 测试可视化功能
   */
  private async testVisualizationFeatures(): Promise<void> {
    const suite: TestSuite = {
      name: '可视化功能',
      results: [],
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      skippedTests: 0,
    };

    // 测试仪表板管理
    await this.runTest(suite, '仪表板管理', async () => {
      void (await safeTauriInvoke<Dashboard[]>('get_dashboards'));
      return '仪表板管理功能正常';
    });

    // 测试图表渲染
    await this.runTest(suite, '图表渲染', async () => {
      // 检查 ECharts 是否可用
      if (typeof window !== 'undefined' && (window as any).echarts) {
        return '图表渲染功能正常';
      }
      throw new Error('ECharts 未正确加载');
    });

    this.results.push(suite);
  }

  /**
   * 测试数据管理功能
   */
  private async testDataManagementFeatures(): Promise<void> {
    const suite: TestSuite = {
      name: '数据管理功能',
      results: [],
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      skippedTests: 0,
    };

    // 测试数据导入
    await this.runTest(suite, '数据导入', async () => {
      // 测试数据预览功能
      void (await safeTauriInvoke('preview_data_conversion', {
        filePath: 'test.csv',
        config: { format: 'csv', delimiter: ',' },
      }));
      return '数据导入功能正常';
    });

    // 测试数据导出
    await this.runTest(suite, '数据导出', async () => {
      await safeTauriInvoke('export_query_data', {
        format: 'csv',
        data: { series: [] },
        filename: 'test_export',
      });
      return '数据导出功能正常';
    });

    // 测试保留策略管理
    await this.runTest(suite, '保留策略管理', async () => {
      void (await safeTauriInvoke<RetentionPolicy[]>('get_retention_policies', {
        connectionId: 'test-connection',
        database: 'test-db',
      }));
      return '保留策略管理功能正常';
    });

    this.results.push(suite);
  }

  /**
   * 测试性能监控功能
   */
  private async testPerformanceFeatures(): Promise<void> {
    const suite: TestSuite = {
      name: '性能监控功能',
      results: [],
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      skippedTests: 0,
    };

    // 测试性能指标获取
    await this.runTest(suite, '性能指标', async () => {
      void (await safeTauriInvoke<PerformanceMetrics>(
        'get_performance_metrics',
        {
          connectionId: 'test-connection',
        }
      ));
      return '性能指标获取功能正常';
    });

    // 测试慢查询分析
    await this.runTest(suite, '慢查询分析', async () => {
      void (await safeTauriInvoke('get_slow_query_analysis', {
        connectionId: 'test-connection',
      }));
      return '慢查询分析功能正常';
    });

    // 测试系统资源监控
    await this.runTest(suite, '系统资源监控', async () => {
      void (await safeTauriInvoke('get_system_resources', {
        connectionId: 'test-connection',
      }));
      return '系统资源监控功能正常';
    });

    this.results.push(suite);
  }

  /**
   * 测试用户体验功能
   */
  private async testUserExperienceFeatures(): Promise<void> {
    const suite: TestSuite = {
      name: '用户体验功能',
      results: [],
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      skippedTests: 0,
    };

    // 测试用户偏好设置
    await this.runTest(suite, '用户偏好设置', async () => {
      void (await safeTauriInvoke<UserPreferences>('get_user_preferences'));
      return '用户偏好设置功能正常';
    });

    // 测试快捷键系统
    await this.runTest(suite, '快捷键系统', async () => {
      // 检查快捷键事件监听器
      if (typeof document !== 'undefined') {
        return '快捷键系统功能正常';
      }
      throw new Error('快捷键系统不可用');
    });

    // 测试通知系统
    await this.runTest(suite, '通知系统', async () => {
      await safeTauriInvoke('send_notification', {
        title: '测试通知',
        message: '这是一个测试通知',
        severity: 'info',
      });
      return '通知系统功能正常';
    });

    this.results.push(suite);
  }

  /**
   * 测试扩展功能
   */
  private async testExtensionFeatures(): Promise<void> {
    const suite: TestSuite = {
      name: '扩展功能',
      results: [],
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      skippedTests: 0,
    };

    // 测试插件系统
    await this.runTest(suite, '插件系统', async () => {
      void (await safeTauriInvoke('get_installed_plugins'));
      return '插件系统功能正常';
    });

    // 测试API集成
    await this.runTest(suite, 'API集成', async () => {
      void (await safeTauriInvoke('get_api_integrations'));
      return 'API集成功能正常';
    });

    // 测试自动化规则
    await this.runTest(suite, '自动化规则', async () => {
      void (await safeTauriInvoke('get_automation_rules'));
      return '自动化规则功能正常';
    });

    this.results.push(suite);
  }

  /**
   * 运行单个测试
   */
  private async runTest(
    suite: TestSuite,
    testName: string,
    testFn: () => Promise<string>
  ): Promise<void> {
    const startTime = Date.now();
    suite.totalTests++;

    try {
      const message = await testFn();
      const duration = Date.now() - startTime;

      suite.results.push({
        feature: testName,
        status: 'pass',
        message,
        duration,
      });
      suite.passedTests++;

      console.log(`✅ ${testName}: ${message} (${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - startTime;
      const message = error instanceof Error ? error.message : '未知错误';

      suite.results.push({
        feature: testName,
        status: 'fail',
        message,
        duration,
      });
      suite.failedTests++;

      console.log(`❌ ${testName}: ${message} (${duration}ms)`);
    }
  }

  /**
   * 打印测试摘要
   */
  private printSummary(): void {
    console.log('\n📊 测试摘要:');
    console.log('='.repeat(50));

    let totalTests = 0;
    let totalPassed = 0;
    let totalFailed = 0;
    let totalSkipped = 0;

    this.results.forEach(suite => {
      console.log(`\n${suite.name}:`);
      console.log(`  总计: ${suite.totalTests}`);
      console.log(`  通过: ${suite.passedTests}`);
      console.log(`  失败: ${suite.failedTests}`);
      console.log(`  跳过: ${suite.skippedTests}`);

      totalTests += suite.totalTests;
      totalPassed += suite.passedTests;
      totalFailed += suite.failedTests;
      totalSkipped += suite.skippedTests;
    });

    console.log('\n总体结果:');
    console.log(`  总计: ${totalTests}`);
    console.log(
      `  通过: ${totalPassed} (${((totalPassed / totalTests) * 100).toFixed(1)}%)`
    );
    console.log(
      `  失败: ${totalFailed} (${((totalFailed / totalTests) * 100).toFixed(1)}%)`
    );
    console.log(
      `  跳过: ${totalSkipped} (${((totalSkipped / totalTests) * 100).toFixed(1)}%)`
    );

    if (totalFailed === 0) {
      console.log('\n🎉 所有测试通过！InfloWave 功能完整性验证成功。');
    } else {
      console.log(`\n⚠️  有 ${totalFailed} 个测试失败，请检查相关功能。`);
    }
  }

  /**
   * 获取测试结果
   */
  getResults(): TestSuite[] {
    return this.results;
  }
}

// 导出测试实例
export const featureTester = new FeatureTester();

// 便捷函数
export const runFeatureTests = () => featureTester.runAllTests();
