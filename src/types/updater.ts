/**
 * 更新相关类型定义
 */

export interface UpdateInfo {
  available: boolean;
  current_version: string;
  latest_version: string;
  release_notes: string;
  download_url?: string;
  release_url: string;
  published_at: string;
  is_skipped: boolean;
}

export interface UpdaterSettings {
  auto_check: boolean;
  check_interval: number; // 检查间隔（小时）
  include_prerelease: boolean;
  skipped_versions: string[];
  notify_on_update: boolean;
  auto_download: boolean;
  last_check: string;
}

export interface UpdateNotificationProps {
  updateInfo: UpdateInfo;
  onUpdate: () => void;
  onSkip: () => void;
  onClose: () => void;
}

export interface UpdateSettingsProps {
  settings: UpdaterSettings;
  onChange: (settings: UpdaterSettings) => void;
}

export interface VersionInfo {
  version: string;
  release_date: string;
  release_notes: string;
}

export interface DownloadProgress {
  downloaded: number;
  total: number;
  percentage: number;
  speed: number; // bytes per second
}

export interface UpdateStatus {
  status: 'downloading' | 'installing' | 'completed' | 'error';
  progress?: DownloadProgress;
  message: string;
  error?: string;
}

export interface PlatformInfo {
  os: string;
  arch: string;
  family: string;
}

export const DEFAULT_UPDATER_SETTINGS: UpdaterSettings = {
  auto_check: true,
  check_interval: 24, // 每24小时检查一次
  include_prerelease: false,
  skipped_versions: [],
  notify_on_update: true,
  auto_download: false,
  last_check: new Date().toISOString(),
};