// 主题颜色配置
export interface ThemeColors {
  name: string;
  label: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  accent: string;
  accentForeground: string;
  muted: string;
  mutedForeground: string;
  destructive: string;
  destructiveForeground: string;
  success: string;
  successForeground: string;
  warning: string;
  warningForeground: string;
  ring: string;
}

// 预定义的主题颜色方案
export const themeColors: Record<string, ThemeColors> = {
  default: {
    name: 'default',
    label: '默认蓝色',
    primary: '221.2 83.2% 53.3%',
    primaryForeground: '210 40% 98%',
    secondary: '210 40% 94%',
    secondaryForeground: '222.2 84% 4.9%',
    accent: '217.2 32.6% 92%',
    accentForeground: '222.2 84% 4.9%',
    muted: '210 40% 96%',
    mutedForeground: '215.4 16.3% 46.9%',
    destructive: '0 84.2% 60.2%',
    destructiveForeground: '210 40% 98%',
    success: '142.1 76.2% 36.3%',
    successForeground: '210 40% 98%',
    warning: '32.6 94.6% 43.7%',
    warningForeground: '210 40% 98%',
    ring: '221.2 83.2% 53.3%',
  },
  shadcn: {
    name: 'shadcn',
    label: '极简黑',
    primary: '0 0% 9%',
    primaryForeground: '0 0% 98%',
    secondary: '0 0% 94%',
    secondaryForeground: '0 0% 9%',
    accent: '0 0% 92%',
    accentForeground: '0 0% 9%',
    muted: '0 0% 96%',
    mutedForeground: '0 0% 45%',
    destructive: '0 84.2% 60.2%',
    destructiveForeground: '0 0% 98%',
    success: '142.1 76.2% 36.3%',
    successForeground: '0 0% 98%',
    warning: '32.6 94.6% 43.7%',
    warningForeground: '0 0% 98%',
    ring: '0 0% 9%',
  },
  zinc: {
    name: 'zinc',
    label: '锌灰色',
    primary: '240 5.9% 10%',
    primaryForeground: '0 0% 98%',
    secondary: '240 4.8% 95.9%',
    secondaryForeground: '240 5.9% 10%',
    accent: '240 4.8% 95.9%',
    accentForeground: '240 5.9% 10%',
    muted: '240 4.8% 95.9%',
    mutedForeground: '240 3.8% 46.1%',
    destructive: '0 84.2% 60.2%',
    destructiveForeground: '0 0% 98%',
    success: '142.1 76.2% 36.3%',
    successForeground: '0 0% 98%',
    warning: '32.6 94.6% 43.7%',
    warningForeground: '0 0% 98%',
    ring: '240 5.9% 10%',
  },
  slate: {
    name: 'slate',
    label: '石板灰',
    primary: '215.4 16.3% 46.9%',
    primaryForeground: '210 40% 98%',
    secondary: '210 40% 96%',
    secondaryForeground: '222.2 84% 4.9%',
    accent: '210 40% 96%',
    accentForeground: '222.2 84% 4.9%',
    muted: '210 40% 96%',
    mutedForeground: '215.4 16.3% 46.9%',
    destructive: '0 84.2% 60.2%',
    destructiveForeground: '210 40% 98%',
    success: '142.1 76.2% 36.3%',
    successForeground: '210 40% 98%',
    warning: '32.6 94.6% 43.7%',
    warningForeground: '210 40% 98%',
    ring: '215.4 16.3% 46.9%',
  },
  indigo: {
    name: 'indigo',
    label: '靛蓝色',
    primary: '239.5 84.2% 67.1%',
    primaryForeground: '210 40% 98%',
    secondary: '246.1 77.2% 97.2%',
    secondaryForeground: '222.2 84% 4.9%',
    accent: '246.1 77.2% 97.2%',
    accentForeground: '222.2 84% 4.9%',
    muted: '246.1 77.2% 97.2%',
    mutedForeground: '215.4 16.3% 46.9%',
    destructive: '0 84.2% 60.2%',
    destructiveForeground: '210 40% 98%',
    success: '142.1 76.2% 36.3%',
    successForeground: '210 40% 98%',
    warning: '32.6 94.6% 43.7%',
    warningForeground: '210 40% 98%',
    ring: '239.5 84.2% 67.1%',
  },
  emerald: {
    name: 'emerald',
    label: '翡翠绿',
    primary: '160.1 84.1% 39.4%',
    primaryForeground: '210 40% 98%',
    secondary: '155.7 70.4% 96.3%',
    secondaryForeground: '222.2 84% 4.9%',
    accent: '155.7 70.4% 96.3%',
    accentForeground: '222.2 84% 4.9%',
    muted: '155.7 70.4% 96.3%',
    mutedForeground: '215.4 16.3% 46.9%',
    destructive: '0 84.2% 60.2%',
    destructiveForeground: '210 40% 98%',
    success: '160.1 84.1% 39.4%',
    successForeground: '210 40% 98%',
    warning: '32.6 94.6% 43.7%',
    warningForeground: '210 40% 98%',
    ring: '160.1 84.1% 39.4%',
  },
  blue: {
    name: 'blue',
    label: '经典蓝',
    primary: '214.3 31.8% 91.4%',
    primaryForeground: '222.2 84% 4.9%',
    secondary: '214.3 31.8% 91.4%',
    secondaryForeground: '222.2 84% 4.9%',
    accent: '214.3 31.8% 91.4%',
    accentForeground: '222.2 84% 4.9%',
    muted: '214.3 31.8% 91.4%',
    mutedForeground: '215.4 16.3% 46.9%',
    destructive: '0 84.2% 60.2%',
    destructiveForeground: '210 40% 98%',
    success: '142.1 76.2% 36.3%',
    successForeground: '210 40% 98%',
    warning: '32.6 94.6% 43.7%',
    warningForeground: '210 40% 98%',
    ring: '214.3 31.8% 91.4%',
  },
  green: {
    name: 'green',
    label: '自然绿色',
    primary: '142.1 76.2% 36.3%',
    primaryForeground: '210 40% 98%',
    secondary: '138.5 76.5% 96.7%',
    secondaryForeground: '222.2 84% 4.9%',
    accent: '138.5 76.5% 96.7%',
    accentForeground: '222.2 84% 4.9%',
    muted: '138.5 76.5% 96.7%',
    mutedForeground: '215.4 16.3% 46.9%',
    destructive: '0 84.2% 60.2%',
    destructiveForeground: '210 40% 98%',
    success: '142.1 76.2% 36.3%',
    successForeground: '210 40% 98%',
    warning: '32.6 94.6% 43.7%',
    warningForeground: '210 40% 98%',
    ring: '142.1 76.2% 36.3%',
  },
  red: {
    name: 'red',
    label: '活力红色',
    primary: '0 72.2% 50.6%',
    primaryForeground: '210 40% 98%',
    secondary: '0 85.7% 97.3%',
    secondaryForeground: '222.2 84% 4.9%',
    accent: '0 85.7% 97.3%',
    accentForeground: '222.2 84% 4.9%',
    muted: '0 85.7% 97.3%',
    mutedForeground: '215.4 16.3% 46.9%',
    destructive: '0 84.2% 60.2%',
    destructiveForeground: '210 40% 98%',
    success: '142.1 76.2% 36.3%',
    successForeground: '210 40% 98%',
    warning: '32.6 94.6% 43.7%',
    warningForeground: '210 40% 98%',
    ring: '0 72.2% 50.6%',
  },
  orange: {
    name: 'orange',
    label: '温暖橙色',
    primary: '24.6 95% 53.1%',
    primaryForeground: '210 40% 98%',
    secondary: '32.5 94.6% 95.7%',
    secondaryForeground: '222.2 84% 4.9%',
    accent: '32.5 94.6% 95.7%',
    accentForeground: '222.2 84% 4.9%',
    muted: '32.5 94.6% 95.7%',
    mutedForeground: '215.4 16.3% 46.9%',
    destructive: '0 84.2% 60.2%',
    destructiveForeground: '210 40% 98%',
    success: '142.1 76.2% 36.3%',
    successForeground: '210 40% 98%',
    warning: '32.6 94.6% 43.7%',
    warningForeground: '210 40% 98%',
    ring: '24.6 95% 53.1%',
  },
  purple: {
    name: 'purple',
    label: '优雅紫色',
    primary: '262.1 83.3% 57.8%',
    primaryForeground: '210 40% 98%',
    secondary: '270 95.2% 98%',
    secondaryForeground: '222.2 84% 4.9%',
    accent: '270 95.2% 98%',
    accentForeground: '222.2 84% 4.9%',
    muted: '270 95.2% 98%',
    mutedForeground: '215.4 16.3% 46.9%',
    destructive: '0 84.2% 60.2%',
    destructiveForeground: '210 40% 98%',
    success: '142.1 76.2% 36.3%',
    successForeground: '210 40% 98%',
    warning: '32.6 94.6% 43.7%',
    warningForeground: '210 40% 98%',
    ring: '262.1 83.3% 57.8%',
  },
  rose: {
    name: 'rose',
    label: '浪漫玫瑰',
    primary: '346.8 77.2% 49.8%',
    primaryForeground: '210 40% 98%',
    secondary: '355.7 100% 97.3%',
    secondaryForeground: '222.2 84% 4.9%',
    accent: '355.7 100% 97.3%',
    accentForeground: '222.2 84% 4.9%',
    muted: '355.7 100% 97.3%',
    mutedForeground: '215.4 16.3% 46.9%',
    destructive: '0 84.2% 60.2%',
    destructiveForeground: '210 40% 98%',
    success: '142.1 76.2% 36.3%',
    successForeground: '210 40% 98%',
    warning: '32.6 94.6% 43.7%',
    warningForeground: '210 40% 98%',
    ring: '346.8 77.2% 49.8%',
  },
  yellow: {
    name: 'yellow',
    label: '明亮黄色',
    primary: '47.9 95.8% 53.1%',
    primaryForeground: '26 83.3% 14.1%',
    secondary: '60 4.8% 95.9%',
    secondaryForeground: '222.2 84% 4.9%',
    accent: '60 4.8% 95.9%',
    accentForeground: '222.2 84% 4.9%',
    muted: '60 4.8% 95.9%',
    mutedForeground: '215.4 16.3% 46.9%',
    destructive: '0 84.2% 60.2%',
    destructiveForeground: '210 40% 98%',
    success: '142.1 76.2% 36.3%',
    successForeground: '210 40% 98%',
    warning: '32.6 94.6% 43.7%',
    warningForeground: '210 40% 98%',
    ring: '47.9 95.8% 53.1%',
  },
  violet: {
    name: 'violet',
    label: '神秘紫罗兰',
    primary: '262.1 83.3% 57.8%',
    primaryForeground: '210 40% 98%',
    secondary: '270 95.2% 98%',
    secondaryForeground: '222.2 84% 4.9%',
    accent: '270 95.2% 98%',
    accentForeground: '222.2 84% 4.9%',
    muted: '270 95.2% 98%',
    mutedForeground: '215.4 16.3% 46.9%',
    destructive: '0 84.2% 60.2%',
    destructiveForeground: '210 40% 98%',
    success: '142.1 76.2% 36.3%',
    successForeground: '210 40% 98%',
    warning: '32.6 94.6% 43.7%',
    warningForeground: '210 40% 98%',
    ring: '262.1 83.3% 57.8%',
  },
};

// 深色主题的颜色配置
export const darkThemeColors: Record<string, Partial<ThemeColors>> = {
  default: {
    primary: '217.2 91.2% 59.8%',
    primaryForeground: '222.2 84% 4.9%',
    secondary: '217.2 32.6% 17.5%',
    secondaryForeground: '210 40% 98%',
    accent: '217.2 32.6% 17.5%',
    accentForeground: '210 40% 98%',
    muted: '217.2 32.6% 17.5%',
    mutedForeground: '215 20.2% 65.1%',
    ring: '224.3 76.3% 94.1%',
  },
  shadcn: {
    primary: '0 0% 98%',
    primaryForeground: '0 0% 9%',
    secondary: '0 0% 14.9%',
    secondaryForeground: '0 0% 98%',
    accent: '0 0% 14.9%',
    accentForeground: '0 0% 98%',
    muted: '0 0% 14.9%',
    mutedForeground: '0 0% 63.9%',
    ring: '0 0% 98%',
  },
  zinc: {
    primary: '240 5.9% 90%',
    primaryForeground: '240 5.9% 10%',
    secondary: '240 3.7% 15.9%',
    secondaryForeground: '240 5.9% 90%',
    accent: '240 3.7% 15.9%',
    accentForeground: '240 5.9% 90%',
    muted: '240 3.7% 15.9%',
    mutedForeground: '240 5% 64.9%',
    ring: '240 5.9% 90%',
  },
  slate: {
    primary: '215.4 16.3% 56.9%',
    primaryForeground: '210 40% 98%',
    secondary: '217.2 32.6% 17.5%',
    secondaryForeground: '210 40% 98%',
    accent: '217.2 32.6% 17.5%',
    accentForeground: '210 40% 98%',
    muted: '217.2 32.6% 17.5%',
    mutedForeground: '215 20.2% 65.1%',
    ring: '215.4 16.3% 56.9%',
  },
  indigo: {
    primary: '239.5 58.8% 68.2%',
    primaryForeground: '210 40% 98%',
    secondary: '239.5 13% 15%',
    secondaryForeground: '210 40% 98%',
    accent: '239.5 13% 15%',
    accentForeground: '210 40% 98%',
    muted: '239.5 13% 15%',
    mutedForeground: '215 20.2% 65.1%',
    ring: '239.5 58.8% 68.2%',
  },
  emerald: {
    primary: '160.1 84.1% 39.4%',
    primaryForeground: '210 40% 98%',
    secondary: '160.1 13% 15%',
    secondaryForeground: '210 40% 98%',
    accent: '160.1 13% 15%',
    accentForeground: '210 40% 98%',
    muted: '160.1 13% 15%',
    mutedForeground: '215 20.2% 65.1%',
    ring: '160.1 84.1% 39.4%',
  },
  blue: {
    primary: '214.3 83.2% 64.7%',
    primaryForeground: '222.2 84% 4.9%',
    secondary: '214.3 13% 15%',
    secondaryForeground: '210 40% 98%',
    accent: '214.3 13% 15%',
    accentForeground: '210 40% 98%',
    muted: '214.3 13% 15%',
    mutedForeground: '215 20.2% 65.1%',
    ring: '214.3 83.2% 64.7%',
  },
  green: {
    primary: '142.1 70.6% 45.3%',
    primaryForeground: '144.9 80.4% 10%',
    secondary: '142.1 13% 15%',
    secondaryForeground: '210 40% 98%',
    accent: '142.1 13% 15%',
    accentForeground: '210 40% 98%',
    muted: '142.1 13% 15%',
    mutedForeground: '215 20.2% 65.1%',
    ring: '142.1 70.6% 45.3%',
  },
  red: {
    primary: '0 62.8% 50.6%',
    primaryForeground: '210 40% 98%',
    secondary: '0 13% 15%',
    secondaryForeground: '210 40% 98%',
    accent: '0 13% 15%',
    accentForeground: '210 40% 98%',
    muted: '0 13% 15%',
    mutedForeground: '215 20.2% 65.1%',
    ring: '0 62.8% 50.6%',
  },
  orange: {
    primary: '20.5 90.2% 48.2%',
    primaryForeground: '210 40% 98%',
    secondary: '20.5 13% 15%',
    secondaryForeground: '210 40% 98%',
    accent: '20.5 13% 15%',
    accentForeground: '210 40% 98%',
    muted: '20.5 13% 15%',
    mutedForeground: '215 20.2% 65.1%',
    ring: '20.5 90.2% 48.2%',
  },
  purple: {
    primary: '263.4 70% 50.4%',
    primaryForeground: '210 40% 98%',
    secondary: '263.4 13% 15%',
    secondaryForeground: '210 40% 98%',
    accent: '263.4 13% 15%',
    accentForeground: '210 40% 98%',
    muted: '263.4 13% 15%',
    mutedForeground: '215 20.2% 65.1%',
    ring: '263.4 70% 50.4%',
  },
  rose: {
    primary: '346.8 77.2% 49.8%',
    primaryForeground: '210 40% 98%',
    secondary: '346.8 13% 15%',
    secondaryForeground: '210 40% 98%',
    accent: '346.8 13% 15%',
    accentForeground: '210 40% 98%',
    muted: '346.8 13% 15%',
    mutedForeground: '215 20.2% 65.1%',
    ring: '346.8 77.2% 49.8%',
  },
  yellow: {
    primary: '47.9 95.8% 53.1%',
    primaryForeground: '26 83.3% 14.1%',
    secondary: '47.9 13% 15%',
    secondaryForeground: '210 40% 98%',
    accent: '47.9 13% 15%',
    accentForeground: '210 40% 98%',
    muted: '47.9 13% 15%',
    mutedForeground: '215 20.2% 65.1%',
    ring: '47.9 95.8% 53.1%',
  },
  violet: {
    primary: '262.1 83.3% 57.8%',
    primaryForeground: '210 40% 98%',
    secondary: '262.1 13% 15%',
    secondaryForeground: '210 40% 98%',
    accent: '262.1 13% 15%',
    accentForeground: '210 40% 98%',
    muted: '262.1 13% 15%',
    mutedForeground: '215 20.2% 65.1%',
    ring: '262.1 83.3% 57.8%',
  },
};

// 应用主题颜色到CSS变量
export function applyThemeColors(colorScheme: string, isDark: boolean = false) {
  const root = document.documentElement;
  const colors = themeColors[colorScheme];
  const darkColors = darkThemeColors[colorScheme];

  if (!colors) return;

  const finalColors =
    isDark && darkColors ? { ...colors, ...darkColors } : colors;

  // 应用颜色变量
  root.style.setProperty('--primary', finalColors.primary);
  root.style.setProperty('--primary-foreground', finalColors.primaryForeground);
  root.style.setProperty('--secondary', finalColors.secondary);
  root.style.setProperty(
    '--secondary-foreground',
    finalColors.secondaryForeground
  );
  root.style.setProperty('--accent', finalColors.accent);
  root.style.setProperty('--accent-foreground', finalColors.accentForeground);
  root.style.setProperty('--muted', finalColors.muted);
  root.style.setProperty('--muted-foreground', finalColors.mutedForeground);
  root.style.setProperty('--destructive', finalColors.destructive);
  root.style.setProperty(
    '--destructive-foreground',
    finalColors.destructiveForeground
  );
  root.style.setProperty('--success', finalColors.success);
  root.style.setProperty('--success-foreground', finalColors.successForeground);
  root.style.setProperty('--warning', finalColors.warning);
  root.style.setProperty('--warning-foreground', finalColors.warningForeground);
  root.style.setProperty('--ring', finalColors.ring);
}

// 获取主题颜色列表
export function getThemeColorOptions() {
  return Object.values(themeColors).map(color => ({
    value: color.name,
    label: color.label,
    primary: color.primary,
  }));
}
