/**
 * 语言包管理组件
 * 
 * 功能：
 * 1. 显示所有可用语言和翻译进度
 * 2. 启用/禁用语言
 * 3. 导出/导入语言包
 */

import React, { useState } from 'react';
import {
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Progress,
  Badge,
  Switch,
  Alert,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui';
import {
  Download,
  Upload,
  Plus,
  Trash2,
  Globe,
  Info,
  FileDown,
  FileUp,
} from 'lucide-react';
import { useI18nStore } from '@/i18n/store';
import { useSettingsTranslation, useCommonTranslation } from '@/hooks/useTranslation';
import { showMessage } from '@/utils/message';
import { saveJsonFile } from '@/utils/nativeDownload';
import type { LanguageInfo } from '@/i18n/types';
import logger from '@/utils/logger';

const LanguageManagement: React.FC = () => {
  const { t: tSettings } = useSettingsTranslation();
  const { t: tCommon } = useCommonTranslation();
  
  const {
    availableLanguages,
    currentLanguage,
    toggleLanguageEnabled,
    config,
  } = useI18nStore();

  const [selectedLanguage, setSelectedLanguage] = useState<string>('');

  /**
   * 切换语言启用状态
   */
  const handleToggleLanguage = (languageCode: string, enabled: boolean) => {
    // 不能禁用当前语言
    if (!enabled && languageCode === currentLanguage) {
      showMessage.warning(tSettings('cannot_disable_current_language'));
      return;
    }

    // 不能禁用默认语言
    if (!enabled && languageCode === config.fallbackLanguage) {
      showMessage.warning(tSettings('cannot_remove_default_language'));
      return;
    }

    // 更新语言状态
    toggleLanguageEnabled(languageCode, enabled);

    showMessage.success(
      enabled ? tSettings('language_enabled') : tSettings('language_disabled')
    );
  };

  /**
   * 导出语言包
   */
  const handleExportLanguage = async (languageCode: string) => {
    try {
      const language = availableLanguages.find(lang => lang.code === languageCode);
      if (!language) {
        showMessage.error(`${tCommon('error')}: Language not found`);
        return;
      }

      // 加载语言资源
      const namespaces = [
        'common',
        'navigation',
        'connections',
        'query',
        'settings',
        'errors',
        'visualization',
        'dateTime',
        'menu',
      ];

      const resources: Record<string, any> = {};

      for (const namespace of namespaces) {
        try {
          const response = await fetch(`/locales/${languageCode}/${namespace}.json`);
          if (response.ok) {
            resources[namespace] = await response.json();
          }
        } catch (error) {
          logger.warn(`Failed to load namespace ${namespace}:`, error);
        }
      }

      // 构建导出数据
      const exportData = {
        version: '1.0.0',
        exportTime: new Date().toISOString(),
        languageInfo: language,
        resources,
        metadata: {
          application: 'InfloWave',
          description: `Language pack for ${language.name}`,
        },
      };

      // 导出文件
      const success = await saveJsonFile(exportData, {
        filename: `inflowave-lang-${languageCode}-${new Date().toISOString().split('T')[0]}.json`,
        filters: [
          { name: tSettings('language_pack_format'), extensions: ['json'] },
          { name: tCommon('available'), extensions: ['*'] },
        ],
      });

      if (success) {
        showMessage.success(tSettings('language_pack_exported'));
      }
    } catch (error) {
      logger.error('Export language pack failed:', error);
      showMessage.error(`${tCommon('error')}: ${error}`);
    }
  };

  /**
   * 导出所有语言包
   */
  const handleExportAllLanguages = async () => {
    try {
      const allLanguagesData: Record<string, any> = {};

      for (const language of availableLanguages) {
        const namespaces = [
          'common',
          'navigation',
          'connections',
          'query',
          'settings',
          'errors',
          'visualization',
          'dateTime',
          'menu',
        ];

        const resources: Record<string, any> = {};

        for (const namespace of namespaces) {
          try {
            const response = await fetch(`/locales/${language.code}/${namespace}.json`);
            if (response.ok) {
              resources[namespace] = await response.json();
            }
          } catch (error) {
            logger.warn(`Failed to load namespace ${namespace} for ${language.code}:`, error);
          }
        }

        allLanguagesData[language.code] = {
          languageInfo: language,
          resources,
        };
      }

      // 构建导出数据
      const exportData = {
        version: '1.0.0',
        exportTime: new Date().toISOString(),
        languages: allLanguagesData,
        metadata: {
          application: 'InfloWave',
          description: 'All language packs',
        },
      };

      // 导出文件
      const success = await saveJsonFile(exportData, {
        filename: `inflowave-all-languages-${new Date().toISOString().split('T')[0]}.json`,
        filters: [
          { name: tSettings('language_pack_format'), extensions: ['json'] },
          { name: tCommon('available'), extensions: ['*'] },
        ],
      });

      if (success) {
        showMessage.success(tSettings('language_pack_exported'));
      }
    } catch (error) {
      logger.error('Export all languages failed:', error);
      showMessage.error(`${tCommon('error')}: ${error}`);
    }
  };

  /**
   * 导入语言包
   */
  const handleImportLanguage = async () => {
    try {
      // 创建文件输入元素
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';

      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;

        try {
          const text = await file.text();
          const data = JSON.parse(text);

          // 验证数据格式
          if (!data.languageInfo || !data.resources) {
            showMessage.error('Invalid language pack format');
            return;
          }

          // TODO: 实现语言包导入逻辑
          // 这需要将资源写入到 public/locales 目录
          // 在浏览器环境中无法直接写入文件系统
          // 需要通过 Tauri API 或服务器端点实现

          showMessage.info('Language pack import feature is under development');
        } catch (error) {
          logger.error('Import language pack failed:', error);
          showMessage.error(`${tCommon('error')}: ${error}`);
        }
      };

      input.click();
    } catch (error) {
      logger.error('Import language pack failed:', error);
      showMessage.error(`${tCommon('error')}: ${error}`);
    }
  };

  /**
   * 获取进度颜色类名
   */
  const getProgressColorClass = (progress: number): string => {
    if (progress >= 90) return 'text-green-500';
    if (progress >= 70) return 'text-yellow-500';
    if (progress >= 50) return 'text-orange-500';
    return 'text-red-500';
  };

  return (
    <div className='space-y-6'>
      {/* 页面标题 */}
      <div className='flex items-center gap-3 mb-4'>
        <Globe className='w-5 h-5 text-blue-600' />
        <div>
          <h2 className='text-[16px] font-semibold'>{tSettings('language_management')}</h2>
          <p className='text-[12px] text-muted-foreground'>
            {tSettings('language_management_description')}
          </p>
        </div>
      </div>

      {/* 操作按钮 */}
      <div className='flex gap-2 flex-wrap'>
        <div className='flex gap-2 flex-1'>
          <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
            <SelectTrigger className='w-[200px]'>
              <SelectValue placeholder={tSettings('select_language_to_export')} />
            </SelectTrigger>
            <SelectContent>
              {availableLanguages.map(lang => (
                <SelectItem key={lang.code} value={lang.code}>
                  {lang.flag} {lang.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant='outline'
            onClick={() => selectedLanguage && handleExportLanguage(selectedLanguage)}
            disabled={!selectedLanguage}
          >
            <FileDown className='w-4 h-4 mr-2' />
            {tSettings('export_language_pack')}
          </Button>
        </div>
        <Button variant='outline' onClick={handleExportAllLanguages}>
          <Download className='w-4 h-4 mr-2' />
          {tSettings('export_all_languages')}
        </Button>
        <Button variant='outline' onClick={handleImportLanguage}>
          <FileUp className='w-4 h-4 mr-2' />
          {tSettings('import_language_pack')}
        </Button>
      </div>

      {/* 提示信息 */}
      <Alert>
        <Info className='h-4 w-4' />
        <div>
          <h5 className='font-medium'>{tSettings('language_info')}</h5>
          <p className='text-sm text-muted-foreground mt-1'>
            • {tSettings('enable_language')}/{tSettings('disable_language')}：控制语言是否在语言选择器中显示
            <br />
            • {tSettings('export_language_pack')}：导出单个语言的所有翻译资源
            <br />
            • {tSettings('export_all_languages')}：导出所有语言的翻译资源
            <br />
            • {tSettings('import_language_pack')}：导入语言包（开发中）
          </p>
        </div>
      </Alert>

      {/* 语言列表表格 */}
      <div className='border rounded-lg'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className='w-[100px]'>{tSettings('language_code')}</TableHead>
              <TableHead>{tSettings('language_name')}</TableHead>
              <TableHead>{tSettings('native_name')}</TableHead>
              <TableHead className='w-[120px]'>{tSettings('text_direction')}</TableHead>
              <TableHead className='w-[200px]'>{tSettings('translation_progress')}</TableHead>
              <TableHead className='w-[100px]'>{tSettings('language_status')}</TableHead>
              <TableHead className='w-[120px] text-right'>{tCommon('edit')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {availableLanguages.map(language => (
              <TableRow key={language.code}>
                <TableCell className='font-mono text-sm'>
                  {language.flag} {language.code}
                </TableCell>
                <TableCell>{language.name}</TableCell>
                <TableCell>{language.nativeName}</TableCell>
                <TableCell>
                  <Badge variant='outline'>
                    {language.direction === 'ltr' ? tSettings('ltr') : tSettings('rtl')}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className='flex items-center gap-2'>
                    <Progress
                      value={language.progress}
                      className='flex-1'
                    />
                    <span className={`text-sm font-medium w-12 text-right ${getProgressColorClass(language.progress)}`}>
                      {language.progress}%
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={language.enabled ? 'default' : 'secondary'}>
                    {language.enabled ? tCommon('enabled') : tCommon('disabled')}
                  </Badge>
                </TableCell>
                <TableCell className='text-right'>
                  <div className='flex items-center justify-end gap-2'>
                    <Switch
                      checked={language.enabled}
                      onCheckedChange={checked => handleToggleLanguage(language.code, checked)}
                      disabled={
                        language.code === currentLanguage ||
                        language.code === config.fallbackLanguage
                      }
                    />
                    <Button
                      variant='ghost'
                      size='sm'
                      onClick={() => handleExportLanguage(language.code)}
                    >
                      <Download className='w-4 h-4' />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* 统计信息 */}
      <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
        <div className='p-4 border rounded-lg'>
          <div className='text-[12px] text-muted-foreground'>{tSettings('available_languages')}</div>
          <div className='text-[18px] font-semibold mt-1'>{availableLanguages.length}</div>
        </div>
        <div className='p-4 border rounded-lg'>
          <div className='text-[12px] text-muted-foreground'>{tCommon('enabled')}</div>
          <div className='text-[18px] font-semibold mt-1'>
            {availableLanguages.filter(lang => lang.enabled).length}
          </div>
        </div>
        <div className='p-4 border rounded-lg'>
          <div className='text-[12px] text-muted-foreground'>{tSettings('translation_progress')}</div>
          <div className='text-[18px] font-semibold mt-1'>
            {Math.round(
              availableLanguages.reduce((sum, lang) => sum + lang.progress, 0) /
                availableLanguages.length
            )}
            %
          </div>
        </div>
      </div>
    </div>
  );
};

export default LanguageManagement;
