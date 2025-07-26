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
  
  return (
    <div className={`font-preview flex items-center justify-between w-full rounded-md transition-colors ${className}`}>
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span className="font-medium text-sm text-foreground truncate" style={{ fontFamily }} title={name}>{name}</span>
        {isMono && (
          <span className="font-tag mono text-xs px-1 py-0.5 rounded shrink-0">等宽</span>
        )}
        {isSerif && (
          <span className="font-tag serif text-xs px-1 py-0.5 rounded shrink-0">衬线</span>
        )}
        {isSystem && (
          <span className="font-tag text-xs px-1 py-0.5 rounded shrink-0">推荐</span>
        )}
      </div>
      <div className="text-sm text-muted-foreground/70 ml-4 shrink-0" style={{ fontFamily }}>
        中文 English 123
      </div>
    </div>
  );
};

export default FontPreview;