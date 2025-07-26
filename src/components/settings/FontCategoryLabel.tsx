import React from 'react';

interface FontCategoryLabelProps {
  children: React.ReactNode;
}

const FontCategoryLabel: React.FC<FontCategoryLabelProps> = ({ children }) => {
  return (
    <div className="relative flex w-full cursor-default select-none items-center text-xs font-semibold text-muted-foreground/80 bg-muted/20 border-y border-border/50 outline-none pointer-events-none">
      {children}
    </div>
  );
};

export default FontCategoryLabel;