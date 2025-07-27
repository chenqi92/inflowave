import React from 'react';

interface FontPreviewProps {
  fontFamily: string;
  name: string;
  className?: string;
}

const FontPreview: React.FC<FontPreviewProps> = ({ fontFamily, name, className }) => {
  const isMono = name.includes('Mono') || name.includes('Code') || name.includes('Courier');
  const isSerif = name.includes('Georgia') || name.includes('Times') || fontFamily.includes('serif');
  const isSystem = name === '系统默认';
  
  // 强制应用字体样式的内联样式对象 - 直接使用传入的字体
  const forcedFontStyle = {
    fontFamily: fontFamily,
    fontWeight: 400,
    fontSize: '14px',
    lineHeight: '1.2',
  };
  
  return (
    <div 
      className={`font-preview flex items-center justify-between w-full rounded-md transition-colors ${className}`}
      style={forcedFontStyle}
    >
      <div className="flex items-center gap-2 flex-1 min-w-0" style={forcedFontStyle}>
        <span 
          className="font-medium text-sm text-foreground truncate" 
          style={{ ...forcedFontStyle, fontSize: '14px' }} 
          title={name}
        >
          {name}
        </span>
        {isMono && (
          <span className="font-tag mono text-xs px-1 py-0.5 rounded shrink-0" style={{ ...forcedFontStyle, fontSize: '11px' }}>等宽</span>
        )}
        {isSerif && (
          <span className="font-tag serif text-xs px-1 py-0.5 rounded shrink-0" style={{ ...forcedFontStyle, fontSize: '11px' }}>衬线</span>
        )}
        {isSystem && (
          <span className="font-tag text-xs px-1 py-0.5 rounded shrink-0" style={{ ...forcedFontStyle, fontSize: '11px' }}>推荐</span>
        )}
      </div>
      <div className="text-sm text-muted-foreground/70 ml-4 shrink-0" style={{ ...forcedFontStyle, fontSize: '13px' }}>
        中文 English 123
      </div>
    </div>
  );
};

export default FontPreview;