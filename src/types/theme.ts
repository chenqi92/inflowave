/**
 * 主题类型定义
 */

/**
 * 主题模式
 */
export type ThemeMode = 'light' | 'dark' | 'system';

/**
 * 颜色方案
 */
export type ColorScheme =
  | 'default'
  | 'shadcn'
  | 'zinc'
  | 'slate'
  | 'indigo'
  | 'emerald'
  | 'blue'
  | 'green'
  | 'red'
  | 'orange'
  | 'purple'
  | 'rose'
  | 'yellow'
  | 'violet';

/**
 * 字体大小
 */
export type FontSize = 'xs' | 'sm' | 'base' | 'lg' | 'xl';

/**
 * 圆角大小
 */
export type BorderRadius = 'none' | 'sm' | 'md' | 'lg' | 'xl';

/**
 * 颜色值（HSL格式）
 */
export interface ColorValue {
  /** 色相 (0-360) */
  h: number;
  /** 饱和度 (0-100) */
  s: number;
  /** 亮度 (0-100) */
  l: number;
}

/**
 * 主题颜色配置
 */
export interface ThemeColors {
  /** 背景色 */
  background: string;
  /** 前景色 */
  foreground: string;
  /** 主色 */
  primary: string;
  /** 主色前景 */
  primaryForeground: string;
  /** 次要色 */
  secondary: string;
  /** 次要色前景 */
  secondaryForeground: string;
  /** 强调色 */
  accent: string;
  /** 强调色前景 */
  accentForeground: string;
  /** 柔和色 */
  muted: string;
  /** 柔和色前景 */
  mutedForeground: string;
  /** 卡片背景 */
  card: string;
  /** 卡片前景 */
  cardForeground: string;
  /** 弹出层背景 */
  popover: string;
  /** 弹出层前景 */
  popoverForeground: string;
  /** 边框色 */
  border: string;
  /** 输入框边框 */
  input: string;
  /** 焦点环 */
  ring: string;
  /** 破坏性操作色 */
  destructive: string;
  /** 破坏性操作前景 */
  destructiveForeground: string;
  /** 成功色 */
  success: string;
  /** 成功色前景 */
  successForeground: string;
  /** 警告色 */
  warning: string;
  /** 警告色前景 */
  warningForeground: string;
}

/**
 * 主题配置
 */
export interface ThemeConfig {
  /** 主题模式 */
  mode: ThemeMode;
  /** 颜色方案 */
  colorScheme: ColorScheme;
  /** 字体大小 */
  fontSize: FontSize;
  /** 圆角大小 */
  borderRadius: BorderRadius;
  /** 自定义颜色（可选） */
  customColors?: Partial<ThemeColors>;
}

/**
 * 主题预设
 */
export interface ThemePreset {
  /** 预设ID */
  id: string;
  /** 预设名称 */
  name: string;
  /** 预设描述 */
  description: string;
  /** 预设配置 */
  config: ThemeConfig;
  /** 预览图（可选） */
  preview?: string;
  /** 是否为内置预设 */
  builtin: boolean;
}

/**
 * 主题导出数据
 */
export interface ThemeExportData {
  /** 版本 */
  version: string;
  /** 导出时间 */
  exportedAt: string;
  /** 主题配置 */
  theme: ThemeConfig;
  /** 主题名称 */
  name?: string;
  /** 主题描述 */
  description?: string;
}

/**
 * 字体大小映射
 */
export const fontSizeMap: Record<FontSize, string> = {
  xs: '12px',
  sm: '14px',
  base: '16px',
  lg: '18px',
  xl: '20px',
};

/**
 * 圆角大小映射
 */
export const borderRadiusMap: Record<BorderRadius, string> = {
  none: '0',
  sm: '0.25rem',
  md: '0.5rem',
  lg: '0.75rem',
  xl: '1rem',
};

/**
 * 颜色方案信息
 */
export interface ColorSchemeInfo {
  /** 方案ID */
  id: ColorScheme;
  /** 显示名称 */
  label: string;
  /** 描述 */
  description: string;
  /** 主色预览 */
  primaryColor: string;
}

/**
 * 颜色方案列表
 */
export const colorSchemes: ColorSchemeInfo[] = [
  {
    id: 'default',
    label: '默认蓝色',
    description: '经典的蓝色主题',
    primaryColor: 'hsl(221.2, 83.2%, 53.3%)',
  },
  {
    id: 'shadcn',
    label: '极简黑',
    description: '简约的黑白主题',
    primaryColor: 'hsl(0, 0%, 98%)',
  },
  {
    id: 'zinc',
    label: '锌灰色',
    description: '现代的灰色主题',
    primaryColor: 'hsl(240, 5.9%, 10%)',
  },
  {
    id: 'slate',
    label: '石板灰',
    description: '优雅的石板灰主题',
    primaryColor: 'hsl(215.4, 16.3%, 46.9%)',
  },
  {
    id: 'indigo',
    label: '靛蓝色',
    description: '深邃的靛蓝主题',
    primaryColor: 'hsl(239, 84%, 67%)',
  },
  {
    id: 'emerald',
    label: '翡翠绿',
    description: '清新的绿色主题',
    primaryColor: 'hsl(142.1, 76.2%, 36.3%)',
  },
  {
    id: 'blue',
    label: '经典蓝',
    description: '传统的蓝色主题',
    primaryColor: 'hsl(221.2, 83.2%, 53.3%)',
  },
  {
    id: 'green',
    label: '自然绿',
    description: '自然的绿色主题',
    primaryColor: 'hsl(142.1, 76.2%, 36.3%)',
  },
  {
    id: 'red',
    label: '活力红',
    description: '充满活力的红色主题',
    primaryColor: 'hsl(0, 84.2%, 60.2%)',
  },
  {
    id: 'orange',
    label: '温暖橙',
    description: '温暖的橙色主题',
    primaryColor: 'hsl(24.6, 95%, 53.1%)',
  },
  {
    id: 'purple',
    label: '优雅紫',
    description: '优雅的紫色主题',
    primaryColor: 'hsl(262.1, 83.3%, 57.8%)',
  },
  {
    id: 'rose',
    label: '浪漫玫瑰',
    description: '浪漫的玫瑰色主题',
    primaryColor: 'hsl(346.8, 77.2%, 49.8%)',
  },
  {
    id: 'yellow',
    label: '明亮黄',
    description: '明亮的黄色主题',
    primaryColor: 'hsl(47.9, 95.8%, 53.1%)',
  },
  {
    id: 'violet',
    label: '神秘紫罗兰',
    description: '神秘的紫罗兰主题',
    primaryColor: 'hsl(262.1, 83.3%, 57.8%)',
  },
];

