/**
 * Hook to synchronize dayjs locale with i18n language
 * 
 * This hook ensures that dayjs locale is always in sync with the current i18n language,
 * so date formatting across the application remains consistent.
 */

import { useEffect } from 'react';
import dayjs from 'dayjs';
import { useI18nStore } from '@/i18n/store';

// Mapping of i18n language codes to dayjs locale codes
const DAYJS_LOCALE_MAP: Record<string, string> = {
  'zh-CN': 'zh-cn',
  'en-US': 'en',
};

/**
 * Hook to sync dayjs locale with i18n language
 */
export const useDayjsLocaleSync = () => {
  const currentLanguage = useI18nStore(state => state.currentLanguage);
  
  useEffect(() => {
    const dayjsLocale = DAYJS_LOCALE_MAP[currentLanguage] || 'zh-cn';
    
    try {
      dayjs.locale(dayjsLocale);
      console.log(`📅 [DayjsSync] Dayjs locale synced to: ${dayjsLocale}`);
    } catch (error) {
      console.warn(`⚠️ [DayjsSync] Failed to set dayjs locale to ${dayjsLocale}:`, error);
    }
  }, [currentLanguage]);
};
