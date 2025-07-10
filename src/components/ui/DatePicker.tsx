import React, { useState, useRef, useEffect } from 'react';
import { Input } from './Input';
import { Button } from './Button';
import { cn } from '@/utils/cn';

export interface DatePickerProps {
  value?: Date | null;
  onChange?: (date: Date | null) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
  showTime?: boolean;
  format?: string;
}

export interface RangePickerProps {
  value?: [Date | null, Date | null] | null;
  onChange?: (dates: [Date | null, Date | null] | null) => void;
  placeholder?: [string, string];
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
  showTime?: boolean;
  format?: string;
}

export const DatePicker: React.FC<DatePickerProps> & {
  RangePicker: React.FC<RangePickerProps>;
} = ({
  value,
  onChange,
  placeholder = '选择日期',
  disabled = false,
  className,
  style,
  showTime = false,
  format,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value) {
      const formatStr = format || (showTime ? 'YYYY-MM-DD HH:mm:ss' : 'YYYY-MM-DD');
      setInputValue(formatDate(value, formatStr));
    } else {
      setInputValue('');
    }
  }, [value, format, showTime]);

  const formatDate = (date: Date, formatStr: string): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return formatStr
      .replace('YYYY', String(year))
      .replace('MM', month)
      .replace('DD', day)
      .replace('HH', hours)
      .replace('mm', minutes)
      .replace('ss', seconds);
  };

  const parseDate = (dateStr: string): Date | null => {
    if (!dateStr) return null;
    
    // 尝试解析不同格式
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    
    const parsedDate = parseDate(newValue);
    onChange?.(parsedDate);
  };

  const handleInputClick = () => {
    if (!disabled) {
      setIsOpen(true);
    }
  };

  const handleDateSelect = (date: Date) => {
    onChange?.(date);
    setIsOpen(false);
  };

  const handleClear = () => {
    setInputValue('');
    onChange?.(null);
  };

  return (
    <div ref={containerRef} className={cn('relative', className)} style={style}>
      <Input
        value={inputValue}
        onChange={handleInputChange}
        onClick={handleInputClick}
        placeholder={placeholder}
        disabled={disabled}
        readOnly={!showTime} // 如果不显示时间，则只读，通过日历选择
        suffix={
          <div className="flex items-center gap-1">
            {inputValue && (
              <Button
                type="text"
                size="small"
                onClick={handleClear}
                className="p-0 h-4 w-4 text-gray-400 hover:text-gray-600"
              >
                ×
              </Button>
            )}
            <svg
              className="w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        }
      />
      
      {isOpen && (
        <div className="absolute top-full left-0 z-50 mt-1 bg-white border border-gray-200 rounded-md shadow-lg p-4 min-w-[280px]">
          <SimpleDateCalendar
            value={value}
            onChange={handleDateSelect}
            showTime={showTime}
            onClose={() => setIsOpen(false)}
          />
        </div>
      )}
    </div>
  );
};

// 简单的日历组件
interface SimpleDateCalendarProps {
  value?: Date | null;
  onChange: (date: Date) => void;
  showTime?: boolean;
  onClose: () => void;
}

const SimpleDateCalendar: React.FC<SimpleDateCalendarProps> = ({
  value,
  onChange,
  showTime = false,
  onClose,
}) => {
  const [currentDate, setCurrentDate] = useState(value || new Date());
  const [selectedDate, setSelectedDate] = useState(value || new Date());

  const today = new Date();
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const firstDayWeekday = firstDayOfMonth.getDay();
  const daysInMonth = lastDayOfMonth.getDate();

  const monthNames = [
    '一月', '二月', '三月', '四月', '五月', '六月',
    '七月', '八月', '九月', '十月', '十一月', '十二月'
  ];

  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleDateClick = (day: number) => {
    const newDate = new Date(year, month, day);
    if (showTime && selectedDate) {
      newDate.setHours(selectedDate.getHours());
      newDate.setMinutes(selectedDate.getMinutes());
      newDate.setSeconds(selectedDate.getSeconds());
    }
    setSelectedDate(newDate);
    onChange(newDate);
  };

  const handleTimeChange = (type: 'hour' | 'minute', value: number) => {
    const newDate = new Date(selectedDate);
    if (type === 'hour') {
      newDate.setHours(value);
    } else {
      newDate.setMinutes(value);
    }
    setSelectedDate(newDate);
    onChange(newDate);
  };

  const renderCalendarDays = () => {
    const days = [];
    
    // 空白天数
    for (let i = 0; i < firstDayWeekday; i++) {
      days.push(<div key={`empty-${i}`} className="w-8 h-8" />);
    }
    
    // 月份天数
    for (let day = 1; day <= daysInMonth; day++) {
      const isToday = today.getFullYear() === year && 
                     today.getMonth() === month && 
                     today.getDate() === day;
      const isSelected = selectedDate.getFullYear() === year && 
                        selectedDate.getMonth() === month && 
                        selectedDate.getDate() === day;
      
      days.push(
        <button
          key={day}
          onClick={() => handleDateClick(day)}
          className={cn(
            'w-8 h-8 text-sm rounded hover:bg-blue-50 transition-colors',
            isToday && 'bg-blue-100 text-blue-600 font-medium',
            isSelected && 'bg-blue-500 text-white hover:bg-blue-600',
            !isToday && !isSelected && 'text-gray-700'
          )}
        >
          {day}
        </button>
      );
    }
    
    return days;
  };

  return (
    <div className="space-y-4">
      {/* 月份导航 */}
      <div className="flex items-center justify-between">
        <Button type="text" onClick={handlePrevMonth} className="p-1">
          ‹
        </Button>
        <div className="font-medium">
          {year}年 {monthNames[month]}
        </div>
        <Button type="text" onClick={handleNextMonth} className="p-1">
          ›
        </Button>
      </div>

      {/* 星期标题 */}
      <div className="grid grid-cols-7 gap-1 text-xs text-gray-500 text-center">
        {weekDays.map(day => (
          <div key={day} className="w-8 h-6 flex items-center justify-center">
            {day}
          </div>
        ))}
      </div>

      {/* 日期网格 */}
      <div className="grid grid-cols-7 gap-1">
        {renderCalendarDays()}
      </div>

      {/* 时间选择器 */}
      {showTime && (
        <div className="border-t pt-3 space-y-2">
          <div className="text-sm text-gray-600">时间</div>
          <div className="flex items-center gap-2">
            <select
              value={selectedDate.getHours()}
              onChange={(e) => handleTimeChange('hour', parseInt(e.target.value))}
              className="border border-gray-300 rounded px-2 py-1 text-sm"
            >
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i}>
                  {String(i).padStart(2, '0')}
                </option>
              ))}
            </select>
            <span>:</span>
            <select
              value={selectedDate.getMinutes()}
              onChange={(e) => handleTimeChange('minute', parseInt(e.target.value))}
              className="border border-gray-300 rounded px-2 py-1 text-sm"
            >
              {Array.from({ length: 60 }, (_, i) => (
                <option key={i} value={i}>
                  {String(i).padStart(2, '0')}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* 操作按钮 */}
      <div className="flex justify-end gap-2 border-t pt-3">
        <Button size="small" onClick={onClose}>
          取消
        </Button>
        <Button 
          type="primary" 
          size="small" 
          onClick={() => {
            onChange(selectedDate);
            onClose();
          }}
        >
          确定
        </Button>
      </div>
    </div>
  );
};

// RangePicker 组件
const RangePicker: React.FC<RangePickerProps> = ({
  value,
  onChange,
  placeholder = ['开始日期', '结束日期'],
  disabled = false,
  className,
  style,
  showTime = false,
  format,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [startValue, setStartValue] = useState('');
  const [endValue, setEndValue] = useState('');

  useEffect(() => {
    if (value && value[0] && value[1]) {
      const formatStr = format || (showTime ? 'YYYY-MM-DD HH:mm:ss' : 'YYYY-MM-DD');
      setStartValue(formatDate(value[0], formatStr));
      setEndValue(formatDate(value[1], formatStr));
    } else {
      setStartValue('');
      setEndValue('');
    }
  }, [value, format, showTime]);

  const formatDate = (date: Date, formatStr: string): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return formatStr
      .replace('YYYY', String(year))
      .replace('MM', month)
      .replace('DD', day)
      .replace('HH', hours)
      .replace('mm', minutes)
      .replace('ss', seconds);
  };

  const handleRangeChange = (dates: [Date | null, Date | null]) => {
    onChange?.(dates);
    setIsOpen(false);
  };

  const handleClear = () => {
    setStartValue('');
    setEndValue('');
    onChange?.(null);
  };

  return (
    <div className={cn('relative', className)} style={style}>
      <div className="flex items-center border border-gray-300 rounded-md focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
        <Input
          value={startValue}
          placeholder={placeholder[0]}
          disabled={disabled}
          readOnly
          onClick={() => !disabled && setIsOpen(true)}
          className="border-0 rounded-r-none focus:ring-0"
        />
        <div className="px-2 text-gray-400">~</div>
        <Input
          value={endValue}
          placeholder={placeholder[1]}
          disabled={disabled}
          readOnly
          onClick={() => !disabled && setIsOpen(true)}
          className="border-0 rounded-l-none focus:ring-0"
        />
        <div className="px-2">
          {(startValue || endValue) && (
            <Button
              type="text"
              size="small"
              onClick={handleClear}
              className="p-0 h-4 w-4 text-gray-400 hover:text-gray-600"
            >
              ×
            </Button>
          )}
        </div>
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 z-50 mt-1 bg-white border border-gray-200 rounded-md shadow-lg p-4">
          <SimpleRangeCalendar
            value={value}
            onChange={handleRangeChange}
            showTime={showTime}
            onClose={() => setIsOpen(false)}
          />
        </div>
      )}
    </div>
  );
};

// 简单的范围日历组件
interface SimpleRangeCalendarProps {
  value?: [Date | null, Date | null] | null;
  onChange: (dates: [Date | null, Date | null]) => void;
  showTime?: boolean;
  onClose: () => void;
}

const SimpleRangeCalendar: React.FC<SimpleRangeCalendarProps> = ({
  value,
  onChange,
  showTime = false,
  onClose,
}) => {
  const [startDate, setStartDate] = useState<Date | null>(value?.[0] || null);
  const [endDate, setEndDate] = useState<Date | null>(value?.[1] || null);
  const [selectingEnd, setSelectingEnd] = useState(false);

  const handleDateSelect = (date: Date) => {
    if (!selectingEnd && !startDate) {
      setStartDate(date);
      setSelectingEnd(true);
    } else if (selectingEnd || !endDate) {
      if (startDate && date < startDate) {
        setStartDate(date);
        setEndDate(startDate);
      } else {
        setEndDate(date);
      }
      setSelectingEnd(false);
    } else {
      setStartDate(date);
      setEndDate(null);
      setSelectingEnd(true);
    }
  };

  const handleConfirm = () => {
    if (startDate && endDate) {
      onChange([startDate, endDate]);
    }
    onClose();
  };

  return (
    <div className="space-y-4 min-w-[300px]">
      <div className="text-sm text-gray-600">
        {selectingEnd ? '请选择结束日期' : '请选择开始日期'}
      </div>
      
      <SimpleDateCalendar
        value={selectingEnd ? endDate : startDate}
        onChange={handleDateSelect}
        showTime={showTime}
        onClose={() => {}}
      />

      <div className="flex justify-between items-center border-t pt-3">
        <div className="text-sm text-gray-600">
          {startDate && endDate && (
            <span>
              {startDate.toLocaleDateString()} ~ {endDate.toLocaleDateString()}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <Button size="small" onClick={onClose}>
            取消
          </Button>
          <Button 
            type="primary" 
            size="small" 
            onClick={handleConfirm}
            disabled={!startDate || !endDate}
          >
            确定
          </Button>
        </div>
      </div>
    </div>
  );
};

DatePicker.RangePicker = RangePicker;

export { RangePicker };
