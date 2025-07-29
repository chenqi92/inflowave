/**
 * 更新通知组件
 */

import React, {useState, useEffect} from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui';
import {Button, Badge, Progress} from '@/components/ui';
import {
    Download,
    ExternalLink,
    Calendar,
    Tag,
    AlertCircle,
    CheckCircle,
    Monitor,
    Loader2
} from 'lucide-react';
import {UpdateInfo, PlatformInfo, UpdateStatus} from '@/types/updater';
import {updaterService} from '@/services/updaterService';
import {ReleaseNotesViewer} from './ReleaseNotesViewer';
import {toast} from 'sonner';

interface UpdateNotificationProps {
    open: boolean;
    updateInfo: UpdateInfo | null;
    onOpenChange: (open: boolean) => void;
}

export const UpdateNotification: React.FC<UpdateNotificationProps> = ({
                                                                          open,
                                                                          updateInfo,
                                                                          onOpenChange,
                                                                      }) => {
    const [isSkipping, setIsSkipping] = useState(false);
    const [isBuiltinSupported, setIsBuiltinSupported] = useState(false);
    const [platformInfo, setPlatformInfo] = useState<PlatformInfo | null>(null);
    const [updateStatus, setUpdateStatus] = useState<UpdateStatus | null>(null);
    const [isUpdating, setIsUpdating] = useState(false);

    // 初始化平台信息和内置更新支持
    useEffect(() => {
        if (open && updateInfo) {
            Promise.all([
                updaterService.isBuiltinUpdateSupported(),
                updaterService.getPlatformInfo()
            ]).then(([supported, platform]) => {
                setIsBuiltinSupported(supported);
                setPlatformInfo(platform);
            }).catch(error => {
                console.error('获取平台信息失败:', error);
                setIsBuiltinSupported(false);
                setPlatformInfo(null);
            });
        }
    }, [open, updateInfo]);

    // 设置更新事件监听器
    useEffect(() => {
        if (!open || !isBuiltinSupported) return;

        const removeListeners = updaterService.setupUpdateEventListeners({
            onDownloadStarted: (status) => {
                setUpdateStatus(status);
                setIsUpdating(true);
            },
            onDownloadProgress: (status) => {
                setUpdateStatus(status);
            },
            onDownloadCompleted: (status) => {
                setUpdateStatus(status);
            },
            onInstallStarted: (status) => {
                setUpdateStatus(status);
            },
            onInstallCompleted: (status) => {
                setUpdateStatus(status);
                setIsUpdating(false);
                toast.success(status.message);
                onOpenChange(false);
            },
            onError: (status) => {
                setUpdateStatus(status);
                setIsUpdating(false);
                toast.error(status.error || '更新失败');
            },
        });

        return removeListeners;
    }, [open, isBuiltinSupported, onOpenChange]);

    if (!updateInfo) return null;

    const handleUpdate = async () => {
        const downloadUrl = updateInfo.download_url || updateInfo.release_url;
        if (!downloadUrl) {
            toast.error('无法获取下载链接');
            return;
        }

        // 如果支持内置更新且有直接下载链接，使用内置更新
        if (isBuiltinSupported && updateInfo.download_url) {
            try {
                setIsUpdating(true);
                setUpdateStatus({
                    status: 'downloading',
                    message: '准备下载更新...',
                });

                await updaterService.downloadAndInstallUpdate(
                    updateInfo.download_url,
                    updateInfo.latest_version,
                    false // 显示安装界面
                );
            } catch (error) {
                setIsUpdating(false);
                setUpdateStatus(null);
                console.error('内置更新失败:', error);
                toast.error(`内置更新失败: ${error}`);
                
                // 降级到外部下载
                console.log('降级到外部下载');
                updaterService.openDownloadPage(downloadUrl).catch(console.error);
                onOpenChange(false);
                toast.success('下载页面已打开，请按照说明完成更新');
            }
        } else {
            // 使用外部下载方式
            console.log('Opening download URL:', downloadUrl);
            updaterService.openDownloadPage(downloadUrl).catch(console.error);
            onOpenChange(false);
            toast.success('下载页面已打开，请按照说明完成更新');
        }
    };

    const handleSkip = async () => {
        setIsSkipping(true);
        try {
            await updaterService.skipVersion(updateInfo.latest_version);
            toast.success(`已跳过版本 ${updateInfo.latest_version}`);
            onOpenChange(false);
        } catch (error) {
            console.error('Failed to skip version:', error);
            toast.error('跳过版本失败');
        } finally {
            setIsSkipping(false);
        }
    };

    const handleClose = () => {
        onOpenChange(false);
    };

    const formatDate = (dateString: string) => {
        try {
            return new Date(dateString).toLocaleDateString('zh-CN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
            });
        } catch {
            return dateString;
        }
    };


    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[85vh]">
                <DialogHeader>
                    <div className="flex items-center space-x-2">
                        <CheckCircle className="w-5 h-5 text-green-500"/>
                        <DialogTitle className="text-xl">发现新版本</DialogTitle>
                        <Badge variant="secondary" className="ml-2">
                            {updaterService.formatVersion(updateInfo.latest_version)}
                        </Badge>
                    </div>
                    <DialogDescription className="text-base">
                        InfloWave 有新版本可用，建议您升级以获得最新功能和安全更新。
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {/* 版本信息 */}
                    <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                        <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                                <Tag className="w-4 h-4 text-muted-foreground"/>
                                <span className="text-sm font-medium">版本信息</span>
                            </div>
                            <div className="text-sm text-muted-foreground">
                                当前版本: {updaterService.formatVersion(updateInfo.current_version)} →
                                最新版本: {updaterService.formatVersion(updateInfo.latest_version)}
                            </div>
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                            <Calendar className="w-4 h-4"/>
                            <span>{formatDate(updateInfo.published_at)}</span>
                        </div>
                    </div>

                    {/* 发布说明查看器 */}
                    <div className="border rounded-lg">
                        <div className="p-4 border-b bg-muted/30">
                            <h4 className="text-sm font-medium flex items-center space-x-2">
                                <AlertCircle className="w-4 h-4"/>
                                <span>版本更新说明</span>
                            </h4>
                        </div>
                        <div className="p-4">
                            <ReleaseNotesViewer
                                version={updateInfo.latest_version}
                                maxHeight="350px"
                                showTitle={false}
                                showMetadata={false}
                                onExternalLink={(url) => updaterService.openDownloadPage(url).catch(console.error)}
                            />
                        </div>
                    </div>

                    {/* 平台信息和下载提示 */}
                    {updateInfo.download_url && (
                        <div
                            className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                            <div className="flex items-start space-x-3">
                                <Download className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5"/>
                                <div className="flex-1">
                                    <div className="flex items-center space-x-2 mb-1">
                                        <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                                            {isBuiltinSupported ? '一键更新可用' : '自动下载可用'}
                                        </p>
                                        {platformInfo && (
                                            <div className="flex items-center space-x-1 text-xs text-blue-700 dark:text-blue-300">
                                                <Monitor className="w-3 h-3"/>
                                                <span>{platformInfo.os}</span>
                                                <span>•</span>
                                                <span>{platformInfo.arch}</span>
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-xs text-blue-700 dark:text-blue-300">
                                        {isBuiltinSupported 
                                            ? '支持一键下载并安装，无需手动操作。' 
                                            : '我们已为您的平台准备了安装包，点击"立即更新"开始下载。'
                                        }
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 更新进度显示 */}
                    {updateStatus && isUpdating && (
                        <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border">
                            <div className="space-y-3">
                                <div className="flex items-center space-x-3">
                                    <Loader2 className="w-5 h-5 animate-spin text-blue-600"/>
                                    <div className="flex-1">
                                        <p className="text-sm font-medium">{updateStatus.message}</p>
                                        {updateStatus.progress && (
                                            <div className="mt-2 space-y-1">
                                                <div className="flex justify-between text-xs text-muted-foreground">
                                                    <span>
                                                        {(updateStatus.progress.downloaded / 1024 / 1024).toFixed(1)} MB
                                                        {updateStatus.progress.total > 0 && 
                                                            ` / ${(updateStatus.progress.total / 1024 / 1024).toFixed(1)} MB`
                                                        }
                                                    </span>
                                                    <span>{updateStatus.progress.percentage.toFixed(1)}%</span>
                                                </div>
                                                <Progress 
                                                    value={updateStatus.progress.percentage} 
                                                    className="h-2"
                                                />
                                                {updateStatus.progress.speed > 0 && (
                                                    <p className="text-xs text-muted-foreground">
                                                        下载速度: {(updateStatus.progress.speed / 1024 / 1024).toFixed(1)} MB/s
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter className="flex flex-col sm:flex-row gap-2">
                    <div className="flex flex-1 space-x-2">
                        <Button
                            variant="outline"
                            onClick={handleSkip}
                            disabled={isSkipping || isUpdating}
                            className="flex-1"
                        >
                            {isSkipping ? '跳过中...' : '跳过此版本'}
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => {
                                const detailUrl = updateInfo.release_url;
                                if (!detailUrl) {
                                    toast.error('无法获取详情链接');
                                    return;
                                }
                                console.log('Opening detail URL:', detailUrl);
                                updaterService.openDownloadPage(detailUrl).catch(console.error);
                            }}
                            disabled={isUpdating}
                            className="flex-1"
                        >
                            <ExternalLink className="w-4 h-4 mr-2"/>
                            查看详情
                        </Button>
                    </div>
                    <Button 
                        onClick={handleUpdate} 
                        disabled={isUpdating}
                        className="flex-1 sm:flex-none"
                    >
                        {isUpdating ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin"/>
                                {updateStatus?.status === 'downloading' ? '下载中...' : 
                                 updateStatus?.status === 'installing' ? '安装中...' : '更新中...'}
                            </>
                        ) : (
                            <>
                                <Download className="w-4 h-4 mr-2"/>
                                {isBuiltinSupported && updateInfo.download_url ? '一键更新' : '立即更新'}
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};