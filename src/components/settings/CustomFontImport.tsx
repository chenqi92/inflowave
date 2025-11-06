/**
 * 自定义字体导入组件
 * 允许用户导入自己的字体文件
 */

import React, { useState } from 'react';
import { Upload, FileText, CheckCircle, XCircle, Info, HelpCircle } from 'lucide-react';
import { Button, Card } from '@/components/ui';
import { showMessage } from '@/utils/message';
import { safeTauriInvoke } from '@/utils/tauri';
import { useSettingsTranslation } from '@/hooks/useTranslation';

interface CustomFontImportProps {
  onFontImported?: () => void;
}

const CustomFontImport: React.FC<CustomFontImportProps> = ({ onFontImported }) => {
  const { t } = useSettingsTranslation();
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
        showMessage.success(t('font_import_success', { count: result.success }));
        onFontImported?.();
      }

      if (result.failed > 0) {
        showMessage.warning(t('font_import_failed', { count: result.failed }));
      }

    } catch (error) {
      console.error(t('font_import_error'), error);
      showMessage.error(t('font_import_error'));
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
          <h3 className="text-base font-semibold mb-1">{t('import_custom_font_title')}</h3>
          <p className="text-sm text-muted-foreground">
            {t('import_custom_font_desc')}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-start gap-2 text-sm text-muted-foreground">
          <Info className="w-4 h-4 mt-0.5 shrink-0" />
          <div className="space-y-1">
            <p>{t('supported_formats')}</p>
            <ul className="list-disc list-inside space-y-0.5 ml-2">
              <li>{t('truetype_font')}</li>
              <li>{t('opentype_font')}</li>
              <li>{t('web_font')}</li>
            </ul>
          </div>
        </div>

        <div className="flex items-start gap-2 text-sm text-muted-foreground">
          <HelpCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <div className="space-y-1">
            <p>{t('how_to_get_fonts')}</p>
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
                  {t('google_fonts')}
                </a>
                {' '}{t('google_fonts_desc')}
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
                  {t('github_fonts')}
                </a>
                {' '}{t('github_fonts_desc')}
              </li>
              <li>{t('system_fonts')}</li>
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
                {t('importing')}
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                {t('select_font_file')}
              </>
            )}
          </Button>
        </div>

        <div className="bg-muted/50 rounded-lg p-3 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <FileText className="w-4 h-4" />
            <span>{t('import_steps')}</span>
          </div>
          <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground ml-2">
            <li>{t('import_step_1')}</li>
            <li>{t('import_step_2')}</li>
            <li>{t('import_step_3')}</li>
            <li>{t('import_step_4')}</li>
            <li>{t('import_step_5')}</li>
          </ol>
        </div>

        <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
            <div className="text-sm text-blue-900 dark:text-blue-100">
              <p className="font-medium mb-1">{t('import_tip_title')}</p>
              <p className="text-blue-700 dark:text-blue-300">
                {t('import_tip_desc')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default CustomFontImport;

