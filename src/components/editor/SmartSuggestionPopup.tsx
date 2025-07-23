/**
 * 智能提示弹框组件
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { SuggestionItem, SuggestionPosition } from '@/utils/suggestionTypes';
import { SuggestionItemComponent } from './SuggestionItem';
import { cn } from '@/lib/utils';

interface SmartSuggestionPopupProps {
  suggestions: SuggestionItem[];
  position: SuggestionPosition;
  onSelect: (item: SuggestionItem) => void;
  onClose: () => void;
  visible: boolean;
  className?: string;
}

export const SmartSuggestionPopup: React.FC<SmartSuggestionPopupProps> = ({
  suggestions,
  position,
  onSelect,
  onClose,
  visible,
  className
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedItemRef = useRef<HTMLDivElement>(null);

  // 键盘导航处理
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!visible || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        e.stopPropagation();
        setSelectedIndex(prev => {
          const newIndex = (prev + 1) % suggestions.length;
          return newIndex;
        });
        break;
        
      case 'ArrowUp':
        e.preventDefault();
        e.stopPropagation();
        setSelectedIndex(prev => {
          const newIndex = (prev - 1 + suggestions.length) % suggestions.length;
          return newIndex;
        });
        break;
        
      case 'Enter':
        e.preventDefault();
        e.stopPropagation();
        if (suggestions[selectedIndex]) {
          onSelect(suggestions[selectedIndex]);
        }
        break;
        
      case 'Escape':
        e.preventDefault();
        e.stopPropagation();
        onClose();
        break;
        
      case 'Tab':
        e.preventDefault();
        e.stopPropagation();
        if (suggestions[selectedIndex]) {
          onSelect(suggestions[selectedIndex]);
        }
        break;
    }
  }, [visible, suggestions, selectedIndex, onSelect, onClose]);

  // 注册键盘事件监听
  useEffect(() => {
    if (visible) {
      document.addEventListener('keydown', handleKeyDown, true);
      return () => {
        document.removeEventListener('keydown', handleKeyDown, true);
      };
    }
  }, [visible, handleKeyDown]);

  // 重置选中项当建议列表变化时
  useEffect(() => {
    setSelectedIndex(0);
  }, [suggestions]);

  // 滚动到选中项
  useEffect(() => {
    if (selectedItemRef.current && containerRef.current) {
      const container = containerRef.current;
      const selectedItem = selectedItemRef.current;
      
      const containerRect = container.getBoundingClientRect();
      const itemRect = selectedItem.getBoundingClientRect();
      
      if (itemRect.bottom > containerRect.bottom) {
        container.scrollTop += itemRect.bottom - containerRect.bottom + 4;
      } else if (itemRect.top < containerRect.top) {
        container.scrollTop -= containerRect.top - itemRect.top + 4;
      }
    }
  }, [selectedIndex]);

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (visible) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [visible, onClose]);

  // 处理项目选择
  const handleItemSelect = useCallback((item: SuggestionItem) => {
    onSelect(item);
  }, [onSelect]);

  // 处理鼠标悬停
  const handleItemMouseEnter = useCallback((index: number) => {
    setSelectedIndex(index);
  }, []);

  if (!visible || suggestions.length === 0) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        'fixed z-50 bg-background border border-border rounded-md shadow-lg',
        'max-h-64 overflow-y-auto min-w-48 max-w-80',
        'animate-in fade-in-0 zoom-in-95 duration-200',
        className
      )}
      style={{
        top: position.top,
        left: position.left,
        maxHeight: position.maxHeight || 320,
        maxWidth: position.maxWidth || 384,
      }}
    >
      {/* 建议列表 - 垂直布局 */}
      <div className="py-0.5">
        {suggestions.map((item, index) => (
          <div
            key={`${item.type}-${item.label}-${index}`}
            ref={index === selectedIndex ? selectedItemRef : undefined}
          >
            <SuggestionItemComponent
              item={item}
              selected={index === selectedIndex}
              onClick={() => handleItemSelect(item)}
              onMouseEnter={() => handleItemMouseEnter(index)}
            />
          </div>
        ))}
      </div>

      {/* 底部提示 */}
      <div className="px-2 py-1 border-t border-border bg-muted/30">
        <div className="text-[10px] text-muted-foreground flex items-center justify-between">
          <span>↑↓ 选择</span>
          <span>Enter 确认</span>
          <span>Esc 关闭</span>
        </div>
      </div>
    </div>
  );
};
