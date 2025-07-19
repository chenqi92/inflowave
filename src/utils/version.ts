/**
 * 应用版本信息工具
 */
import packageJson from '../../package.json';

// 从package.json中获取版本号
export const getAppVersion = (): string => {
  try {
    return packageJson.version || '1.1.1';
  } catch (error) {
    console.warn('无法获取应用版本:', error);
    return '1.1.1'; // 默认版本
  }
};

// 获取应用名称
export const getAppName = (): string => {
  try {
    return packageJson.name || 'InfloWave';
  } catch (error) {
    return 'InfloWave';
  }
};

// 获取完整的版本信息
export const getVersionInfo = () => {
  return {
    version: getAppVersion(),
    name: 'InfloWave',
    appName: getAppName(),
    fullName: `InfloWave v${getAppVersion()}`,
  };
};