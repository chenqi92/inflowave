import React, { useState } from 'react';
import { Button } from '@/components/ui';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Clock, Calendar, ChevronDown } from 'lucide-react';

export interface TimeRange {
  label: string;
  value: string;
  start: string;
  end: string;
}

interface TimeRangeSelectorProps {
  value?: TimeRange;
  onChange?: (range: TimeRange) => void;
  disabled?: boolean;
  className?: string;
}

const TIME_RANGES: TimeRange[] = [
  {
    label: '最近1小时',
    value: '1h',
    start: 'now() - 1h',
    end: 'now()'
  },
  {
    label: '最近6小时',
    value: '6h',
    start: 'now() - 6h',
    end: 'now()'
  },
  {
    label: '最近12小时',
    value: '12h',
    start: 'now() - 12h',
    end: 'now()'
  },
  {
    label: '最近1天',
    value: '1d',
    start: 'now() - 1d',
    end: 'now()'
  },
  {
    label: '最近3天',
    value: '3d',
    start: 'now() - 3d',
    end: 'now()'
  },
  {
    label: '最近7天',
    value: '7d',
    start: 'now() - 7d',
    end: 'now()'
  },
  {
    label: '最近30天',
    value: '30d',
    start: 'now() - 30d',
    end: 'now()'
  }
];

const TimeRangeSelector: React.FC<TimeRangeSelectorProps> = ({
  value,
  onChange,
  disabled = false,
  className = ''
}) => {
  const [selectedRange, setSelectedRange] = useState<TimeRange>(
    value || TIME_RANGES[3] // 默认选择最近1天
  );

  const handleRangeSelect = (range: TimeRange) => {
    setSelectedRange(range);
    onChange?.(range);
  };

  const handleCustomRange = () => {
    // TODO: 实现自定义时间范围选择对话框
    console.log('打开自定义时间范围选择器');
  };

  return (
    <TooltipProvider>
      <div className={`flex items-center ${className}`}>
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 min-w-24 gap-1"
                  disabled={disabled}
                >
                  <Clock className="w-3 h-3" />
                  <span className="text-xs">{selectedRange.label}</span>
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>
              时间范围: {selectedRange.start} 到 {selectedRange.end}
            </TooltipContent>
          </Tooltip>
          
          <DropdownMenuContent align="start" className="w-48">
            <div className="px-2 py-1 text-xs font-medium text-gray-500 border-b">
              快速选择
            </div>
            
            {TIME_RANGES.map((range) => (
              <DropdownMenuItem
                key={range.value}
                onClick={() => handleRangeSelect(range)}
                className={`
                  flex items-center gap-2 text-sm
                  ${selectedRange.value === range.value ? 'bg-blue-50 text-blue-600' : ''}
                `}
              >
                <Clock className="w-3 h-3" />
                <span>{range.label}</span>
                {selectedRange.value === range.value && (
                  <div className="w-2 h-2 bg-blue-500 rounded-full ml-auto" />
                )}
              </DropdownMenuItem>
            ))}
            
            <DropdownMenuSeparator />
            
            <DropdownMenuItem
              onClick={handleCustomRange}
              className="flex items-center gap-2 text-sm"
            >
              <Calendar className="w-3 h-3" />
              <span>自定义时间范围...</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </TooltipProvider>
  );
};

export default TimeRangeSelector;