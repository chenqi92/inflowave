/**
 * 更新通知组件
 */

import React, {useState} from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui';
import {Button, Badge} from '@/components/ui';
import {
    Download,
    ExternalLink,
    X,
    Calendar,
    Tag,
    AlertCircle,
    CheckCircle
} from 'lucide-react';
import {UpdateInfo} from '@/types/updater';
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

    if (!updateInfo) return null;

    const handleUpdate = () => {
        if (updateInfo.download_url) {
            updaterService.openDownloadPage(updateInfo.download_url);
        } else {
            updaterService.openDownloadPage(updateInfo.release_url);
        }
        onOpenChange(false);
        toast.success('下载页面已打开，请按照说明完成更新');
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
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            <div className="flex items-center space-x-2">
                                <CheckCircle className="w-5 h-5 text-green-500"/>
                                <DialogTitle className="text-xl">发现新版本</DialogTitle>
                            </div>
                            <Badge variant="secondary" className="ml-2">
                                {updaterService.formatVersion(updateInfo.latest_version)}
                            </Badge>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleClose}
                            className="h-6 w-6 p-0"
                        >
                            <X className="w-4 h-4"/>
                        </Button>
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
                                onExternalLink={(url) => updaterService.openDownloadPage(url)}
                            />
                        </div>
                    </div>

                    {/* 下载提示 */}
                    {updateInfo.download_url && (
                        <div
                            className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                            <div className="flex items-start space-x-3">
                                <Download className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5"/>
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                                        自动下载可用
                                    </p>
                                    <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                                        我们已为您的平台准备了安装包，点击"立即更新"开始下载。
                                    </p>
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
                            disabled={isSkipping}
                            className="flex-1"
                        >
                            {isSkipping ? '跳过中...' : '跳过此版本'}
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => updaterService.openDownloadPage(updateInfo.release_url)}
                            className="flex-1"
                        >
                            <ExternalLink className="w-4 h-4 mr-2"/>
                            查看详情
                        </Button>
                    </div>
                    <Button onClick={handleUpdate} className="flex-1 sm:flex-none">
                        <Download className="w-4 h-4 mr-2"/>
                        立即更新
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};