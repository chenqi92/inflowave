/**
 * 智能提示项组件
 */

import React from 'react';
import { SuggestionItem } from '@/utils/suggestionTypes';
import {
  Code,
  Database,
  Table,
  Tag,
  Key,
  Zap,
  Hash
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SuggestionItemComponentProps {
  item: SuggestionItem;
  selected: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
}

export const SuggestionItemComponent: React.FC<SuggestionItemComponentProps> = ({
  item,
  selected,
  onClick,
  onMouseEnter
}) => {
  // 根据类型选择图标和颜色
  const getIconAndColor = () => {
    switch (item.type) {
      case 'keyword':
        return {
          icon: <Code className="w-4 h-4" />,
          color: 'text-blue-500',
          bgColor: 'bg-blue-50 dark:bg-blue-950'
        };
      case 'function':
        return {
          icon: <Zap className="w-4 h-4" />,
          color: 'text-purple-500',
          bgColor: 'bg-purple-50 dark:bg-purple-950'
        };
      case 'table':
        return {
          icon: <Table className="w-4 h-4" />,
          color: 'text-green-500',
          bgColor: 'bg-green-50 dark:bg-green-950'
        };
      case 'field':
        return {
          icon: <Key className="w-4 h-4" />,
          color: 'text-orange-500',
          bgColor: 'bg-orange-50 dark:bg-orange-950'
        };
      case 'tag':
        return {
          icon: <Tag className="w-4 h-4" />,
          color: 'text-pink-500',
          bgColor: 'bg-pink-50 dark:bg-pink-950'
        };
      case 'database':
        return {
          icon: <Database className="w-4 h-4" />,
          color: 'text-indigo-500',
          bgColor: 'bg-indigo-50 dark:bg-indigo-950'
        };
      default:
        return {
          icon: <Hash className="w-4 h-4" />,
          color: 'text-gray-500',
          bgColor: 'bg-gray-50 dark:bg-gray-950'
        };
    }
  };

  const { icon, color, bgColor } = getIconAndColor();

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-2 py-1.5 text-xs rounded cursor-pointer transition-colors',
        'hover:bg-muted/50',
        selected && 'bg-accent text-accent-foreground'
      )}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
    >
      {/* 图标区域 */}
      <div className={cn(
        'flex items-center justify-center w-4 h-4 rounded-sm flex-shrink-0',
        selected ? 'text-accent-foreground' : color,
        selected ? 'bg-accent-foreground/20' : bgColor
      )}>
        {icon}
      </div>

      {/* 内容区域 - 单行布局 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {/* 主要标签 */}
          <div className="font-medium truncate text-xs">{item.label}</div>

          {/* 详细信息标签 */}
          {item.detail && (
            <div className={cn(
              'text-[10px] px-1 py-0.5 rounded text-right flex-shrink-0',
              selected
                ? 'text-accent-foreground/70'
                : 'text-muted-foreground'
            )}>
              {item.detail}
            </div>
          )}

          {/* 文档说明 - 放在同一行 */}
          {item.documentation && (
            <div className={cn(
              'text-[10px] truncate flex-1 ml-2',
              selected
                ? 'text-accent-foreground/70'
                : 'text-muted-foreground'
            )}>
              {item.documentation}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
