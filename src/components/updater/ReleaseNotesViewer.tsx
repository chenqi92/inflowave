/**
 * 发布说明查看器组件
 */

import React, {useState, useEffect} from 'react';
import { Badge, Button} from '@/components/ui';
import {
    Sparkles,
    Wrench,
    Bug,
    Code,
    Calendar,
    ExternalLink,
    Loader2,
    AlertCircle
} from 'lucide-react';
import {releaseNotesService, ReleaseNote, VersionFeatures} from '@/services/releaseNotesService';
import {toast} from 'sonner';
import MarkdownRenderer from '@/components/common/MarkdownRenderer';
import { openExternalLink } from '@/utils/externalLinks';
import logger from '@/utils/logger';

interface ReleaseNotesViewerProps {
    version: string;
    maxHeight?: string;
    showTitle?: boolean;
    showMetadata?: boolean;
    onExternalLink?: (url: string) => void;
}

export const ReleaseNotesViewer: React.FC<ReleaseNotesViewerProps> = ({
                                                                          version,
                                                                          maxHeight = '400px',
                                                                          showTitle = true,
                                                                          showMetadata = true,
                                                                          onExternalLink,
                                                                      }) => {
    const [releaseNote, setReleaseNote] = useState<ReleaseNote | null>(null);
    const [features, setFeatures] = useState<VersionFeatures | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadReleaseNotes();
    }, [version]);

    const loadReleaseNotes = async () => {
        setLoading(true);
        setError(null);

        try {
            const [note, versionFeatures] = await Promise.all([
                releaseNotesService.getReleaseNotes(version),
                releaseNotesService.getVersionFeatures(version)
            ]);

            if (!note) {
                setError(`未找到版本 ${version} 的发布说明`);
                return;
            }

            setReleaseNote(note);
            setFeatures(versionFeatures);
        } catch (error) {
            logger.error('Failed to load release notes:', error);
            setError('加载发布说明失败');
            toast.error('加载发布说明失败');
        } finally {
            setLoading(false);
        }
    };

    const handleExternalLink = async (url: string) => {
        if (onExternalLink) {
            onExternalLink(url);
        } else {
            await openExternalLink(url);
        }
    };

    const processContentForMarkdown = (content: string) => {
        // 如果不显示标题，则移除主标题
        if (!showTitle) {
            const lines = content.split('\n');
            const processedLines = [];
            let skipNextEmpty = false;
            
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                // 跳过主标题（以# 开头且不是##的行）
                if (line.match(/^# [^#]/)) {
                    skipNextEmpty = true;
                    continue;
                }
                // 跳过标题后的第一个空行
                if (skipNextEmpty && line.trim() === '') {
                    skipNextEmpty = false;
                    continue;
                }
                skipNextEmpty = false;
                processedLines.push(line);
            }
            return processedLines.join('\n');
        }
        return content;
    };

    const handleInternalLinkClick = (filename: string) => {
        // 处理内部文档链接点击（如果需要）
        logger.info('Internal link clicked:', filename);
    };


    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="w-6 h-6 animate-spin mr-2"/>
                <span className="text-sm text-muted-foreground">加载发布说明中...</span>
            </div>
        );
    }

    if (error || !releaseNote) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-center">
                <AlertCircle className="w-8 h-8 text-muted-foreground mb-2"/>
                <p className="text-sm text-muted-foreground mb-4">
                    {error || `未找到版本 ${version} 的发布说明`}
                </p>
                <Button variant="outline" size="sm" onClick={loadReleaseNotes}>
                    重试
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-4 w-full min-w-0">
            {/* 版本信息头部 */}
            {showMetadata && (
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2">
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge variant="secondary" className="text-sm flex-shrink-0">
                            v{version}
                        </Badge>
                        {releaseNote.date && (
                            <div className="flex items-center text-xs text-muted-foreground flex-shrink-0">
                                <Calendar className="w-3 h-3 mr-1 flex-shrink-0"/>
                                <span className="whitespace-nowrap">{releaseNote.date}</span>
                            </div>
                        )}
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleExternalLink(`https://github.com/chenqi92/inflowave/releases/tag/v${version}`)}
                        className="text-xs flex-shrink-0"
                    >
                        <ExternalLink className="w-3 h-3 mr-1"/>
                        <span className="whitespace-nowrap">GitHub</span>
                    </Button>
                </div>
            )}

            {/* 重点功能摘要 */}
            {releaseNote.highlights && releaseNote.highlights.length > 0 && (
                <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4 border border-blue-200 dark:border-blue-800 w-full min-w-0">
                    <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 flex-shrink-0"/>
                        <span className="truncate">本版本亮点</span>
                    </h4>
                    <ul className="space-y-1">
                        {releaseNote.highlights.map((highlight, index) => (
                            <li key={index} className="text-xs text-blue-700 dark:text-blue-300 break-words">
                                • {highlight.replace(/[🚀✨🎯]/gu, '').trim()}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* 功能分类摘要 */}
            {features && (
                <div className="grid grid-cols-2 gap-3 mb-4 w-full">
                    {features.newFeatures.length > 0 && (
                        <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-3 border border-green-200 dark:border-green-800 min-w-0">
                            <div className="flex items-center text-xs font-medium text-green-900 dark:text-green-100 mb-1 gap-1">
                                <Sparkles className="w-3 h-3 flex-shrink-0"/>
                                <span className="truncate">新功能 ({features.newFeatures.length})</span>
                            </div>
                        </div>
                    )}
                    {features.improvements.length > 0 && (
                        <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3 border border-blue-200 dark:border-blue-800 min-w-0">
                            <div className="flex items-center text-xs font-medium text-blue-900 dark:text-blue-100 mb-1 gap-1">
                                <Wrench className="w-3 h-3 flex-shrink-0"/>
                                <span className="truncate">改进优化 ({features.improvements.length})</span>
                            </div>
                        </div>
                    )}
                    {features.bugFixes.length > 0 && (
                        <div className="bg-red-50 dark:bg-red-950/30 rounded-lg p-3 border border-red-200 dark:border-red-800 min-w-0">
                            <div className="flex items-center text-xs font-medium text-red-900 dark:text-red-100 mb-1 gap-1">
                                <Bug className="w-3 h-3 flex-shrink-0"/>
                                <span className="truncate">错误修复 ({features.bugFixes.length})</span>
                            </div>
                        </div>
                    )}
                    {features.technicalChanges.length > 0 && (
                        <div className="bg-purple-50 dark:bg-purple-950/30 rounded-lg p-3 border border-purple-200 dark:border-purple-800 min-w-0">
                            <div className="flex items-center text-xs font-medium text-purple-900 dark:text-purple-100 mb-1 gap-1">
                                <Code className="w-3 h-3 flex-shrink-0"/>
                                <span className="truncate">技术改进 ({features.technicalChanges.length})</span>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* 发布说明内容 - 只有Markdown内容在可滚动区域中 */}
            <div
                style={{
                    height: maxHeight,
                    maxHeight,
                    scrollbarWidth: 'none', // Firefox
                    msOverflowStyle: 'none', // IE and Edge
                }}
                className="w-full min-w-0 overflow-y-scroll overflow-x-hidden border border-gray-200 dark:border-gray-700 rounded-md p-4 [&::-webkit-scrollbar]:hidden"
            >
                <div className="min-h-full w-full min-w-0">
                    <MarkdownRenderer
                        content={processContentForMarkdown(releaseNote.content)}
                        onInternalLinkClick={handleInternalLinkClick}
                        className="text-sm leading-relaxed break-words"
                    />
                </div>
            </div>
        </div>
    );
};