/**
 * 主题管理工具
 */

import i18n from 'i18next';
import type {
import logger from '@/utils/logger';
  ThemeConfig,
  ThemePreset,
  ThemeExportData,
  ThemeMode,
  ColorScheme,
  FontSize,
  BorderRadius,
} from '@/types/theme';
import { fontSizeMap, borderRadiusMap } from '@/types/theme';
import { applyThemeColors } from '@/lib/theme-colors';

/**
 * 主题管理器
 */
export class ThemeManager {
  private config: ThemeConfig;
  private presets: Map<string, ThemePreset> = new Map();
  private storageKey = 'inflowave_theme_config';
  private presetsStorageKey = 'inflowave_theme_presets';

  constructor() {
    this.config = this.getDefaultConfig();
    this.loadFromStorage();
    this.loadPresets();
  }

  /**
   * 获取默认配置
   */
  private getDefaultConfig(): ThemeConfig {
    return {
      mode: 'system',
      colorScheme: 'default',
      fontSize: 'base',
      borderRadius: 'md',
    };
  }

  /**
   * 获取当前配置
   */
  getConfig(): ThemeConfig {
    return { ...this.config };
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<ThemeConfig>): void {
    this.config = { ...this.config, ...config };
    this.applyConfig();
    this.saveToStorage();
  }

  /**
   * 设置主题模式
   */
  setMode(mode: ThemeMode): void {
    this.updateConfig({ mode });
  }

  /**
   * 设置颜色方案
   */
  setColorScheme(colorScheme: ColorScheme): void {
    this.updateConfig({ colorScheme });
  }

  /**
   * 设置字体大小
   */
  setFontSize(fontSize: FontSize): void {
    this.updateConfig({ fontSize });
  }

  /**
   * 设置圆角大小
   */
  setBorderRadius(borderRadius: BorderRadius): void {
    this.updateConfig({ borderRadius });
  }

  /**
   * 应用配置
   */
  private applyConfig(): void {
    const root = document.documentElement;

    // 应用字体大小
    root.style.fontSize = fontSizeMap[this.config.fontSize];

    // 应用圆角大小
    root.style.setProperty('--radius', borderRadiusMap[this.config.borderRadius]);

    // 应用颜色方案
    const isDark = this.getResolvedMode() === 'dark';
    applyThemeColors(this.config.colorScheme, isDark);

    // 如果有自定义颜色，应用自定义颜色
    if (this.config.customColors) {
      Object.entries(this.config.customColors).forEach(([key, value]) => {
        if (value) {
          const cssVar = `--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
          root.style.setProperty(cssVar, value);
        }
      });
    }
  }

  /**
   * 获取解析后的主题模式
   */
  private getResolvedMode(): 'light' | 'dark' {
    if (this.config.mode === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
    }
    return this.config.mode;
  }

  /**
   * 重置配置
   */
  reset(): void {
    this.config = this.getDefaultConfig();
    this.applyConfig();
    this.saveToStorage();
  }

  /**
   * 保存到本地存储
   */
  private saveToStorage(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.config));
    } catch (error) {
      logger.error(i18n.t('logs:theme.save_failed'), error);
    }
  }

  /**
   * 从本地存储加载
   */
  private loadFromStorage(): void {
    try {
      const data = localStorage.getItem(this.storageKey);
      if (data) {
        const config = JSON.parse(data) as ThemeConfig;
        this.config = { ...this.getDefaultConfig(), ...config };
        this.applyConfig();
      }
    } catch (error) {
      logger.error(i18n.t('logs:theme.load_failed'), error);
    }
  }

  /**
   * 导出配置
   */
  export(name?: string, description?: string): ThemeExportData {
    return {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      theme: this.config,
      name,
      description,
    };
  }

  /**
   * 导入配置
   */
  import(data: ThemeExportData): boolean {
    try {
      if (data.theme) {
        this.config = { ...this.getDefaultConfig(), ...data.theme };
        this.applyConfig();
        this.saveToStorage();
        return true;
      }
      return false;
    } catch (error) {
      logger.error(i18n.t('logs:theme.import_failed'), error);
      return false;
    }
  }

  /**
   * 添加预设
   */
  addPreset(preset: ThemePreset): void {
    this.presets.set(preset.id, preset);
    this.savePresets();
  }

  /**
   * 删除预设
   */
  deletePreset(id: string): boolean {
    if (this.presets.has(id)) {
      const preset = this.presets.get(id);
      if (preset?.builtin) {
        return false; // 不能删除内置预设
      }
      this.presets.delete(id);
      this.savePresets();
      return true;
    }
    return false;
  }

  /**
   * 获取预设
   */
  getPreset(id: string): ThemePreset | undefined {
    return this.presets.get(id);
  }

  /**
   * 获取所有预设
   */
  getAllPresets(): ThemePreset[] {
    return Array.from(this.presets.values());
  }

  /**
   * 应用预设
   */
  applyPreset(id: string): boolean {
    const preset = this.presets.get(id);
    if (preset) {
      this.config = { ...preset.config };
      this.applyConfig();
      this.saveToStorage();
      return true;
    }
    return false;
  }

  /**
   * 保存预设
   */
  private savePresets(): void {
    try {
      const customPresets = Array.from(this.presets.values()).filter(
        (p) => !p.builtin
      );
      localStorage.setItem(
        this.presetsStorageKey,
        JSON.stringify(customPresets)
      );
    } catch (error) {
      logger.error(i18n.t('logs:theme.preset_save_failed'), error);
    }
  }

  /**
   * 加载预设
   */
  private loadPresets(): void {
    // 加载内置预设
    this.loadBuiltinPresets();

    // 加载自定义预设
    try {
      const data = localStorage.getItem(this.presetsStorageKey);
      if (data) {
        const presets = JSON.parse(data) as ThemePreset[];
        presets.forEach((preset) => {
          this.presets.set(preset.id, preset);
        });
      }
    } catch (error) {
      logger.error(i18n.t('logs:theme.preset_load_failed'), error);
    }
  }

  /**
   * 加载内置预设
   */
  private loadBuiltinPresets(): void {
    const builtinPresets: ThemePreset[] = [
      {
        id: 'default-light',
        name: i18n.t('utils:theme.presets.default_light.name'),
        description: i18n.t('utils:theme.presets.default_light.description'),
        config: {
          mode: 'light',
          colorScheme: 'default',
          fontSize: 'base',
          borderRadius: 'md',
        },
        builtin: true,
      },
      {
        id: 'default-dark',
        name: i18n.t('utils:theme.presets.default_dark.name'),
        description: i18n.t('utils:theme.presets.default_dark.description'),
        config: {
          mode: 'dark',
          colorScheme: 'default',
          fontSize: 'base',
          borderRadius: 'md',
        },
        builtin: true,
      },
      {
        id: 'minimal',
        name: i18n.t('utils:theme.presets.minimal.name'),
        description: i18n.t('utils:theme.presets.minimal.description'),
        config: {
          mode: 'light',
          colorScheme: 'shadcn',
          fontSize: 'sm',
          borderRadius: 'sm',
        },
        builtin: true,
      },
      {
        id: 'modern',
        name: i18n.t('utils:theme.presets.modern.name'),
        description: i18n.t('utils:theme.presets.modern.description'),
        config: {
          mode: 'dark',
          colorScheme: 'zinc',
          fontSize: 'base',
          borderRadius: 'lg',
        },
        builtin: true,
      },
      {
        id: 'nature',
        name: i18n.t('utils:theme.presets.nature.name'),
        description: i18n.t('utils:theme.presets.nature.description'),
        config: {
          mode: 'light',
          colorScheme: 'emerald',
          fontSize: 'base',
          borderRadius: 'md',
        },
        builtin: true,
      },
    ];

    builtinPresets.forEach((preset) => {
      this.presets.set(preset.id, preset);
    });
  }
}

// 全局主题管理器实例
export const themeManager = new ThemeManager();

