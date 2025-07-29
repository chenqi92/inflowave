import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import FontPreview from './FontPreview';
import { useFontLoader } from '@/hooks/useFontLoader';

interface FontOption {
  value: string;
  name: string;
  fontFamily: string;
  category: string;
}

interface CustomFontSelectorProps {
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
}

const fontOptions: FontOption[] = [
  // 系统字体
  {
    value: 'system',
    name: '系统默认',
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    category: 'system'
  },
  
  // 现代无衬线字体 - 本地下载的字体
  {
    value: 'inter',
    name: 'Inter',
    fontFamily: '"Inter", sans-serif',
    category: 'modern'
  },
  {
    value: 'roboto',
    name: 'Roboto', 
    fontFamily: '"Roboto", sans-serif',
    category: 'modern'
  },
  {
    value: 'open-sans',
    name: 'Open Sans',
    fontFamily: '"Open Sans", sans-serif',
    category: 'modern'
  },
  {
    value: 'source-sans',
    name: 'Source Sans Pro',
    fontFamily: '"Source Sans Pro", sans-serif',
    category: 'modern'
  },
  {
    value: 'lato',
    name: 'Lato',
    fontFamily: '"Lato", sans-serif',
    category: 'modern'
  },
  {
    value: 'nunito',
    name: 'Nunito',
    fontFamily: '"Nunito", sans-serif',
    category: 'modern'
  },
  {
    value: 'poppins',
    name: 'Poppins',
    fontFamily: '"Poppins", sans-serif',
    category: 'modern'
  },
  {
    value: 'montserrat',
    name: 'Montserrat',
    fontFamily: '"Montserrat", sans-serif',
    category: 'modern'
  },
  {
    value: 'fira-sans',
    name: 'Fira Sans',
    fontFamily: '"Fira Sans", sans-serif',
    category: 'modern'
  },
  {
    value: 'noto-sans',
    name: 'Noto Sans',
    fontFamily: '"Noto Sans", sans-serif',
    category: 'modern'
  },
  {
    value: 'ubuntu',
    name: 'Ubuntu',
    fontFamily: '"Ubuntu", sans-serif',
    category: 'modern'
  },
  {
    value: 'work-sans',
    name: 'Work Sans',
    fontFamily: '"Work Sans", sans-serif',
    category: 'modern'
  },
  {
    value: 'dm-sans',
    name: 'DM Sans',
    fontFamily: '"DM Sans", sans-serif',
    category: 'modern'
  },
  {
    value: 'plus-jakarta-sans',
    name: 'Plus Jakarta Sans',
    fontFamily: '"Plus Jakarta Sans", sans-serif',
    category: 'modern'
  },
  {
    value: 'manrope',
    name: 'Manrope',
    fontFamily: '"Manrope", sans-serif',
    category: 'modern'
  },
  {
    value: 'space-grotesk',
    name: 'Space Grotesk',
    fontFamily: '"Space Grotesk", sans-serif',
    category: 'modern'
  },
  {
    value: 'outfit',
    name: 'Outfit',
    fontFamily: '"Outfit", sans-serif',
    category: 'modern'
  },
  {
    value: 'lexend',
    name: 'Lexend',
    fontFamily: '"Lexend", sans-serif',
    category: 'modern'
  },
  {
    value: 'be-vietnam-pro',
    name: 'Be Vietnam Pro',
    fontFamily: '"Be Vietnam Pro", sans-serif',
    category: 'modern'
  },
  
  // 经典系统字体 - 这些是操作系统自带的
  {
    value: 'georgia',
    name: 'Georgia',
    fontFamily: 'Georgia, serif',
    category: 'classic'
  },
  {
    value: 'times',
    name: 'Times New Roman',
    fontFamily: '"Times New Roman", serif',
    category: 'classic'
  },
  {
    value: 'arial',
    name: 'Arial',
    fontFamily: 'Arial, sans-serif',
    category: 'classic'
  },
  {
    value: 'helvetica',
    name: 'Helvetica',
    fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
    category: 'classic'
  },
  {
    value: 'verdana',
    name: 'Verdana',
    fontFamily: 'Verdana, sans-serif',
    category: 'classic'
  },
  
  // 等宽字体 - 本地下载的等宽字体
  {
    value: 'fira-code',
    name: 'Fira Code',
    fontFamily: '"Fira Code", monospace',
    category: 'mono'
  },
  {
    value: 'jetbrains-mono',
    name: 'JetBrains Mono',
    fontFamily: '"JetBrains Mono", monospace',
    category: 'mono'
  },
  {
    value: 'source-code-pro',
    name: 'Source Code Pro',
    fontFamily: '"Source Code Pro", monospace',
    category: 'mono'
  },
  {
    value: 'inconsolata',
    name: 'Inconsolata',
    fontFamily: '"Inconsolata", monospace',
    category: 'mono'
  },
  {
    value: 'roboto-mono',
    name: 'Roboto Mono',
    fontFamily: '"Roboto Mono", monospace',
    category: 'mono'
  },
  {
    value: 'ubuntu-mono',
    name: 'Ubuntu Mono',
    fontFamily: '"Ubuntu Mono", monospace',
    category: 'mono'
  },
  {
    value: 'sf-mono',
    name: 'SF Mono / Consolas',
    fontFamily: 'ui-monospace, "SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    category: 'mono'
  },
  {
    value: 'courier',
    name: 'Courier New',
    fontFamily: '"Courier New", Courier, monospace',
    category: 'mono'
  }
];

const categoryLabels = {
  system: '系统字体',
  modern: '现代无衬线字体',
  classic: '经典字体',
  mono: '等宽字体'
};

const CustomFontSelector: React.FC<CustomFontSelectorProps> = ({
  value,
  onValueChange,
  className
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selectedFont = fontOptions.find(font => font.value === value);

  // 使用字体加载器来确保字体已加载 - 使用 useMemo 确保数组稳定性
  const fontFamilies = useMemo(() =>
    fontOptions.map(font => font.name).filter(name => name !== '系统默认'),
    [] // 空依赖数组，因为 fontOptions 是静态的
  );
  const fontStatus = useFontLoader(fontFamilies);

  // 按分类分组字体
  const groupedFonts = fontOptions.reduce((groups, font) => {
    if (!groups[font.category]) {
      groups[font.category] = [];
    }
    groups[font.category].push(font);
    return groups;
  }, {} as Record<string, FontOption[]>);

  // 点击外部关闭下拉框
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // 键盘导航
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;

      switch (event.key) {
        case 'Escape':
          setIsOpen(false);
          break;
        case 'ArrowDown':
          event.preventDefault();
          setHighlightedIndex(prev => 
            prev < fontOptions.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          event.preventDefault();
          setHighlightedIndex(prev => 
            prev > 0 ? prev - 1 : fontOptions.length - 1
          );
          break;
        case 'Enter':
          event.preventDefault();
          if (highlightedIndex >= 0) {
            onValueChange(fontOptions[highlightedIndex].value);
            setIsOpen(false);
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, highlightedIndex, onValueChange]);

  const handleOptionClick = (fontValue: string) => {
    onValueChange(fontValue);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* 触发器 */}
      <button
        type="button"
        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span className="truncate">
          {selectedFont ? selectedFont.name : '选择字体系列'}
        </span>
        <ChevronDown className={cn(
          "h-4 w-4 opacity-50 transition-transform",
          isOpen && "rotate-180"
        )} />
      </button>

      {/* 下拉内容 */}
      {isOpen && (
        !fontStatus.loaded ? (
          <div className="absolute top-full left-0 z-50 w-full mt-1 p-3 rounded-md border bg-popover text-popover-foreground shadow-md">
            <div className="text-sm text-muted-foreground">
              {fontStatus.error ? '字体加载失败' : '正在加载字体...'}
            </div>
          </div>
        ) : (
        <div 
          ref={listRef}
          className="absolute top-full left-0 z-50 w-full mt-1 max-h-[300px] overflow-y-auto rounded-md border bg-popover text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95"
          role="listbox"
        >
          {Object.entries(groupedFonts).map(([category, fonts], categoryIndex) => (
            <div key={category}>
              {categoryIndex > 0 && (
                <div className="border-t border-border my-1" />
              )}
              
              <div className="py-1.5 px-2 text-xs font-semibold text-muted-foreground">
                {categoryLabels[category as keyof typeof categoryLabels]}
              </div>
              
              {fonts.map((font, fontIndex) => {
                const globalIndex = Object.values(groupedFonts)
                  .slice(0, categoryIndex)
                  .flat().length + fontIndex;
                
                return (
                  <div
                    key={font.value}
                    className={cn(
                      "relative flex w-full cursor-pointer select-none items-center rounded-sm py-2 px-3 text-sm outline-none transition-colors font-dropdown-option force-font-family",
                      "hover:bg-accent hover:text-accent-foreground",
                      highlightedIndex === globalIndex && "bg-accent text-accent-foreground",
                      value === font.value && "bg-accent/50"
                    )}
                    style={{ 
                      fontFamily: font.fontFamily,
                      fontWeight: 400,
                      fontSize: '14px'
                    }}
                    onClick={() => handleOptionClick(font.value)}
                    role="option"
                    aria-selected={value === font.value}
                  >
                    {value === font.value && (
                      <span className="absolute left-1 flex h-3.5 w-3.5 items-center justify-center">
                        <Check className="h-4 w-4" />
                      </span>
                    )}
                    
                    <div 
                      className={cn("w-full", value === font.value && "ml-6")}
                      style={{ fontFamily: font.fontFamily }}
                    >
                      <FontPreview
                        fontFamily={font.fontFamily}
                        name={font.name}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        )
      )}
    </div>
  );
};

export default CustomFontSelector;