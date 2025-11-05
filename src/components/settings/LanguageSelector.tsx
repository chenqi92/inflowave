/**
 * LanguageSelector Component
 * 
 * 功能：
 * 1. 提供增强的语言选择器，支持更多语言选项
 * 2. 显示语言信息（名称、本地名称、国旗等）
 * 3. 集成新的国际化系统
 * 
 * 需求: 1.2, 1.3, 4.1
 */

import React, { useMemo } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Label,
  Badge,
} from '@/components/ui';
import { useLanguageSwitcher } from '@/hooks/useLanguageSwitcher';
import { useTranslation } from '@/hooks/useTranslation';
import { Globe, Check, Loader2 } from 'lucide-react';
import type { LanguageInfo } from '@/i18n/types';

// ============================================================================
// 类型定义
// ============================================================================

export interface LanguageSelectorProps {
  value?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  showProgress?: boolean;
  showNativeName?: boolean;
  showFlag?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

// ============================================================================
// 语言信息渲染组件
// ============================================================================

interface LanguageItemProps {
  language: LanguageInfo;
  showProgress?: boolean;
  showNativeName?: boolean;
  showFlag?: boolean;
  isSelected?: boolean;
  compact?: boolean;
}

const LanguageItem: React.FC<LanguageItemProps> = ({
  language,
  showProgress = false,
  showNativeName = true,
  showFlag = true,
  isSelected = false,
  compact = false,
}) => {
  return (
    <div className={`flex items-center gap-2 ${compact ? 'py-1' : 'py-2'}`}>
      {/* 国旗图标 */}
      {showFlag && language.flag && (
        <span className="text-lg" role="img" aria-label={`${language.name} flag`}>
          {language.flag}
        </span>
      )}
      
      {/* 语言名称 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`font-medium ${compact ? 'text-sm' : 'text-base'}`}>
            {language.name}
          </span>
          {isSelected && <Check className="w-4 h-4 text-green-600" />}
        </div>
        
        {/* 本地名称 */}
        {showNativeName && language.nativeName !== language.name && (
          <div className={`text-muted-foreground ${compact ? 'text-xs' : 'text-sm'}`}>
            {language.nativeName}
          </div>
        )}
      </div>
      
      {/* 翻译进度 */}
      {showProgress && (
        <div className="flex items-center gap-1">
          <Badge 
            variant={language.progress >= 90 ? 'default' : language.progress >= 70 ? 'secondary' : 'outline'}
            className="text-xs"
          >
            {language.progress}%
          </Badge>
        </div>
      )}
      
      {/* 禁用状态指示 */}
      {!language.enabled && (
        <Badge variant="outline" className="text-xs">
          Disabled
        </Badge>
      )}
    </div>
  );
};

// ============================================================================
// 主组件
// ============================================================================

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  value,
  onValueChange,
  disabled = false,
  showProgress = false,
  showNativeName = true,
  showFlag = true,
  size = 'md',
  className = '',
}) => {
  const { t } = useTranslation('settings');
  const {
    currentLanguage,
    availableLanguages,
    isLoading,
    switchLanguage,
    getLanguageInfo,
  } = useLanguageSwitcher();

  // 当前选中的语言
  const selectedLanguage = value || currentLanguage;
  const selectedLanguageInfo = getLanguageInfo(selectedLanguage);

  // 启用的语言列表
  const enabledLanguages = useMemo(() => {
    return availableLanguages.filter(lang => lang.enabled);
  }, [availableLanguages]);

  // 处理语言切换
  const handleLanguageChange = async (languageCode: string) => {
    if (onValueChange) {
      onValueChange(languageCode);
    } else {
      try {
        await switchLanguage(languageCode);
      } catch (error) {
        console.error('Language switch failed:', error);
      }
    }
  };

  // 获取触发器高度
  const getTriggerHeight = () => {
    switch (size) {
      case 'sm': return 'h-8';
      case 'lg': return 'h-12';
      default: return 'h-9';
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <Label htmlFor="language-selector" className="flex items-center gap-2">
        <Globe className="w-4 h-4" />
        {t('language')}
      </Label>
      
      <Select
        value={selectedLanguage}
        onValueChange={handleLanguageChange}
        disabled={disabled || isLoading}
      >
        <SelectTrigger 
          id="language-selector"
          className={`${getTriggerHeight()} ${isLoading ? 'opacity-50' : ''}`}
        >
          <SelectValue>
            {isLoading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Loading...</span>
              </div>
            ) : selectedLanguageInfo ? (
              <LanguageItem
                language={selectedLanguageInfo}
                showProgress={false}
                showNativeName={showNativeName}
                showFlag={showFlag}
                compact={size === 'sm'}
              />
            ) : (
              t('select_language')
            )}
          </SelectValue>
        </SelectTrigger>
        
        <SelectContent>
          {enabledLanguages.map((language) => (
            <SelectItem 
              key={language.code} 
              value={language.code}
              className="cursor-pointer"
            >
              <LanguageItem
                language={language}
                showProgress={showProgress}
                showNativeName={showNativeName}
                showFlag={showFlag}
                isSelected={language.code === selectedLanguage}
                compact={false}
              />
            </SelectItem>
          ))}
          
          {/* 如果没有启用的语言，显示提示 */}
          {enabledLanguages.length === 0 && (
            <div className="px-2 py-4 text-center text-muted-foreground text-sm">
              No languages available
            </div>
          )}
        </SelectContent>
      </Select>
      
      {/* 语言信息提示 */}
      {selectedLanguageInfo && showProgress && (
        <div className="text-xs text-muted-foreground">
          Translation progress: {selectedLanguageInfo.progress}%
          {selectedLanguageInfo.progress < 100 && (
            <span className="ml-1">
              (Some text may appear in {availableLanguages.find(l => l.code === 'en-US')?.name || 'English'})
            </span>
          )}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 便捷组件
// ============================================================================

/**
 * 紧凑型语言选择器
 */
export const CompactLanguageSelector: React.FC<Omit<LanguageSelectorProps, 'size' | 'showProgress' | 'showNativeName'>> = (props) => {
  return (
    <LanguageSelector
      {...props}
      size="sm"
      showProgress={false}
      showNativeName={false}
    />
  );
};

/**
 * 详细语言选择器（显示所有信息）
 */
export const DetailedLanguageSelector: React.FC<Omit<LanguageSelectorProps, 'showProgress' | 'showNativeName' | 'showFlag'>> = (props) => {
  return (
    <LanguageSelector
      {...props}
      showProgress={true}
      showNativeName={true}
      showFlag={true}
    />
  );
};

/**
 * 内联语言切换器（用于工具栏等）
 */
export const InlineLanguageSwitcher: React.FC<{
  className?: string;
}> = ({ className = '' }) => {
  const { currentLanguage, switchToNext, getLanguageInfo } = useLanguageSwitcher();
  const currentLangInfo = getLanguageInfo(currentLanguage);

  return (
    <button
      onClick={switchToNext}
      className={`flex items-center gap-1 px-2 py-1 rounded hover:bg-muted transition-colors ${className}`}
      title="Switch Language"
    >
      {currentLangInfo?.flag && (
        <span className="text-sm">{currentLangInfo.flag}</span>
      )}
      <span className="text-xs font-medium">
        {currentLangInfo?.code.toUpperCase() || 'EN'}
      </span>
    </button>
  );
};

export default LanguageSelector;