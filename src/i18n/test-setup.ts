/**
 * i18n 设置测试文件
 * 用于验证国际化配置是否正确工作
 */

import initI18n from './config';
import { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE } from './config';

// 测试 i18n 初始化
export const testI18nSetup = async () => {
  try {
    console.log('Testing i18n setup...');
    
    // 初始化 i18n
    const i18nInstance = await initI18n();
    
    // 验证支持的语言
    console.log('Supported languages:', SUPPORTED_LANGUAGES);
    console.log('Default language:', DEFAULT_LANGUAGE);
    console.log('Current language:', i18nInstance.language);
    
    // 测试基本翻译功能
    const testTranslation = (i18nInstance.t as any)('common:ok');
    console.log('Test translation (common:ok):', testTranslation);

    // 测试语言切换
    await i18nInstance.changeLanguage('en-US');
    console.log('Language changed to en-US');
    console.log('Translation after change:', (i18nInstance.t as any)('common:ok'));

    // 切换回默认语言
    await i18nInstance.changeLanguage(DEFAULT_LANGUAGE);
    console.log('Language changed back to default');
    console.log('Translation after change back:', (i18nInstance.t as any)('common:ok'));
    
    console.log('i18n setup test completed successfully!');
    return true;
  } catch (error) {
    console.error('i18n setup test failed:', error);
    return false;
  }
};

// 仅在开发环境运行测试
if (import.meta.env.DEV) {
  // 延迟执行以确保模块加载完成
  setTimeout(() => {
    testI18nSetup();
  }, 1000);
}