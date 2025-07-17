/**
 * 更新设置组件
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  Settings, 
  Download, 
  Bell, 
  Clock, 
  RefreshCw, 
  AlertTriangle,
  CheckCircle,
  X
} from 'lucide-react';
import { UpdaterSettings, UpdateInfo } from '@/types/updater';
import { updaterService } from '@/services/updaterService';
import { ReleaseNotesManager } from './ReleaseNotesManager';
import { toast } from 'sonner';

export const UpdateSettings: React.FC = () => {
  const [settings, setSettings] = useState<UpdaterSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);
  const [lastUpdateInfo, setLastUpdateInfo] = useState<UpdateInfo | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const currentSettings = await updaterService.getSettings();
      setSettings(currentSettings);
    } catch (error) {
      console.error('Failed to load settings:', error);
      toast.error('加载设置失败');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (newSettings: UpdaterSettings) => {
    setSaving(true);
    try {
      await updaterService.updateSettings(newSettings);
      setSettings(newSettings);
      toast.success('设置已保存');
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error('保存设置失败');
    } finally {
      setSaving(false);
    }
  };

  const handleSettingChange = (key: keyof UpdaterSettings, value: any) => {
    if (!settings) return;
    
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  const handleCheckForUpdates = async () => {
    setChecking(true);
    try {
      const updateInfo = await updaterService.manualCheck();
      setLastUpdateInfo(updateInfo);
      
      if (updateInfo.available && !updateInfo.is_skipped) {
        toast.success(`发现新版本 ${updateInfo.latest_version}`);
      } else if (updateInfo.is_skipped) {
        toast.info(`版本 ${updateInfo.latest_version} 已被跳过`);
      } else {
        toast.success('当前已是最新版本');
      }
    } catch (error) {
      console.error('Failed to check for updates:', error);
      toast.error('检查更新失败');
    } finally {
      setChecking(false);
    }
  };

  const handleClearSkippedVersions = async () => {
    if (!settings) return;
    
    try {
      const newSettings = { ...settings, skipped_versions: [] };
      await saveSettings(newSettings);
      toast.success('已清除跳过的版本');
    } catch (error) {
      console.error('Failed to clear skipped versions:', error);
      toast.error('清除失败');
    }
  };

  const formatLastCheck = (lastCheck: string) => {
    try {
      const date = new Date(lastCheck);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMinutes = Math.floor(diffMs / (1000 * 60));

      if (diffHours >= 24) {
        return `${Math.floor(diffHours / 24)} 天前`;
      } else if (diffHours >= 1) {
        return `${diffHours} 小时前`;
      } else if (diffMinutes >= 1) {
        return `${diffMinutes} 分钟前`;
      } else {
        return '刚刚';
      }
    } catch {
      return '未知';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="w-5 h-5" />
            <span>更新设置</span>
          </CardTitle>
          <CardDescription>正在加载设置...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!settings) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <span>更新设置</span>
          </CardTitle>
          <CardDescription>设置加载失败</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* 基本设置 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="w-5 h-5" />
            <span>自动更新设置</span>
          </CardTitle>
          <CardDescription>
            配置应用程序的自动更新行为
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 自动检查 */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-base">自动检查更新</Label>
              <p className="text-sm text-muted-foreground">
                定期检查新版本并通知您
              </p>
            </div>
            <Switch
              checked={settings.auto_check}
              onCheckedChange={(checked) => handleSettingChange('auto_check', checked)}
              disabled={saving}
            />
          </div>

          <Separator />

          {/* 检查间隔 */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4" />
              <Label className="text-base">检查间隔</Label>
            </div>
            <Select
              value={settings.check_interval.toString()}
              onValueChange={(value) => handleSettingChange('check_interval', parseInt(value))}
              disabled={!settings.auto_check || saving}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">每小时</SelectItem>
                <SelectItem value="6">每 6 小时</SelectItem>
                <SelectItem value="12">每 12 小时</SelectItem>
                <SelectItem value="24">每天</SelectItem>
                <SelectItem value="72">每 3 天</SelectItem>
                <SelectItem value="168">每周</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* 通知设置 */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <Bell className="w-4 h-4" />
                <Label className="text-base">更新通知</Label>
              </div>
              <p className="text-sm text-muted-foreground">
                发现新版本时显示通知
              </p>
            </div>
            <Switch
              checked={settings.notify_on_update}
              onCheckedChange={(checked) => handleSettingChange('notify_on_update', checked)}
              disabled={saving}
            />
          </div>

          <Separator />

          {/* 包含预发布版本 */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-base">包含预发布版本</Label>
              <p className="text-sm text-muted-foreground">
                检查 Beta 和 RC 版本
              </p>
            </div>
            <Switch
              checked={settings.include_prerelease}
              onCheckedChange={(checked) => handleSettingChange('include_prerelease', checked)}
              disabled={saving}
            />
          </div>
        </CardContent>
      </Card>

      {/* 更新检查 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <RefreshCw className="w-5 h-5" />
            <span>立即检查更新</span>
          </CardTitle>
          <CardDescription>
            手动检查是否有新版本可用
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium">上次检查时间</p>
              <p className="text-sm text-muted-foreground">
                {formatLastCheck(settings.last_check)}
              </p>
            </div>
            <Button
              onClick={handleCheckForUpdates}
              disabled={checking}
              className="min-w-[120px]"
            >
              {checking ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  检查中...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  检查更新
                </>
              )}
            </Button>
          </div>

          {lastUpdateInfo && (
            <div className="p-4 rounded-lg border bg-muted/50">
              <div className="flex items-start space-x-3">
                {lastUpdateInfo.available ? (
                  <Download className="w-5 h-5 text-blue-500 mt-0.5" />
                ) : (
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                )}
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium">
                    {lastUpdateInfo.available
                      ? `新版本 ${lastUpdateInfo.latest_version} 可用`
                      : '当前已是最新版本'
                    }
                  </p>
                  <p className="text-xs text-muted-foreground">
                    当前版本: {lastUpdateInfo.current_version}
                  </p>
                  {lastUpdateInfo.is_skipped && (
                    <Badge variant="secondary" className="text-xs">
                      已跳过
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 跳过的版本 */}
      {settings.skipped_versions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <X className="w-5 h-5" />
              <span>跳过的版本</span>
            </CardTitle>
            <CardDescription>
              您选择跳过的版本列表
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {settings.skipped_versions.map((version) => (
                <Badge key={version} variant="secondary">
                  {version}
                </Badge>
              ))}
            </div>
            <Button
              variant="outline"
              onClick={handleClearSkippedVersions}
              disabled={saving}
              className="w-full"
            >
              清除所有跳过的版本
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 发布说明管理器 */}
      <ReleaseNotesManager />
    </div>
  );
};