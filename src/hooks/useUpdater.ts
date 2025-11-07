/**
 * 更新功能 Hook
 */

import { useState, useEffect, useCallback } from 'react';
import { UpdateInfo } from '@/types/updater';
import { updaterService } from '@/services/updaterService';
import logger from '@/utils/logger';

interface UseUpdaterReturn {
  updateInfo: UpdateInfo | null;
  isChecking: boolean;
  isUpdateAvailable: boolean;
  showNotification: boolean;
  checkForUpdates: () => Promise<void>;
  skipVersion: (version: string) => Promise<void>;
  hideNotification: () => void;
  showUpdateNotification: () => void;
}

export const useUpdater = (): UseUpdaterReturn => {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [showNotification, setShowNotification] = useState(false);

  // 检查更新
  const checkForUpdates = useCallback(async () => {
    setIsChecking(true);
    try {
      const info = await updaterService.checkForUpdates();
      setUpdateInfo(info);
      
      // 如果有更新且未被跳过，显示通知
      if (updaterService.shouldShowUpdateNotification(info)) {
        setShowNotification(true);
      }
    } catch (error) {
      logger.error('Failed to check for updates:', error);
    } finally {
      setIsChecking(false);
    }
  }, []);

  // 跳过版本
  const skipVersion = useCallback(async (version: string) => {
    try {
      await updaterService.skipVersion(version);
      
      // 更新当前 updateInfo 的跳过状态
      if (updateInfo && updateInfo.latest_version === version) {
        setUpdateInfo({
          ...updateInfo,
          is_skipped: true
        });
      }
      
      setShowNotification(false);
    } catch (error) {
      logger.error('Failed to skip version:', error);
      throw error;
    }
  }, [updateInfo]);

  // 隐藏通知
  const hideNotification = useCallback(() => {
    setShowNotification(false);
  }, []);

  // 显示更新通知
  const showUpdateNotification = useCallback(() => {
    setShowNotification(true);
  }, []);

  // 监听自定义更新事件
  useEffect(() => {
    const handleUpdateAvailable = (event: CustomEvent<UpdateInfo>) => {
      setUpdateInfo(event.detail);
      setShowNotification(true);
    };

    window.addEventListener('app-update-available', handleUpdateAvailable as EventListener);

    return () => {
      window.removeEventListener('app-update-available', handleUpdateAvailable as EventListener);
    };
  }, []);

  // 初始化更新服务
  useEffect(() => {
    let mounted = true;

    const initializeUpdater = async () => {
      try {
        await updaterService.initialize();
        
        // 初始化完成后进行一次检查
        if (mounted) {
          await checkForUpdates();
        }
      } catch (error) {
        logger.error('Failed to initialize updater:', error);
      }
    };

    initializeUpdater();

    return () => {
      mounted = false;
    };
  }, [checkForUpdates]);

  // 清理资源
  useEffect(() => {
    return () => {
      updaterService.destroy();
    };
  }, []);

  const isUpdateAvailable = updateInfo?.available === true && !updateInfo?.is_skipped;

  return {
    updateInfo,
    isChecking,
    isUpdateAvailable,
    showNotification,
    checkForUpdates,
    skipVersion,
    hideNotification,
    showUpdateNotification,
  };
};