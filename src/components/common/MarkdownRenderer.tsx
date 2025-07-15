import React from 'react';
import { cn } from '@/lib/utils';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className }) => {
  // 简单的 Markdown 解析器
  const parseMarkdown = (text: string): string => {
    let html = text;

    // 处理代码块
    html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
      return `<pre class="bg-muted p-4 rounded-lg overflow-x-auto my-4 max-w-full"><code class="text-sm whitespace-pre-wrap break-all">${code.trim()}</code></pre>`;
    });

    // 处理行内代码
    html = html.replace(/`([^`]+)`/g, '<code class="bg-muted px-1.5 py-0.5 rounded text-sm font-mono break-all">$1</code>');

    // 处理标题
    html = html.replace(/^### (.*$)/gm, '<h3 class="text-lg font-semibold mt-6 mb-3 text-foreground">$1</h3>');
    html = html.replace(/^## (.*$)/gm, '<h2 class="text-xl font-semibold mt-8 mb-4 text-foreground">$1</h2>');
    html = html.replace(/^# (.*$)/gm, '<h1 class="text-2xl font-bold mt-8 mb-6 text-foreground">$1</h1>');

    // 处理粗体
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>');

    // 处理斜体
    html = html.replace(/\*(.*?)\*/g, '<em class="italic">$1</em>');

    // 处理链接
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary hover:underline break-all" target="_blank" rel="noopener noreferrer">$1</a>');

    // 处理无序列表 - 改进的列表处理
    const listRegex = /^(- .+(?:\n- .+)*)/gm;
    html = html.replace(listRegex, (match) => {
      const items = match.split('\n').map(line => {
        if (line.startsWith('- ')) {
          return `<li class="mb-1">${line.substring(2)}</li>`;
        }
        return line;
      }).join('');
      return `<ul class="my-3 space-y-1 list-disc list-inside">${items}</ul>`;
    });

    // 处理有序列表 - 改进的有序列表处理
    const orderedListRegex = /^(\d+\. .+(?:\n\d+\. .+)*)/gm;
    html = html.replace(orderedListRegex, (match) => {
      const items = match.split('\n').map(line => {
        if (/^\d+\. /.test(line)) {
          return `<li class="mb-1">${line.replace(/^\d+\. /, '')}</li>`;
        }
        return line;
      }).join('');
      return `<ol class="my-3 space-y-1 list-decimal list-inside">${items}</ol>`;
    });

    // 处理表格 - 改进的表格处理
    const tableRegex = /(\|[^|\n]+\|(?:\n\|[^|\n]+\|)*)/g;
    html = html.replace(tableRegex, (match) => {
      const lines = match.trim().split('\n');
      if (lines.length < 2) return match;

      const headerLine = lines[0];
      const separatorLine = lines[1];
      const dataLines = lines.slice(2);

      // 检查是否是有效的表格格式
      if (!separatorLine.includes('---')) return match;

      // 处理表头
      const headerCells = headerLine.split('|').map(cell => cell.trim()).filter(cell => cell);
      const headerRow = `<tr class="bg-muted/50">${headerCells.map(cell =>
        `<th class="border border-border px-3 py-2 text-sm font-semibold text-left">${cell}</th>`
      ).join('')}</tr>`;

      // 处理数据行
      const dataRows = dataLines.map(line => {
        const cells = line.split('|').map(cell => cell.trim()).filter(cell => cell);
        return `<tr>${cells.map(cell =>
          `<td class="border border-border px-3 py-2 text-sm">${cell}</td>`
        ).join('')}</tr>`;
      }).join('');

      return `<div class="overflow-x-auto my-4">
        <table class="w-full min-w-full border-collapse border border-border rounded-lg overflow-hidden">
          <thead>${headerRow}</thead>
          <tbody>${dataRows}</tbody>
        </table>
      </div>`;
    });

    // 处理引用块
    html = html.replace(/^> (.*$)/gm, '<blockquote class="border-l-4 border-primary pl-4 py-2 my-4 bg-muted/50 italic">$1</blockquote>');

    // 处理分隔线
    html = html.replace(/^---$/gm, '<hr class="my-6 border-border" />');

    // 处理段落
    html = html.replace(/\n\n/g, '</p><p class="mb-4 text-foreground leading-relaxed break-words">');
    html = `<p class="mb-4 text-foreground leading-relaxed break-words">${html}</p>`;

    // 清理空段落
    html = html.replace(/<p class="mb-4 text-foreground leading-relaxed"><\/p>/g, '');

    return html;
  };

  return (
    <div
      className={cn(
        "prose prose-sm max-w-none w-full",
        "prose-headings:text-foreground prose-p:text-foreground",
        "prose-strong:text-foreground prose-code:text-foreground",
        "prose-pre:bg-muted prose-pre:border prose-pre:border-border prose-pre:overflow-x-auto",
        "prose-blockquote:border-l-primary prose-blockquote:bg-muted/50",
        "prose-table:border-border prose-th:border-border prose-td:border-border prose-table:table-auto prose-table:w-full",
        "prose-a:text-primary prose-a:no-underline hover:prose-a:underline",
        "prose-img:max-w-full prose-img:h-auto",
        "break-words overflow-wrap-anywhere",
        className
      )}
      dangerouslySetInnerHTML={{ __html: parseMarkdown(content) }}
    />
  );
};

export default MarkdownRenderer;
