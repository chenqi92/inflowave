/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      /**
       * 字体大小 - 14px 基准
       * xs (12px): 辅助文本、描述
       * sm (13px): 次要内容、表格
       * base (14px): 正文、按钮、标签
       * lg (16px): 区块标题
       * xl (18px): 页面标题
       */
      fontSize: {
        'xs': ['12px', { lineHeight: '1.35' }],
        'sm': ['13px', { lineHeight: '1.4' }],
        'base': ['14px', { lineHeight: '1.5' }],
        'lg': ['16px', { lineHeight: '1.35' }],
        'xl': ['18px', { lineHeight: '1.25' }],
        '2xl': ['20px', { lineHeight: '1.2' }],
      },
      /**
       * 间距系统 - 4px 网格
       * 常用: 1(4px), 2(8px), 3(12px), 4(16px)
       */
      spacing: {
        '0.5': '2px',
        '1': '4px',
        '1.5': '6px',
        '2': '8px',
        '2.5': '10px',
        '3': '12px',
        '4': '16px',
        '5': '20px',
        '6': '24px',
        '7': '28px',
        '8': '32px',
        '9': '36px',
        '10': '40px',
        '12': '48px',
      },
      /**
       * 圆角 - 桌面应用风格
       * sm(2px): checkbox | DEFAULT(4px): 按钮/输入框 | md(6px): 对话框
       */
      borderRadius: {
        'none': '0',
        'sm': '2px',
        'DEFAULT': '4px',
        'md': '6px',
        'lg': '8px',
        'xl': '12px',
        'full': '9999px',
      },
      // JetBrains 过渡时长 - 更快的响应
      transitionDuration: {
        '50': '50ms',
        '100': '100ms',
        '150': '150ms',
        '200': '200ms',
      },
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        success: {
          DEFAULT: 'hsl(var(--success))',
          foreground: 'hsl(var(--success-foreground))',
        },
        warning: {
          DEFAULT: 'hsl(var(--warning))',
          foreground: 'hsl(var(--warning-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        // JetBrains 主题色
        jb: {
          'bg-base': 'var(--jb-bg-base)',
          'bg-subtle': 'var(--jb-bg-subtle)',
          'bg-muted': 'var(--jb-bg-muted)',
          'bg-emphasis': 'var(--jb-bg-emphasis)',
          'fg-default': 'var(--jb-fg-default)',
          'fg-muted': 'var(--jb-fg-muted)',
          'fg-subtle': 'var(--jb-fg-subtle)',
          'border-default': 'var(--jb-border-default)',
          'border-muted': 'var(--jb-border-muted)',
          'border-emphasis': 'var(--jb-border-emphasis)',
          'accent': 'var(--jb-accent-default)',
          'accent-emphasis': 'var(--jb-accent-emphasis)',
          'accent-muted': 'var(--jb-accent-muted)',
          'accent-subtle': 'var(--jb-accent-subtle)',
        },
      },
      fontFamily: {
        // 使用 CSS 变量支持动态字体切换
        sans: [
          'var(--font-family)',
          '-apple-system',
          'BlinkMacSystemFont',
          'system-ui',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
        mono: [
          'var(--font-family-mono, "JetBrains Mono")',
          'SF Mono',
          'Fira Code',
          'Cascadia Code',
          'Consolas',
          'Monaco',
          'Liberation Mono',
          'Courier New',
          'monospace',
        ],
      },
      keyframes: {
        'accordion-down': {
          from: {
            height: '0',
          },
          to: {
            height: 'var(--radix-accordion-content-height)',
          },
        },
        'accordion-up': {
          from: {
            height: 'var(--radix-accordion-content-height)',
          },
          to: {
            height: '0',
          },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.15s ease-out',
        'accordion-up': 'accordion-up 0.15s ease-out',
      },
      // JetBrains 阴影
      boxShadow: {
        'sm': '0 1px 2px rgba(0, 0, 0, 0.06)',
        'DEFAULT': '0 2px 4px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04)',
        'md': '0 2px 4px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04)',
        'lg': '0 4px 12px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06)',
        'xl': '0 8px 24px rgba(0, 0, 0, 0.12), 0 4px 8px rgba(0, 0, 0, 0.08)',
      },
    },
  },
  plugins: [
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('tailwindcss-animate')
  ],
};
