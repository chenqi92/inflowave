/**
 * InfloWave 主测试运行器
 * 整合所有测试模块，提供统一的测试入口
 */

import { runFeatureTests } from './featureTest';
import { uiInteractionTester } from './uiInteractionTest';

export interface MasterTestReport {
  testSuites: {
    featureTests: any;
    uiTests: any;
  };
  summary: {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    successRate: number;
  };
  timestamp: string;
  duration: number;
}

class MasterTestRunner {
  /**
   * 运行完整的测试套件
   */
  async runCompleteTestSuite(): Promise<MasterTestReport> {
    const startTime = Date.now();

    console.log('🚀 开始运行 InfloWave 完整测试套件...');
    console.log('='.repeat(60));

    try {
      // 运行功能测试
      console.log('\n🔧 第一阶段: 功能测试');
      console.log('-'.repeat(40));
      const featureTestResults = await runFeatureTests();

      // 运行UI交互测试
      console.log('\n🎯 第二阶段: UI交互测试');
      console.log('-'.repeat(40));
      const uiTestResults = await uiInteractionTester.runAllUITests();

      // 计算总体统计
      const featureStats = this.calculateFeatureStats(featureTestResults);
      const uiStats = {
        total: uiTestResults.totalTests,
        passed: uiTestResults.passedTests,
        failed: uiTestResults.failedTests,
      };

      const totalTests = featureStats.total + uiStats.total;
      const passedTests = featureStats.passed + uiStats.passed;
      const failedTests = featureStats.failed + uiStats.failed;
      const successRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;

      const duration = Date.now() - startTime;

      const report: MasterTestReport = {
        testSuites: {
          featureTests: featureTestResults,
          uiTests: uiTestResults,
        },
        summary: {
          totalTests,
          passedTests,
          failedTests,
          successRate,
        },
        timestamp: new Date().toISOString(),
        duration,
      };

      // 打印最终报告
      this.printFinalReport(report);

      return report;
    } catch (error) {
      console.error('❌ 测试套件运行失败:', error);
      throw error;
    }
  }

  /**
   * 计算功能测试统计
   */
  private calculateFeatureStats(featureResults: any[]): {
    total: number;
    passed: number;
    failed: number;
  } {
    let total = 0;
    let passed = 0;
    let failed = 0;

    featureResults.forEach(suite => {
      total += suite.totalTests;
      passed += suite.passedTests;
      failed += suite.failedTests;
    });

    return { total, passed, failed };
  }

  /**
   * 打印最终报告
   */
  private printFinalReport(report: MasterTestReport): void {
    console.log(`\n${'='.repeat(60)}`);
    console.log('📊 INFLOWAVE 测试报告 📊');
    console.log('='.repeat(60));

    console.log(`\n⏱️  执行时间: ${(report.duration / 1000).toFixed(2)}秒`);
    console.log(`📅 完成时间: ${new Date(report.timestamp).toLocaleString()}`);

    console.log('\n📈 总体统计:');
    console.log(`   总测试数: ${report.summary.totalTests}`);
    console.log(`   通过测试: ${report.summary.passedTests}`);
    console.log(`   失败测试: ${report.summary.failedTests}`);
    console.log(`   成功率: ${report.summary.successRate.toFixed(1)}%`);

    // 功能测试统计
    const featureStats = this.calculateFeatureStats(
      report.testSuites.featureTests
    );
    console.log('\n🔧 功能测试:');
    console.log(`   总计: ${featureStats.total}`);
    console.log(`   通过: ${featureStats.passed}`);
    console.log(`   失败: ${featureStats.failed}`);
    console.log(
      `   成功率: ${featureStats.total > 0 ? ((featureStats.passed / featureStats.total) * 100).toFixed(1) : 0}%`
    );

    // UI测试统计
    const uiStats = report.testSuites.uiTests;
    console.log('\n🎯 UI交互测试:');
    console.log(`   总计: ${uiStats.totalTests}`);
    console.log(`   通过: ${uiStats.passedTests}`);
    console.log(`   失败: ${uiStats.failedTests}`);
    console.log(
      `   成功率: ${((uiStats.passedTests / uiStats.totalTests) * 100).toFixed(1)}%`
    );

    // 详细分类统计
    console.log('\n📋 UI测试分类详情:');
    Object.entries(uiStats.categories).forEach(
      ([category, stats]: [string, any]) => {
        console.log(
          `   ${category}: ${stats.passed}/${stats.total} (${((stats.passed / stats.total) * 100).toFixed(1)}%)`
        );
      }
    );

    // 失败的测试列表
    const failedTests = uiStats.testResults.filter(
      (test: any) => !test.success
    );
    if (failedTests.length > 0) {
      console.log('\n❌ 失败的测试:');
      failedTests.forEach((test: any) => {
        console.log(`   [${test.category}] ${test.testName}: ${test.message}`);
      });
    }

    // 最终结论
    console.log(`\n${'='.repeat(60)}`);
    if (report.summary.failedTests === 0) {
      console.log('🎉 所有测试通过！InfloWave 功能正常运行！');
    } else if (report.summary.successRate >= 90) {
      console.log('✅ 测试大部分通过！应用基本功能正常！');
    } else if (report.summary.successRate >= 70) {
      console.log('⚠️  测试部分通过，需要检查失败的功能！');
    } else {
      console.log('❌ 测试失败较多，应用可能存在严重问题！');
    }
    console.log('='.repeat(60));
  }

  /**
   * 快速健康检查
   */
  async quickHealthCheck(): Promise<boolean> {
    console.log('🏥 运行快速健康检查...');

    try {
      // 检查基础DOM元素
      const hasToolbar = document.querySelector('.app-toolbar') !== null;
      const hasButtons = document.querySelectorAll('button').length > 0;
      const hasInputs = document.querySelectorAll('input').length >= 0;

      console.log(`工具栏存在: ${hasToolbar ? '✅' : '❌'}`);
      console.log(`按钮存在: ${hasButtons ? '✅' : '❌'}`);
      console.log(`输入框存在: ${hasInputs ? '✅' : '❌'}`);

      // 检查路由系统
      const currentPath = window.location.pathname;
      console.log(`当前路径: ${currentPath}`);

      // 检查React应用是否正常
      const reactRoot = document.querySelector('#root');
      const hasReactContent = reactRoot && reactRoot.children.length > 0;
      console.log(`React应用加载: ${hasReactContent ? '✅' : '❌'}`);

      const isHealthy = hasToolbar && hasButtons && hasReactContent;

      console.log(`\n总体健康状态: ${isHealthy ? '✅ 健康' : '❌ 异常'}`);

      return isHealthy || false;
    } catch (error) {
      console.error('健康检查失败:', error);
      return false;
    }
  }

  /**
   * 生成测试报告文件
   */
  async saveTestReport(report: MasterTestReport): Promise<void> {
    const reportContent = JSON.stringify(report, null, 2);

    try {
      // 如果在Tauri环境中，保存到文件
      if (typeof window !== 'undefined' && (window as any).__TAURI__) {
        // 在 Tauri 2.0 中，这些 API 已经被重组，暂时跳过文件写入
        // const { writeTextFile } = await import('@tauri-apps/api/fs');
        // const { join, appDataDir } = await import('@tauri-apps/api/path');

        // const appDataPath = await appDataDir();
        // const reportPath = await join(appDataPath, 'test-reports', `test-report-${Date.now()}.json`);

        // await writeTextFile(reportPath, reportContent);
        console.log(
          `📄 测试报告准备就绪，但因为 Tauri 2.0 API 变更，暂时无法保存到文件`
        );
      } else {
        // 使用 Tauri 原生文件保存或浏览器下载
        try {
          if (typeof window !== 'undefined' && (window as any).__TAURI__) {
            // Tauri 环境：使用原生文件保存对话框
            const { safeTauriInvoke } = await import('@/utils/tauri');
            
            const filename = `inflowave-test-report-${Date.now()}.json`;
            const dialogResult = await safeTauriInvoke<{ path?: string } | null>(
              'show_save_dialog',
              {
                defaultFilename: filename,
                filters: [{
                  name: 'JSON 文件',
                  extensions: ['json']
                }]
              }
            );

            if (dialogResult?.path) {
              await safeTauriInvoke('write_file', {
                path: dialogResult.path,
                content: reportContent
              });
              console.log('📄 测试报告已保存到:', dialogResult.path);
            } else {
              console.log('📄 用户取消了保存操作');
            }
          } else {
            // 浏览器环境，使用传统下载方法
            const blob = new Blob([reportContent], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `inflowave-test-report-${Date.now()}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            console.log('📄 测试报告已下载');
          }
        } catch (error) {
          console.error('📄 保存测试报告失败:', error);
          console.log(
            `📄 无法保存文件，请手动复制以下报告内容:\n${reportContent}`
          );
        }
      }
    } catch (error) {
      console.error('保存测试报告失败:', error);
    }
  }
}

// 导出测试运行器实例
export const masterTestRunner = new MasterTestRunner();

// 全局函数，可以在控制台调用
(window as any).runCompleteTests = () =>
  masterTestRunner.runCompleteTestSuite();
(window as any).quickHealthCheck = () => masterTestRunner.quickHealthCheck();
(window as any).masterTestRunner = masterTestRunner;
