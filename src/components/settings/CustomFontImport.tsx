/**
 * 自定义字体导入组件
 * 允许用户导入自己的字体文件
 */

import React, { useState } from 'react';
import { Upload, FileText, CheckCircle, XCircle, Info, HelpCircle } from 'lucide-react';
import { Button, Card } from '@/components/ui';
import { showMessage } from '@/utils/message';
import { safeTauriInvoke } from '@/utils/tauri';

interface CustomFontImportProps {
  onFontImported?: () => void;
}

const CustomFontImport: React.FC<CustomFontImportProps> = ({ onFontImported }) => {
  const [importing, setImporting] = useState(false);

  const handleImportFont = async () => {
    try {
      setImporting(true);

      // 使用 Tauri 文件对话框选择字体文件
      const { open } = await import('@tauri-apps/plugin-dialog');
      
      const selected = await open({
        multiple: true,
        filters: [{
          name: '字体文件',
          extensions: ['ttf', 'otf', 'woff', 'woff2']
        }]
      });

      if (!selected || (Array.isArray(selected) && selected.length === 0)) {
        setImporting(false);
        return;
      }

      const files = Array.isArray(selected) ? selected : [selected];
      
      // 导入字体文件
      const result = await safeTauriInvoke<{ success: number; failed: number }>('import_custom_fonts', {
        fontPaths: files
      });

      if (result.success > 0) {
        showMessage.success(`成功导入 ${result.success} 个字体文件`);
        onFontImported?.();
      }

      if (result.failed > 0) {
        showMessage.warning(`${result.failed} 个文件导入失败`);
      }

    } catch (error) {
      console.error('导入字体失败:', error);
      showMessage.error('导入字体失败');
    } finally {
      setImporting(false);
    }
  };

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Upload className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="text-base font-semibold mb-1">导入自定义字体</h3>
          <p className="text-sm text-muted-foreground">
            导入您喜欢的字体文件，在应用中使用
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-start gap-2 text-sm text-muted-foreground">
          <Info className="w-4 h-4 mt-0.5 shrink-0" />
          <div className="space-y-1">
            <p>支持的字体格式：</p>
            <ul className="list-disc list-inside space-y-0.5 ml-2">
              <li>TrueType 字体（.ttf）</li>
              <li>OpenType 字体（.otf）</li>
              <li>Web 字体（.woff, .woff2）</li>
            </ul>
          </div>
        </div>

        <div className="flex items-start gap-2 text-sm text-muted-foreground">
          <HelpCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <div className="space-y-1">
            <p>如何获取字体：</p>
            <ul className="list-disc list-inside space-y-0.5 ml-2">
              <li>
                <a 
                  href="#" 
                  onClick={(e) => {
                    e.preventDefault();
                    import('@/utils/externalLinks').then(({ openExternalLink }) => {
                      openExternalLink('https://fonts.google.com', {
                        showSuccessMessage: false,
                        showErrorMessage: true,
                      });
                    });
                  }}
                  className="text-primary hover:underline"
                >
                  Google Fonts
                </a>
                {' '}（免费、开源）
              </li>
              <li>
                <a 
                  href="#" 
                  onClick={(e) => {
                    e.preventDefault();
                    import('@/utils/externalLinks').then(({ openExternalLink }) => {
                      openExternalLink('https://github.com/topics/fonts', {
                        showSuccessMessage: false,
                        showErrorMessage: true,
                      });
                    });
                  }}
                  className="text-primary hover:underline"
                >
                  GitHub Fonts
                </a>
                {' '}（开源字体集合）
              </li>
              <li>系统已安装的字体文件</li>
            </ul>
          </div>
        </div>

        <div className="pt-2">
          <Button
            onClick={handleImportFont}
            disabled={importing}
            className="w-full"
          >
            {importing ? (
              <>
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                导入中...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                选择字体文件
              </>
            )}
          </Button>
        </div>

        <div className="bg-muted/50 rounded-lg p-3 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <FileText className="w-4 h-4" />
            <span>导入步骤</span>
          </div>
          <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground ml-2">
            <li>点击"选择字体文件"按钮</li>
            <li>选择一个或多个字体文件</li>
            <li>等待导入完成</li>
            <li>在字体选择器中找到新导入的字体</li>
            <li>选择并应用到应用界面</li>
          </ol>
        </div>

        <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
            <div className="text-sm text-blue-900 dark:text-blue-100">
              <p className="font-medium mb-1">提示</p>
              <p className="text-blue-700 dark:text-blue-300">
                导入的字体文件会保存在应用数据目录中，重启应用后仍然可用。
                如需删除已导入的字体，请在字体选择器中右键点击字体名称。
              </p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default CustomFontImport;

