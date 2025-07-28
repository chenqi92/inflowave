import { TreeNodeType } from '@/types/tree';

// 图标主题类型
export type IconTheme = 'light' | 'dark';

// 获取当前主题
export const getCurrentTheme = (): IconTheme => {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
};

// 主题感知的图标映射
const themeIconMap: Record<IconTheme, Record<string, string>> = {
  light: {
    'connection-active': '/src/assets/icons/database/connection-active-light.svg',
    'connection-inactive': '/src/assets/icons/database/connection-inactive-light.svg',
    'database': '/src/assets/icons/database/database-light.svg',
    'system_database': '/src/assets/icons/database/database-system-light.svg',
    'bucket': '/src/assets/icons/database/bucket-light.svg',
    'measurement': '/src/assets/icons/database/measurement-light.svg',
    'field': '/src/assets/icons/database/field-light.svg',
    'tag': '/src/assets/icons/database/tag-light.svg',
    'organization': '/src/assets/icons/database/organization-light.svg',
  },
  dark: {
    'connection-active': '/src/assets/icons/database/connection-active-dark.svg',
    'connection-inactive': '/src/assets/icons/database/connection-inactive-dark.svg',
    'database': '/src/assets/icons/database/database-dark.svg',
    'system_database': '/src/assets/icons/database/database-system-dark.svg',
    'bucket': '/src/assets/icons/database/bucket-dark.svg',
    'measurement': '/src/assets/icons/database/measurement-dark.svg',
    'field': '/src/assets/icons/database/field-dark.svg',
    'tag': '/src/assets/icons/database/tag-dark.svg',
    'organization': '/src/assets/icons/database/organization-dark.svg',
  }
};

/**
 * 获取主题感知的图标路径
 */
export const getThemeAwareIcon = (nodeType: TreeNodeType, isConnected?: boolean): string => {
  const theme = getCurrentTheme();
  const iconKey = nodeType === 'connection' 
    ? (isConnected ? 'connection-active' : 'connection-inactive')
    : nodeType;
  
  return themeIconMap[theme][iconKey] || themeIconMap[theme]['database'] || '';
};

/**
 * 获取数据库类型的品牌图标
 */
export const getDatabaseBrandIcon = (dbType: string): string => {
  const brandIcons: Record<string, string> = {
    'InfluxDB': '/src/assets/icons/database/brands/influxdb.svg',
    'InfluxDB2': '/src/assets/icons/database/brands/influxdb2.svg', 
    'InfluxDB3': '/src/assets/icons/database/brands/influxdb3.svg',
    'IoTDB': '/src/assets/icons/database/brands/iotdb.svg',
  };
  
  return brandIcons[dbType] || '/src/assets/icons/database/database.svg';
};