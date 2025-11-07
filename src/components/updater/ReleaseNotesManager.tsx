/**
 * 发布说明管理器组件
 * 用于在设置页面中查看和管理发布说明
 */

import React, {useState, useEffect} from 'react';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {Button, Badge, Separator} from '@/components/ui';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui';
import {
    BookOpen,
    RefreshCw,
    ExternalLink,
    Download,
    Calendar,
    Loader2
} from 'lucide-react';
import {ReleaseNotesViewer} from './ReleaseNotesViewer';
import {releaseNotesService} from '@/services/releaseNotesService';
import {updaterService} from '@/services/updaterService';
import logger from '@/utils/logger';
import {toast} from 'sonner';
import {useSettingsTranslation} from '@/hooks/useTranslation';
import logger from '@/utils/logger';

export const ReleaseNotesManager: React.FC = () => {
    const { t } = useSettingsTranslation();
    const [availableVersions, setAvailableVersions] = useState<string[]>([]);
    const [selectedVersion, setSelectedVersion] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        loadAvailableVersions();
    }, []);

    const loadAvailableVersions = async () => {
        setLoading(true);
        try {
            const versions = await releaseNotesService.getAvailableVersions();
            setAvailableVersions(versions);

            // 默认选择最新版本
            if (versions.length > 0 && !selectedVersion) {
                setSelectedVersion(versions[0]);
            }
        } catch (error) {
            logger.error('Failed to load available versions:', error);
            toast.error(t('release_notes_load_failed') || '加载版本列表失败');
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        try {
            // 清除缓存并重新加载
            releaseNotesService.clearCache();
            await loadAvailableVersions();
            toast.success(t('release_notes_refreshed') || '发布说明已刷新');
        } catch (error) {
            logger.error('Failed to refresh release notes:', error);
            toast.error(t('refresh_failed') || '刷新失败');
        } finally {
            setRefreshing(false);
        }
    };

    const handleCheckUpdates = async () => {
        try {
            const updateInfo = await updaterService.manualCheck();
            if (updateInfo.available && !updateInfo.is_skipped) {
                toast.success(t('new_version_found', { version: updateInfo.latest_version }) || `发现新版本 ${updateInfo.latest_version}`);
                // 如果有新版本且不在列表中，添加到列表
                if (!availableVersions.includes(updateInfo.latest_version)) {
                    setAvailableVersions(prev => [updateInfo.latest_version, ...prev]);
                }
            } else {
                toast.success(t('already_latest_text') || '当前已是最新版本');
            }
        } catch (error) {
            logger.error('Failed to check for updates:', error);
            toast.error(t('check_update_failed') || '检查更新失败');
        }
    };

    const getCurrentVersion = () => {
        return updaterService.getCurrentVersion();
    };

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                        <BookOpen className="w-5 h-5"/>
                        <span>{t('release_notes_title') || '发布说明'}</span>
                    </CardTitle>
                    <CardDescription>{t('release_notes_desc') || '查看各版本的更新内容和新特性'}</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-center p-8">
                        <Loader2 className="w-6 h-6 animate-spin mr-2"/>
                        <span className="text-sm text-muted-foreground">{t('loading') || '加载中...'}</span>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* 版本选择器 */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                        <BookOpen className="w-5 h-5"/>
                        <span>{t('release_notes_title') || '发布说明'}</span>
                    </CardTitle>
                    <CardDescription>
                        {t('release_notes_desc_full') || '查看各版本的更新内容、新特性和错误修复'}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-2">
                                <span className="text-sm font-medium">{t('current_version_label') || '当前版本'}:</span>
                                <Badge variant="outline">
                                    v{getCurrentVersion()}
                                </Badge>
                            </div>
                            <Separator orientation="vertical" className="h-6"/>
                            <div className="flex items-center space-x-2">
                                <span className="text-sm font-medium">{t('view_version_label') || '查看版本'}:</span>
                                <Select value={selectedVersion} onValueChange={setSelectedVersion}>
                                    <SelectTrigger className="w-32">
                                        <SelectValue placeholder={t('select_version_placeholder') || '选择版本'}/>
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableVersions.map((version) => (
                                            <SelectItem key={version} value={version}>
                                                v{version}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="flex items-center space-x-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleRefresh}
                                disabled={refreshing}
                            >
                                <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`}/>
                                {t('refresh_button') || '刷新'}
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleCheckUpdates}
                            >
                                <Download className="w-4 h-4 mr-2"/>
                                {t('check_update_button') || '检查更新'}
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => updaterService.openDownloadPage(`https://github.com/chenqi92/inflowave/releases`).catch(err => logger.error('Failed to open download page:', err))}
                            >
                                <ExternalLink className="w-4 h-4 mr-2"/>
                                GitHub
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* 发布说明内容 */}
            {selectedVersion && (
                <Card>
                    <CardContent className="p-6">
                        <ReleaseNotesViewer
                            version={selectedVersion}
                            maxHeight="400px"
                            showTitle={true}
                            showMetadata={true}
                            onExternalLink={(url) => updaterService.openDownloadPage(url).catch(err => logger.error('Failed to open external link:', err))}
                        />
                    </CardContent>
                </Card>
            )}

            {/* 帮助信息 */}
            <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/30">
                <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                        <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5"/>
                        <div className="flex-1">
                            <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                                {t('about_release_notes') || '关于发布说明'}
                            </h4>
                            <p className="text-xs text-blue-700 dark:text-blue-300">
                                {t('release_notes_help_text') || '发布说明展示了每个版本的新功能、改进和错误修复。建议在更新前查看相关说明以了解变更内容。如果本地没有找到特定版本的说明，系统会尝试从 GitHub 获取官方发布信息。'}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};