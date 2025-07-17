/**
 * 自动更新服务
 */

import { safeTauriInvoke } from '@/utils/tauri';
import { UpdateInfo, UpdaterSettings, DEFAULT_UPDATER_SETTINGS } from '@/types/updater';

class UpdaterService {
  private checkInterval: NodeJS.Timeout | null = null;
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
      
      console.log('Updater service initialized');
    } catch (error) {
      console.error('Failed to initialize updater service:', error);
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
      console.error('Failed to check for updates:', error);
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
      console.error('Failed to skip version:', error);
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
      console.error('Failed to update settings:', error);
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
        console.error('Auto update check failed:', error);
      }
    }, intervalMs);
    
    console.log(`Auto update check started, interval: ${this.settings.check_interval} hours`);
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
      console.warn('Failed to load updater settings, using defaults:', error);
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
      console.error('Failed to save updater settings:', error);
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
      console.error('Manual update check failed:', error);
      throw error;
    }
  }

  /**
   * 获取当前版本信息
   */
  getCurrentVersion(): string {
    // 从 package.json 或应用配置中获取版本
    return '1.0.6'; // 这里应该从配置或构建时注入
  }

  /**
   * 打开下载页面
   */
  openDownloadPage(url: string): void {
    if (url) {
      window.open(url, '_blank');
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
}

// 导出单例实例
export const updaterService = new UpdaterService();

export default updaterService;