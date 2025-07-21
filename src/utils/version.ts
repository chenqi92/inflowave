/**
 * 应用版本信息工具
 */
import packageJson from '../../package.json';

// 从package.json中获取版本号
export const getAppVersion = (): string => {
  try {
    return packageJson.version || '0.1.3';
  } catch (error) {
    console.warn('无法获取应用版本:', error);
    return '0.1.3'; // 默认版本，与package.json保持一致
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