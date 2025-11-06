/**
 * 更新设置组件
 */

import React, {useState, useEffect} from 'react';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {
    Switch,
    Button,
    Label,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
    Separator,
    Badge
} from '@/components/ui';
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
import {UpdaterSettings, UpdateInfo} from '@/types/updater';
import {updaterService} from '@/services/updaterService';
import {ReleaseNotesManager} from './ReleaseNotesManager';
import {toast} from 'sonner';
import {useSettingsTranslation} from '@/hooks/useTranslation';

export const UpdateSettings: React.FC = () => {
    const { t } = useSettingsTranslation();
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
            toast.error(t('load_failed'));
        } finally {
            setLoading(false);
        }
    };

    const saveSettings = async (newSettings: UpdaterSettings) => {
        setSaving(true);
        try {
            await updaterService.updateSettings(newSettings);
            setSettings(newSettings);
            toast.success(t('settings_saved'));
        } catch (error) {
            console.error('Failed to save settings:', error);
            toast.error(t('settings_save_failed'));
        } finally {
            setSaving(false);
        }
    };

    const handleSettingChange = (key: keyof UpdaterSettings, value: any) => {
        if (!settings) return;

        const newSettings = {...settings, [key]: value};
        setSettings(newSettings);
        saveSettings(newSettings);
    };

    const handleCheckForUpdates = async () => {
        setChecking(true);
        try {
            const updateInfo = await updaterService.manualCheck();
            setLastUpdateInfo(updateInfo);

            if (updateInfo.available && !updateInfo.is_skipped) {
                toast.success(t('new_version_text', { version: updateInfo.latest_version }));
            } else if (updateInfo.is_skipped) {
                toast.info(`${t('version_skipped_badge')} ${updateInfo.latest_version}`);
            } else {
                toast.success(t('already_latest_text'));
            }
        } catch (error) {
            console.error('Failed to check for updates:', error);
            toast.error(t('check_update_failed') || '检查更新失败');
        } finally {
            setChecking(false);
        }
    };

    const handleClearSkippedVersions = async () => {
        if (!settings) return;

        try {
            const newSettings = {...settings, skipped_versions: []};
            await saveSettings(newSettings);
            toast.success(t('clear_skipped_success') || '已清除跳过的版本');
        } catch (error) {
            console.error('Failed to clear skipped versions:', error);
            toast.error(t('clear_skipped_failed') || '清除失败');
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
                return t('time_ago_days', { count: Math.floor(diffHours / 24) });
            } else if (diffHours >= 1) {
                return t('time_ago_hours', { count: diffHours });
            } else if (diffMinutes >= 1) {
                return t('time_ago_minutes', { count: diffMinutes });
            } else {
                return t('time_ago_just_now');
            }
        } catch {
            return t('time_ago_unknown');
        }
    };

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                        <Settings className="w-5 h-5"/>
                        <span>{t('update_settings_title')}</span>
                    </CardTitle>
                    <CardDescription>{t('update_settings_loading')}</CardDescription>
                </CardHeader>
            </Card>
        );
    }

    if (!settings) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                        <AlertTriangle className="w-5 h-5 text-red-500"/>
                        <span>{t('update_settings_title')}</span>
                    </CardTitle>
                    <CardDescription>{t('update_settings_load_failed')}</CardDescription>
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
                        <Settings className="w-5 h-5"/>
                        <span>{t('auto_update_settings_title')}</span>
                    </CardTitle>
                    <CardDescription>
                        {t('auto_update_settings_desc')}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* 自动检查 */}
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <Label className="text-base">{t('auto_check_label')}</Label>
                            <p className="text-sm text-muted-foreground">
                                {t('auto_check_desc')}
                            </p>
                        </div>
                        <Switch
                            checked={settings.auto_check}
                            onCheckedChange={(checked) => handleSettingChange('auto_check', checked)}
                            disabled={saving}
                        />
                    </div>

                    <Separator/>

                    {/* 检查间隔 */}
                    <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                            <Clock className="w-4 h-4"/>
                            <Label className="text-base">{t('check_interval_label')}</Label>
                        </div>
                        <Select
                            value={settings.check_interval.toString()}
                            onValueChange={(value) => handleSettingChange('check_interval', parseInt(value))}
                            disabled={!settings.auto_check || saving}
                        >
                            <SelectTrigger className="w-full h-9">
                                <SelectValue/>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="1">{t('check_interval_hourly') || '每小时'}</SelectItem>
                                <SelectItem value="6">{t('check_interval_6hours') || '每 6 小时'}</SelectItem>
                                <SelectItem value="12">{t('check_interval_12hours') || '每 12 小时'}</SelectItem>
                                <SelectItem value="24">{t('check_interval_daily') || '每天'}</SelectItem>
                                <SelectItem value="72">{t('check_interval_3days') || '每 3 天'}</SelectItem>
                                <SelectItem value="168">{t('check_interval_weekly') || '每周'}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <Separator/>

                    {/* 通知设置 */}
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                                <Bell className="w-4 h-4"/>
                                <Label className="text-base">{t('update_notification_label')}</Label>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                {t('update_notification_desc')}
                            </p>
                        </div>
                        <Switch
                            checked={settings.notify_on_update}
                            onCheckedChange={(checked) => handleSettingChange('notify_on_update', checked)}
                            disabled={saving}
                        />
                    </div>

                    <Separator/>

                    {/* 包含预发布版本 */}
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <Label className="text-base">{t('include_prerelease_label')}</Label>
                            <p className="text-sm text-muted-foreground">
                                {t('include_prerelease_desc')}
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
                        <RefreshCw className="w-5 h-5"/>
                        <span>{t('check_now_title')}</span>
                    </CardTitle>
                    <CardDescription>
                        {t('check_now_desc')}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="text-sm font-medium">{t('last_check_label')}</p>
                            <p className="text-sm text-muted-foreground">
                                {formatLastCheck(settings.last_check)}
                            </p>
                        </div>
                        <Button
                            size='sm'
                            onClick={handleCheckForUpdates}
                            disabled={checking}
                            className="min-w-[120px]"
                        >
                            {checking ? (
                                <>
                                    <RefreshCw className="w-4 h-4 mr-2 animate-spin"/>
                                    {t('checking_text')}
                                </>
                            ) : (
                                <>
                                    <RefreshCw className="w-4 h-4 mr-2"/>
                                    {t('check_update_button')}
                                </>
                            )}
                        </Button>
                    </div>

                    {lastUpdateInfo && (
                        <div className="p-4 rounded-lg border bg-muted/50">
                            <div className="flex items-start space-x-3">
                                {lastUpdateInfo.available ? (
                                    <Download className="w-5 h-5 text-blue-500 mt-0.5"/>
                                ) : (
                                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5"/>
                                )}
                                <div className="flex-1 space-y-1">
                                    <p className="text-sm font-medium">
                                        {lastUpdateInfo.available
                                            ? t('new_version_text', { version: lastUpdateInfo.latest_version })
                                            : t('already_latest_text')
                                        }
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {t('current_version_label') || '当前版本'}: {lastUpdateInfo.current_version}
                                    </p>
                                    {lastUpdateInfo.is_skipped && (
                                        <Badge variant="secondary" className="text-xs">
                                            {t('version_skipped_badge')}
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
                            <X className="w-5 h-5"/>
                            <span>{t('skipped_versions_title')}</span>
                        </CardTitle>
                        <CardDescription>
                            {t('skipped_versions_desc_full')}
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
                            size='sm'
                            onClick={handleClearSkippedVersions}
                            disabled={saving}
                            className="w-full"
                        >
                            {t('clear_all_skipped')}
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* 发布说明管理器 */}
            <ReleaseNotesManager/>
        </div>
    );
};