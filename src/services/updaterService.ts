/**
 * 自动更新服务
 */

import { safeTauriInvoke } from '@/utils/tauri';
import { UpdateInfo, UpdaterSettings, DEFAULT_UPDATER_SETTINGS, PlatformInfo, UpdateStatus } from '@/types/updater';
import { getAppVersion } from '@/utils/version';

import { logger } from '@/utils/logger';
class UpdaterService {
  private checkInterval: ReturnType<typeof setInterval> | null = null;
  private settings: UpdaterSettings = { ...DEFAULT_UPDATER_SETTINGS };

  /**
   * 初始化更新服务
   */
  async initialize(): Promise<void> {
    try {
      // 加载设置
      await this.loadSettings();
      
      // 启动自动检查（如果启用）
      if (this.settings.auto_check) {
        this.startAutoCheck();
      }
      
      logger.debug('Updater service initialized');
    } catch (error) {
      logger.error('Failed to initialize updater service:', error);
    }
  }

  /**
   * 检查更新
   */
  async checkForUpdates(): Promise<UpdateInfo> {
    try {
      const updateInfo = await safeTauriInvoke<UpdateInfo>('check_for_app_updates');
      
      // 更新最后检查时间
      this.settings.last_check = new Date().toISOString();
      await this.saveSettings();
      
      return updateInfo;
    } catch (error) {
      logger.error('Failed to check for updates:', error);
      throw error;
    }
  }

  /**
   * 跳过版本
   */
  async skipVersion(version: string): Promise<void> {
    try {
      await safeTauriInvoke('skip_version', { version });
      
      // 更新本地设置
      if (!this.settings.skipped_versions.includes(version)) {
        this.settings.skipped_versions.push(version);
        await this.saveSettings();
      }
    } catch (error) {
      logger.error('Failed to skip version:', error);
      throw error;
    }
  }

  /**
   * 获取更新设置
   */
  async getSettings(): Promise<UpdaterSettings> {
    await this.loadSettings();
    return { ...this.settings };
  }

  /**
   * 更新设置
   */
  async updateSettings(newSettings: Partial<UpdaterSettings>): Promise<void> {
    try {
      this.settings = { ...this.settings, ...newSettings };
      await this.saveSettings();
      
      // 重新启动自动检查
      this.stopAutoCheck();
      if (this.settings.auto_check) {
        this.startAutoCheck();
      }
    } catch (error) {
      logger.error('Failed to update settings:', error);
      throw error;
    }
  }

  /**
   * 启动自动检查
   */
  private startAutoCheck(): void {
    this.stopAutoCheck();
    
    if (!this.settings.auto_check || this.settings.check_interval <= 0) {
      return;
    }
    
    const intervalMs = this.settings.check_interval * 60 * 60 * 1000; // 转换为毫秒
    
    this.checkInterval = setInterval(async () => {
      try {
        const updateInfo = await this.checkForUpdates();
        
        // 如果有可用更新且用户允许通知
        if (updateInfo.available && !updateInfo.is_skipped && this.settings.notify_on_update) {
          this.notifyUpdate(updateInfo);
        }
      } catch (error) {
        logger.error('Auto update check failed:', error);
      }
    }, intervalMs);
    
    logger.debug(`Auto update check started, interval: ${this.settings.check_interval} hours`);
  }

  /**
   * 停止自动检查
   */
  private stopAutoCheck(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * 通知用户有更新
   */
  private notifyUpdate(updateInfo: UpdateInfo): void {
    // 发送自定义事件
    const event = new CustomEvent('app-update-available', {
      detail: updateInfo
    });
    window.dispatchEvent(event);
    
    // 如果支持浏览器通知
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('InfloWave 有新版本可用', {
        body: `版本 ${updateInfo.latest_version} 已发布`,
        icon: '/favicon.ico',
        tag: 'app-update',
        requireInteraction: true
      });
    }
  }

  /**
   * 加载设置
   */
  private async loadSettings(): Promise<void> {
    try {
      const settings = await safeTauriInvoke<Record<string, any>>('get_updater_settings');
      
      if (settings && Object.keys(settings).length > 0) {
        // 合并默认设置和保存的设置
        this.settings = {
          ...DEFAULT_UPDATER_SETTINGS,
          ...settings
        };
      }
    } catch (error) {
      logger.warn('Failed to load updater settings, using defaults:', error);
      this.settings = { ...DEFAULT_UPDATER_SETTINGS };
    }
  }

  /**
   * 保存设置
   */
  private async saveSettings(): Promise<void> {
    try {
      await safeTauriInvoke('update_updater_settings', { settings: this.settings });
    } catch (error) {
      logger.error('Failed to save updater settings:', error);
      throw error;
    }
  }

  /**
   * 清理资源
   */
  destroy(): void {
    this.stopAutoCheck();
  }

  /**
   * 手动触发更新检查
   */
  async manualCheck(): Promise<UpdateInfo> {
    try {
      const updateInfo = await this.checkForUpdates();
      
      // 即使用户禁用了自动通知，手动检查也应该显示结果
      if (updateInfo.available && !updateInfo.is_skipped) {
        this.notifyUpdate(updateInfo);
      }
      
      return updateInfo;
    } catch (error) {
      logger.error('Manual update check failed:', error);
      throw error;
    }
  }

  /**
   * 获取当前版本信息
   */
  getCurrentVersion(): string {
    // 从版本工具类获取实际版本号
    try {
      return getAppVersion();
    } catch (error) {
      logger.warn('无法获取应用版本，使用默认值:', error);
      return '0.1.3'; // 默认版本，与package.json保持一致
    }
  }

  /**
   * 打开下载页面
   */
  async openDownloadPage(url: string): Promise<void> {
    if (!url) {
      logger.warn('URL is empty, cannot open download page');
      return;
    }
    
    try {
      // 在 Tauri 环境中使用 shell API 打开链接
      if (window.__TAURI__) {
        try {
          // 使用 Tauri v2 的 shell API
          const { open } = await import('@tauri-apps/plugin-shell');
          await open(url);
        } catch (error: unknown) {
          logger.error('Failed to open URL with Tauri shell:', error);
          // 降级到浏览器打开
          this.fallbackOpenUrl(url);
        }
      } else {
        // 浏览器环境
        this.fallbackOpenUrl(url);
      }
    } catch (error: unknown) {
      logger.error('Failed to open download page:', error);
      // 最后的降级方案
      this.fallbackOpenUrl(url);
    }
  }

  /**
   * 降级方案：使用浏览器打开URL
   */
  private fallbackOpenUrl(url: string): void {
    try {
      if (typeof window !== 'undefined' && window.open) {
        window.open(url, '_blank', 'noopener,noreferrer');
      } else {
        logger.error('Cannot open URL: window.open is not available');
      }
    } catch (error) {
      logger.error('Fallback URL opening failed:', error);
    }
  }

  /**
   * 检查是否应该显示更新通知
   */
  shouldShowUpdateNotification(updateInfo: UpdateInfo): boolean {
    return updateInfo.available && 
           !updateInfo.is_skipped && 
           this.settings.notify_on_update;
  }

  /**
   * 格式化版本号
   */
  formatVersion(version: string): string {
    return version.startsWith('v') ? version : `v${version}`;
  }

  /**
   * 获取更新历史（从跳过的版本中推断）
   */
  getUpdateHistory(): { version: string; skipped: boolean; date: string }[] {
    return this.settings.skipped_versions.map(version => ({
      version,
      skipped: true,
      date: 'Unknown' // 无法获取具体跳过时间
    }));
  }

  /**
   * 检查是否支持内置更新（仅Windows平台）
   */
  async isBuiltinUpdateSupported(): Promise<boolean> {
    try {
      return await safeTauriInvoke<boolean>('is_builtin_update_supported');
    } catch (error) {
      logger.error('检查内置更新支持失败:', error);
      return false;
    }
  }

  /**
   * 获取平台信息
   */
  async getPlatformInfo(): Promise<PlatformInfo> {
    try {
      return await safeTauriInvoke<PlatformInfo>('get_platform_info');
    } catch (error) {
      logger.error('获取平台信息失败:', error);
      return { os: 'unknown', arch: 'unknown', family: 'unknown' };
    }
  }

  /**
   * 下载更新包（Windows内置更新）
   */
  async downloadUpdate(downloadUrl: string, version: string): Promise<string> {
    try {
      return await safeTauriInvoke<string>('download_update', {
        downloadUrl,
        version
      });
    } catch (error) {
      logger.error('下载更新失败:', error);
      throw error;
    }
  }

  /**
   * 安装更新包（Windows内置更新）
   */
  async installUpdate(filePath: string, silent: boolean = false): Promise<void> {
    try {
      await safeTauriInvoke<void>('install_update', {
        filePath,
        silent
      });
    } catch (error) {
      logger.error('安装更新失败:', error);
      throw error;
    }
  }

  /**
   * 下载并安装更新（Windows内置更新的完整流程）
   */
  async downloadAndInstallUpdate(
    downloadUrl: string, 
    version: string, 
    silent: boolean = false
  ): Promise<void> {
    try {
      await safeTauriInvoke<void>('download_and_install_update', {
        downloadUrl,
        version,
        silent
      });
    } catch (error) {
      logger.error('下载并安装更新失败:', error);
      throw error;
    }
  }

  /**
   * 监听更新事件
   */
  setupUpdateEventListeners(callbacks: {
    onDownloadStarted?: (status: UpdateStatus) => void;
    onDownloadProgress?: (status: UpdateStatus) => void;
    onDownloadCompleted?: (status: UpdateStatus) => void;
    onInstallStarted?: (status: UpdateStatus) => void;
    onInstallCompleted?: (status: UpdateStatus) => void;
    onError?: (status: UpdateStatus) => void;
  }): () => void {
    const removeListeners: (() => void)[] = [];

    if (window.__TAURI__) {
      try {
        // 动态导入Tauri事件API
        import('@tauri-apps/api/event').then(({ listen }) => {
          if (callbacks.onDownloadStarted) {
            listen<UpdateStatus>('update-download-started', (event) => {
              callbacks.onDownloadStarted?.(event.payload);
            }).then(unlisten => removeListeners.push(unlisten));
          }

          if (callbacks.onDownloadProgress) {
            listen<UpdateStatus>('update-download-progress', (event) => {
              callbacks.onDownloadProgress?.(event.payload);
            }).then(unlisten => removeListeners.push(unlisten));
          }

          if (callbacks.onDownloadCompleted) {
            listen<UpdateStatus>('update-download-completed', (event) => {
              callbacks.onDownloadCompleted?.(event.payload);
            }).then(unlisten => removeListeners.push(unlisten));
          }

          if (callbacks.onInstallStarted) {
            listen<UpdateStatus>('update-install-started', (event) => {
              callbacks.onInstallStarted?.(event.payload);
            }).then(unlisten => removeListeners.push(unlisten));
          }

          if (callbacks.onInstallCompleted) {
            listen<UpdateStatus>('update-install-completed', (event) => {
              callbacks.onInstallCompleted?.(event.payload);
            }).then(unlisten => removeListeners.push(unlisten));
          }

          if (callbacks.onError) {
            listen<UpdateStatus>('update-install-error', (event) => {
              callbacks.onError?.(event.payload);
            }).then(unlisten => removeListeners.push(unlisten));
          }
        }).catch(error => {
          logger.error('设置更新事件监听器失败:', error);
        });
      } catch (error) {
        logger.error('导入Tauri事件API失败:', error);
      }
    }

    // 返回清理函数
    return () => {
      removeListeners.forEach(unlisten => {
        try {
          unlisten();
        } catch (error) {
          logger.error('移除事件监听器失败:', error);
        }
      });
    };
  }
}

// 导出单例实例
export const updaterService = new UpdaterService();

export default updaterService;