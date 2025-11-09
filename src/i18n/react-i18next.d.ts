/**
 * react-i18next 类型声明扩展
 */

import 'react-i18next';

// 扩展 react-i18next 的类型定义
declare module 'react-i18next' {
  interface CustomTypeOptions {
    // 默认命名空间
    defaultNS: 'common';

    // 资源类型 - 使用宽松的类型定义避免循环引用
    resources: Record<string, any>;

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

    // 资源类型 - 使用宽松的类型定义避免循环引用
    resources: Record<string, any>;
  }
}