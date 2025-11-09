/**
 * 国际化设置验证脚本
 * 验证配置和资源文件是否正确
 */

import { SUPPORTED_LANGUAGES } from './config';
import i18n from 'i18next';

// 验证运行时依赖（检查是否已加载）
const validateRuntimeDependencies = () => {
  const results: { name: string; status: 'success' | 'error'; message: string }[] = [];

  // 检查 i18next 是否已初始化
  if (i18n.isInitialized) {
    results.push({
      name: 'i18next',
      status: 'success',
      message: 'i18next is initialized and ready'
    });
  } else {
    results.push({
      name: 'i18next',
      status: 'error',
      message: 'i18next is not initialized'
    });
  }

  // 检查当前语言
  if (i18n.language) {
    results.push({
      name: 'current language',
      status: 'success',
      message: `Current language: ${i18n.language}`
    });
  } else {
    results.push({
      name: 'current language',
      status: 'error',
      message: 'No language detected'
    });
  }

  return results;
};

// 验证配置
const validateConfiguration = () => {
  const results: { name: string; status: 'success' | 'error'; message: string }[] = [];

  // 验证支持的语言
  if (SUPPORTED_LANGUAGES && SUPPORTED_LANGUAGES.length > 0) {
    results.push({
      name: 'supported languages',
      status: 'success',
      message: `Found ${SUPPORTED_LANGUAGES.length} supported languages: ${SUPPORTED_LANGUAGES.join(', ')}`
    });
  } else {
    results.push({
      name: 'supported languages',
      status: 'error',
      message: 'No supported languages found in configuration'
    });
  }

  // 验证 i18next 配置
  const loadedLanguages = i18n.languages || [];
  if (loadedLanguages.length > 0) {
    results.push({
      name: 'loaded languages',
      status: 'success',
      message: `i18next has ${loadedLanguages.length} languages loaded: ${loadedLanguages.join(', ')}`
    });
  } else {
    results.push({
      name: 'loaded languages',
      status: 'error',
      message: 'No languages loaded in i18next'
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

  // 验证运行时依赖
  console.log('📦 Checking runtime dependencies...');
  const dependencyResults = validateRuntimeDependencies();
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
  let resourceResults: { name: string; status: 'success' | 'error'; message: string }[] = [];
  if (typeof window !== 'undefined') {
    console.log('\n🌐 Checking language resources...');
    resourceResults = await validateLanguageResources();
    resourceResults.forEach(result => {
      const icon = result.status === 'success' ? '✅' : '❌';
      console.log(`${icon} ${result.name}: ${result.message}`);
    });
  }

  // 汇总结果
  const allResults = [
    ...dependencyResults,
    ...configResults,
    ...resourceResults
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