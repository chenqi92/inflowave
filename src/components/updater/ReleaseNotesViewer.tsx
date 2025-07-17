/**
 * 发布说明查看器组件
 */

import React, { useState, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
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
import { releaseNotesService, ReleaseNote, VersionFeatures } from '@/services/releaseNotesService';
import { toast } from 'sonner';

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
      console.error('Failed to load release notes:', error);
      setError('加载发布说明失败');
      toast.error('加载发布说明失败');
    } finally {
      setLoading(false);
    }
  };

  const handleExternalLink = (url: string) => {
    if (onExternalLink) {
      onExternalLink(url);
    } else {
      window.open(url, '_blank');
    }
  };

  const formatReleaseContent = (content: string) => {
    // 简单的 Markdown 到 JSX 转换
    const lines = content.split('\n');
    const elements: React.ReactNode[] = [];
    let listItems: string[] = [];
    let currentIndex = 0;

    const flushListItems = () => {
      if (listItems.length > 0) {
        elements.push(
          <ul key={`list-${currentIndex++}`} className="list-disc list-inside space-y-1 my-3 text-sm text-muted-foreground">
            {listItems.map((item, index) => (
              <li key={index} className="ml-2">{item}</li>
            ))}
          </ul>
        );
        listItems = [];
      }
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line === '') {
        continue;
      }

      if (line.startsWith('### ')) {
        flushListItems();
        elements.push(
          <h3 key={`h3-${currentIndex++}`} className="text-lg font-semibold mt-6 mb-3 text-foreground flex items-center gap-2">
            {getIconForSection(line)}
            {line.replace('### ', '')}
          </h3>
        );
      } else if (line.startsWith('## ')) {
        flushListItems();
        elements.push(
          <h2 key={`h2-${currentIndex++}`} className="text-xl font-bold mt-6 mb-4 text-foreground flex items-center gap-2">
            {getIconForSection(line)}
            {line.replace('## ', '')}
          </h2>
        );
      } else if (line.startsWith('# ')) {
        flushListItems();
        if (showTitle) {
          elements.push(
            <h1 key={`h1-${currentIndex++}`} className="text-2xl font-bold mb-4 text-foreground">
              {line.replace('# ', '')}
            </h1>
          );
        }
      } else if (line.startsWith('- ') || line.startsWith('* ')) {
        listItems.push(line.substring(2));
      } else if (line.startsWith('---')) {
        flushListItems();
        elements.push(<Separator key={`sep-${currentIndex++}`} className="my-4" />);
      } else if (line.length > 0) {
        flushListItems();
        elements.push(
          <p key={`p-${currentIndex++}`} className="text-sm text-muted-foreground mb-2 leading-relaxed">
            {formatInlineElements(line)}
          </p>
        );
      }
    }

    flushListItems();
    return elements;
  };

  const formatInlineElements = (text: string): React.ReactNode => {
    // 处理粗体文本
    return text.replace(/\*\*(.*?)\*\*/g, (match, content) => content);
  };

  const getIconForSection = (sectionTitle: string) => {
    const title = sectionTitle.toLowerCase();
    
    if (title.includes('新功能') || title.includes('new') || title.includes('feature') || title.includes('🚀') || title.includes('✨')) {
      return <Sparkles className="w-5 h-5 text-blue-500" />;
    }
    if (title.includes('改进') || title.includes('优化') || title.includes('improve') || title.includes('enhance') || title.includes('🛠️')) {
      return <Wrench className="w-5 h-5 text-green-500" />;
    }
    if (title.includes('修复') || title.includes('bug') || title.includes('fix') || title.includes('🐛')) {
      return <Bug className="w-5 h-5 text-red-500" />;
    }
    if (title.includes('技术') || title.includes('technical') || title.includes('🔧')) {
      return <Code className="w-5 h-5 text-purple-500" />;
    }
    
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        <span className="text-sm text-muted-foreground">加载发布说明中...</span>
      </div>
    );
  }

  if (error || !releaseNote) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <AlertCircle className="w-8 h-8 text-muted-foreground mb-2" />
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
    <div className="space-y-4">
      {/* 版本信息头部 */}
      {showMetadata && (
        <div className="flex items-center justify-between pb-2">
          <div className="flex items-center space-x-2">
            <Badge variant="secondary" className="text-sm">
              v{version}
            </Badge>
            {releaseNote.date && (
              <div className="flex items-center text-xs text-muted-foreground">
                <Calendar className="w-3 h-3 mr-1" />
                {releaseNote.date}
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleExternalLink(`https://github.com/chenqi92/inflowave/releases/tag/v${version}`)}
            className="text-xs"
          >
            <ExternalLink className="w-3 h-3 mr-1" />
            GitHub
          </Button>
        </div>
      )}

      {/* 重点功能摘要 */}
      {releaseNote.highlights && releaseNote.highlights.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
          <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2 flex items-center">
            <Sparkles className="w-4 h-4 mr-2" />
            本版本亮点
          </h4>
          <ul className="space-y-1">
            {releaseNote.highlights.map((highlight, index) => (
              <li key={index} className="text-xs text-blue-700 dark:text-blue-300">
                • {highlight.replace(/[🚀✨🎯]/g, '').trim()}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 功能分类摘要 */}
      {features && (
        <div className="grid grid-cols-2 gap-3 mb-4">
          {features.newFeatures.length > 0 && (
            <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-3 border border-green-200 dark:border-green-800">
              <div className="flex items-center text-xs font-medium text-green-900 dark:text-green-100 mb-1">
                <Sparkles className="w-3 h-3 mr-1" />
                新功能 ({features.newFeatures.length})
              </div>
            </div>
          )}
          {features.improvements.length > 0 && (
            <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
              <div className="flex items-center text-xs font-medium text-blue-900 dark:text-blue-100 mb-1">
                <Wrench className="w-3 h-3 mr-1" />
                改进优化 ({features.improvements.length})
              </div>
            </div>
          )}
          {features.bugFixes.length > 0 && (
            <div className="bg-red-50 dark:bg-red-950/30 rounded-lg p-3 border border-red-200 dark:border-red-800">
              <div className="flex items-center text-xs font-medium text-red-900 dark:text-red-100 mb-1">
                <Bug className="w-3 h-3 mr-1" />
                错误修复 ({features.bugFixes.length})
              </div>
            </div>
          )}
          {features.technicalChanges.length > 0 && (
            <div className="bg-purple-50 dark:bg-purple-950/30 rounded-lg p-3 border border-purple-200 dark:border-purple-800">
              <div className="flex items-center text-xs font-medium text-purple-900 dark:text-purple-100 mb-1">
                <Code className="w-3 h-3 mr-1" />
                技术改进 ({features.technicalChanges.length})
              </div>
            </div>
          )}
        </div>
      )}

      {/* 发布说明内容 */}
      <ScrollArea style={{ maxHeight }} className="w-full">
        <div className="pr-4">
          {formatReleaseContent(releaseNote.content)}
        </div>
      </ScrollArea>
    </div>
  );
};