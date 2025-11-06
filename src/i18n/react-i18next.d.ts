/**
 * react-i18next 类型声明扩展
 */

import 'react-i18next';
import type { TranslationResource } from './types';

// 扩展 react-i18next 的类型定义
declare module 'react-i18next' {
  interface CustomTypeOptions {
    // 默认命名空间
    defaultNS: 'common';
    
    // 资源类型
    resources: {
      common: TranslationResource['common'];
      navigation: TranslationResource['navigation'];
      connections: TranslationResource['connections'];
      query: TranslationResource['query'];
      settings: TranslationResource['settings'];
      errors: TranslationResource['errors'];
      dateTime: TranslationResource['dateTime'];
      logs: TranslationResource['logs'];
      tests: TranslationResource['tests'];
      utils: TranslationResource['utils'];
    };
    
    // 返回对象类型
    returnObjects: false;
    
    // 返回空字符串而不是键名
    returnEmptyString: false;
    
    // 返回 null 而不是键名
    returnNull: false;
  }
}

// 扩展 i18next 的类型定义
declare module 'i18next' {
  interface CustomTypeOptions {
    // 默认命名空间
    defaultNS: 'common';
    
    // 资源类型
    resources: {
      common: TranslationResource['common'];
      navigation: TranslationResource['navigation'];
      connections: TranslationResource['connections'];
      query: TranslationResource['query'];
      settings: TranslationResource['settings'];
      errors: TranslationResource['errors'];
      dateTime: TranslationResource['dateTime'];
      logs: TranslationResource['logs'];
      tests: TranslationResource['tests'];
      utils: TranslationResource['utils'];
    };
  }
}