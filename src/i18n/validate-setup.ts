/**
 * 国际化设置验证脚本
 * 验证所有依赖和配置是否正确安装
 */

// 验证依赖包是否正确安装
const validateDependencies = () => {
  const results: { name: string; status: 'success' | 'error'; message: string }[] = [];

  try {
    // 验证 react-i18next
    require.resolve('react-i18next');
    results.push({
      name: 'react-i18next',
      status: 'success',
      message: 'Successfully installed and accessible'
    });
  } catch (error) {
    results.push({
      name: 'react-i18next',
      status: 'error',
      message: `Failed to resolve: ${error}`
    });
  }

  try {
    // 验证 i18next
    require.resolve('i18next');
    results.push({
      name: 'i18next',
      status: 'success',
      message: 'Successfully installed and accessible'
    });
  } catch (error) {
    results.push({
      name: 'i18next',
      status: 'error',
      message: `Failed to resolve: ${error}`
    });
  }

  try {
    // 验证 i18next-browser-languagedetector
    require.resolve('i18next-browser-languagedetector');
    results.push({
      name: 'i18next-browser-languagedetector',
      status: 'success',
      message: 'Successfully installed and accessible'
    });
  } catch (error) {
    results.push({
      name: 'i18next-browser-languagedetector',
      status: 'error',
      message: `Failed to resolve: ${error}`
    });
  }

  try {
    // 验证 date-fns
    require.resolve('date-fns');
    results.push({
      name: 'date-fns',
      status: 'success',
      message: 'Successfully installed and accessible'
    });
  } catch (error) {
    results.push({
      name: 'date-fns',
      status: 'error',
      message: `Failed to resolve: ${error}`
    });
  }

  return results;
};

// 验证配置文件
const validateConfiguration = () => {
  const results: { name: string; status: 'success' | 'error'; message: string }[] = [];

  try {
    // 验证 i18n 配置
    const config = require('./config');
    results.push({
      name: 'i18n config',
      status: 'success',
      message: 'Configuration file loaded successfully'
    });

    // 验证支持的语言
    if (config.SUPPORTED_LANGUAGES && config.SUPPORTED_LANGUAGES.length > 0) {
      results.push({
        name: 'supported languages',
        status: 'success',
        message: `Found ${config.SUPPORTED_LANGUAGES.length} supported languages: ${config.SUPPORTED_LANGUAGES.join(', ')}`
      });
    } else {
      results.push({
        name: 'supported languages',
        status: 'error',
        message: 'No supported languages found in configuration'
      });
    }
  } catch (error) {
    results.push({
      name: 'i18n config',
      status: 'error',
      message: `Failed to load configuration: ${error}`
    });
  }

  try {
    // 验证类型定义
    const types = require('./types');
    results.push({
      name: 'type definitions',
      status: 'success',
      message: 'Type definitions loaded successfully'
    });
  } catch (error) {
    results.push({
      name: 'type definitions',
      status: 'error',
      message: `Failed to load type definitions: ${error}`
    });
  }

  return results;
};

// 验证语言资源文件
const validateLanguageResources = async () => {
  const results: { name: string; status: 'success' | 'error'; message: string }[] = [];

  try {
    // 验证中文资源文件
    const zhResponse = await fetch('/locales/zh-CN/common.json');
    if (zhResponse.ok) {
      const zhData = await zhResponse.json();
      results.push({
        name: 'zh-CN resources',
        status: 'success',
        message: `Chinese resources loaded with ${Object.keys(zhData).length} keys`
      });
    } else {
      results.push({
        name: 'zh-CN resources',
        status: 'error',
        message: `Failed to load Chinese resources: ${zhResponse.status}`
      });
    }
  } catch (error) {
    results.push({
      name: 'zh-CN resources',
      status: 'error',
      message: `Error loading Chinese resources: ${error}`
    });
  }

  try {
    // 验证英文资源文件
    const enResponse = await fetch('/locales/en-US/common.json');
    if (enResponse.ok) {
      const enData = await enResponse.json();
      results.push({
        name: 'en-US resources',
        status: 'success',
        message: `English resources loaded with ${Object.keys(enData).length} keys`
      });
    } else {
      results.push({
        name: 'en-US resources',
        status: 'error',
        message: `Failed to load English resources: ${enResponse.status}`
      });
    }
  } catch (error) {
    results.push({
      name: 'en-US resources',
      status: 'error',
      message: `Error loading English resources: ${error}`
    });
  }

  return results;
};

// 主验证函数
export const validateI18nSetup = async () => {
  console.log('🔍 Validating i18n setup...\n');

  // 验证依赖
  console.log('📦 Checking dependencies...');
  const dependencyResults = validateDependencies();
  dependencyResults.forEach(result => {
    const icon = result.status === 'success' ? '✅' : '❌';
    console.log(`${icon} ${result.name}: ${result.message}`);
  });

  // 验证配置
  console.log('\n⚙️ Checking configuration...');
  const configResults = validateConfiguration();
  configResults.forEach(result => {
    const icon = result.status === 'success' ? '✅' : '❌';
    console.log(`${icon} ${result.name}: ${result.message}`);
  });

  // 验证语言资源（仅在浏览器环境）
  if (typeof window !== 'undefined') {
    console.log('\n🌐 Checking language resources...');
    const resourceResults = await validateLanguageResources();
    resourceResults.forEach(result => {
      const icon = result.status === 'success' ? '✅' : '❌';
      console.log(`${icon} ${result.name}: ${result.message}`);
    });
  }

  // 汇总结果
  const allResults = [
    ...dependencyResults,
    ...configResults,
    ...(typeof window !== 'undefined' ? await validateLanguageResources() : [])
  ];

  const successCount = allResults.filter(r => r.status === 'success').length;
  const totalCount = allResults.length;

  console.log(`\n📊 Validation Summary: ${successCount}/${totalCount} checks passed`);

  if (successCount === totalCount) {
    console.log('🎉 All i18n setup validation checks passed!');
    return true;
  } else {
    console.log('⚠️ Some validation checks failed. Please review the errors above.');
    return false;
  }
};

// 仅在开发环境自动运行验证
if (import.meta.env.DEV && typeof window !== 'undefined') {
  // 延迟执行以确保所有模块加载完成
  setTimeout(() => {
    validateI18nSetup();
  }, 2000);
}