import React from 'react';
import { cn } from '@/lib/utils';

interface MarkdownRendererProps {
  content: string;
  className?: string;
  onInternalLinkClick?: (filename: string) => void;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  className,
  onInternalLinkClick,
}) => {
  // 简单的 Markdown 解析器
  const parseMarkdown = (text: string): string => {
    let html = text;

    // 首先处理代码块，支持缩进的代码块
    // 处理带语言标识的代码块（支持缩进）
    html = html.replace(
      /^(\s*)```(\w+)\s*\n([\s\S]*?)\n\s*```/gm,
      (match, indent, lang, code) => {
        const escapedCode = code
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;');
        return `<pre class="bg-muted p-4 rounded-lg overflow-x-auto my-4 max-w-full"><code class="text-sm whitespace-pre-wrap break-all language-${lang}">${escapedCode.trim()}</code></pre>`;
      }
    );

    // 处理不带语言标识的代码块（支持缩进）
    html = html.replace(
      /^(\s*)```\s*\n([\s\S]*?)\n\s*```/gm,
      (match, indent, code) => {
        const escapedCode = code
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;');
        return `<pre class="bg-muted p-4 rounded-lg overflow-x-auto my-4 max-w-full"><code class="text-sm whitespace-pre-wrap break-all">${escapedCode.trim()}</code></pre>`;
      }
    );

    // 处理行内代码（避免与代码块冲突）
    html = html.replace(
      /(?<!`)`([^`\n]+)`(?!`)/g,
      '<code class="bg-muted px-1.5 py-0.5 rounded text-sm font-mono break-all">$1</code>'
    );

    // 处理标题（确保不在代码块内）
    html = html.replace(
      /^#### (.*$)/gm,
      '<h4 class="text-base font-semibold mt-4 mb-2 text-foreground">$1</h4>'
    );
    html = html.replace(
      /^### (.*$)/gm,
      '<h3 class="text-lg font-semibold mt-6 mb-3 text-foreground">$1</h3>'
    );
    html = html.replace(
      /^## (.*$)/gm,
      '<h2 class="text-xl font-semibold mt-8 mb-4 text-foreground">$1</h2>'
    );
    html = html.replace(
      /^# (.*$)/gm,
      '<h1 class="text-2xl font-bold mt-8 mb-6 text-foreground">$1</h1>'
    );

    // 处理粗体
    html = html.replace(
      /\*\*(.*?)\*\*/g,
      '<strong class="font-semibold">$1</strong>'
    );

    // 处理斜体
    html = html.replace(/\*(.*?)\*/g, '<em class="italic">$1</em>');

    // 处理链接 - 区分内部和外部链接
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, text, url) => {
      // 检查是否是内部文档链接
      if (url.startsWith('./') && url.endsWith('.md')) {
        const filename = url.replace('./', '');
        return `<a href="#" class="text-primary hover:underline break-all internal-link" data-filename="${filename}">${text}</a>`;
      }
      // 外部链接
      return `<a href="${url}" class="text-primary hover:underline break-all" target="_blank" rel="noopener noreferrer">${text}</a>`;
    });

    // 处理无序列表 - 改进的列表处理
    const listRegex = /^(- .+(?:\n- .+)*)/gm;
    html = html.replace(listRegex, match => {
      const items = match
        .split('\n')
        .map(line => {
          if (line.startsWith('- ')) {
            return `<li class="mb-1">${line.substring(2)}</li>`;
          }
          return line;
        })
        .join('');
      return `<ul class="my-3 space-y-1 list-disc list-inside">${items}</ul>`;
    });

    // 处理有序列表 - 改进的有序列表处理
    const orderedListRegex = /^(\d+\. .+(?:\n\d+\. .+)*)/gm;
    html = html.replace(orderedListRegex, match => {
      const items = match
        .split('\n')
        .map(line => {
          if (/^\d+\. /.test(line)) {
            return `<li class="mb-1">${line.replace(/^\d+\. /, '')}</li>`;
          }
          return line;
        })
        .join('');
      return `<ol class="my-3 space-y-1 list-decimal list-inside">${items}</ol>`;
    });

    // 处理表格 - 简化且可靠的方法，支持缩进
    const lines = html.split('\n');
    const processedLines = [];
    let i = 0;

    while (i < lines.length) {
      const currentLine = lines[i];
      const trimmedLine = currentLine.trim();

      // 检查是否是表格行（以|开头和结尾）
      if (trimmedLine.match(/^\|.*\|$/)) {
        // 检查下一行是否是分隔符
        if (i + 1 < lines.length) {
          const nextLine = lines[i + 1].trim();
          if (nextLine.match(/^\|[\s\-|:]+\|$/)) {
            // 找到表格，收集所有表格行
            const tableLines = [];
            let j = i;

            // 收集表格行
            while (j < lines.length) {
              const line = lines[j].trim();
              if (line.match(/^\|.*\|$/)) {
                tableLines.push(line);
                j++;
              } else {
                break;
              }
            }

            if (tableLines.length >= 2) {
              // 处理表格
              const headerLine = tableLines[0];
              const separatorLine = tableLines[1];
              const dataLines = tableLines.slice(2);

              // 解析表头
              const headerCells = headerLine
                .split('|')
                .map(cell => cell.trim())
                .filter(cell => cell);

              // 解析数据行
              const dataRows = dataLines
                .map(line => {
                  return line
                    .split('|')
                    .map(cell => cell.trim())
                    .filter(cell => cell);
                })
                .filter(row => row.length > 0);

              // 生成HTML
              const headerHtml = headerCells
                .map(
                  cell =>
                    `<th class="border border-border px-3 py-2 text-sm font-semibold text-left">${cell}</th>`
                )
                .join('');

              const bodyHtml = dataRows
                .map(
                  row =>
                    `<tr>${row
                      .map(
                        cell =>
                          `<td class="border border-border px-3 py-2 text-sm">${cell}</td>`
                      )
                      .join('')}</tr>`
                )
                .join('');

              const tableHtml = `<div class="overflow-x-auto my-4">
                <table class="w-full min-w-full border-collapse border border-border rounded-lg overflow-hidden">
                  <thead><tr class="bg-muted/50">${headerHtml}</tr></thead>
                  <tbody>${bodyHtml}</tbody>
                </table>
              </div>`;

              processedLines.push(tableHtml);
              i = j;
              continue;
            }
          }
        }
      }

      processedLines.push(currentLine);
      i++;
    }

    html = processedLines.join('\n');

    // 处理引用块
    html = html.replace(
      /^> (.*$)/gm,
      '<blockquote class="border-l-4 border-primary pl-4 py-2 my-4 bg-muted/50 italic">$1</blockquote>'
    );

    // 处理分隔线
    html = html.replace(/^---$/gm, '<hr class="my-6 border-border" />');

    // 处理段落
    html = html.replace(
      /\n\n/g,
      '</p><p class="mb-4 text-foreground leading-relaxed break-words">'
    );
    html = `<p class="mb-4 text-foreground leading-relaxed break-words">${html}</p>`;

    // 清理空段落
    html = html.replace(
      /<p class="mb-4 text-foreground leading-relaxed"><\/p>/g,
      ''
    );

    return html;
  };

  // 处理内部链接点击
  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.tagName === 'A' && target.classList.contains('internal-link')) {
      event.preventDefault();
      const filename = target.getAttribute('data-filename');
      if (filename && onInternalLinkClick) {
        onInternalLinkClick(filename);
      }
    }
  };

  return (
    <div
      className={cn(
        'prose prose-sm max-w-none w-full',
        'prose-headings:text-foreground prose-p:text-foreground',
        'prose-strong:text-foreground prose-code:text-foreground',
        'prose-pre:bg-muted prose-pre:border prose-pre:border-border prose-pre:overflow-x-auto',
        'prose-blockquote:border-l-primary prose-blockquote:bg-muted/50',
        'prose-table:border-border prose-th:border-border prose-td:border-border prose-table:table-auto prose-table:w-full',
        'prose-a:text-primary prose-a:no-underline hover:prose-a:underline',
        'prose-img:max-w-full prose-img:h-auto',
        'break-words overflow-wrap-anywhere',
        className
      )}
      onClick={handleClick}
      dangerouslySetInnerHTML={{ __html: parseMarkdown(content) }}
    />
  );
};

export default MarkdownRenderer;
