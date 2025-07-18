import * as React from 'react';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, CalendarIcon } from 'lucide-react';
import { Button } from './Button';
import { Input } from './Input';
import { Popover, PopoverContent, PopoverTrigger } from './popover';

interface DatePickerProps {
  className?: string;
  value?: Date | string;
  defaultValue?: Date | string;
  placeholder?: string;
  format?: string;
  disabled?: boolean;
  allowClear?: boolean;
  onChange?: (date: Date | null, dateString: string) => void;
  onOpenChange?: (open: boolean) => void;
  picker?: 'date' | 'week' | 'month' | 'quarter' | 'year';
  showTime?: boolean | object;
  showToday?: boolean;
  open?: boolean;
  size?: 'large' | 'middle' | 'small';
}

const DatePicker = React.forwardRef<HTMLDivElement, DatePickerProps>(
  (
    {
      className,
      value,
      defaultValue,
      placeholder = '选择日期',
      format = 'YYYY-MM-DD',
      disabled = false,
      allowClear = true,
      onChange,
      onOpenChange,
      picker = 'date',
      showTime = false,
      showToday = true,
      open,
      size = 'middle',
      ...props
    },
    ref
  ) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const [selectedDate, setSelectedDate] = React.useState<Date | null>(() => {
      if (value) return typeof value === 'string' ? new Date(value) : value;
      if (defaultValue)
        return typeof defaultValue === 'string'
          ? new Date(defaultValue)
          : defaultValue;
      return null;
    });
    const [currentMonth, setCurrentMonth] = React.useState(new Date());

    const controlledOpen = open !== undefined ? open : isOpen;
    const setControlledOpen = open !== undefined ? onOpenChange : setIsOpen;

    // 格式化日期
    const formatDate = (date: Date | null): string => {
      if (!date) return '';

      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');

      let result = format
        .replace('YYYY', year.toString())
        .replace('MM', month)
        .replace('DD', day);

      // 如果启用了时间选择，添加时间格式
      if (showTime) {
        if (format.includes('HH:mm:ss')) {
          result = result.replace('HH:mm:ss', `${hours}:${minutes}:${seconds}`);
        } else if (format.includes('HH:mm')) {
          result = result.replace('HH:mm', `${hours}:${minutes}`);
        } else {
          // 默认添加时间格式
          result += ` ${hours}:${minutes}:${seconds}`;
        }
      }

      return result;
    };

    const handleDateSelect = (date: Date) => {
      // 如果启用了时间选择，保留当前选中日期的时间部分
      if (showTime && selectedDate) {
        date.setHours(selectedDate.getHours());
        date.setMinutes(selectedDate.getMinutes());
        date.setSeconds(selectedDate.getSeconds());
      }

      setSelectedDate(date);
      onChange?.(date, formatDate(date));

      // 如果没有启用时间选择，直接关闭弹窗
      if (!showTime) {
        setControlledOpen?.(false);
      }
    };

    const handleTimeChange = (
      hours: number,
      minutes: number,
      seconds: number
    ) => {
      if (!selectedDate) return;

      const newDate = new Date(selectedDate);
      newDate.setHours(hours);
      newDate.setMinutes(minutes);
      newDate.setSeconds(seconds);

      setSelectedDate(newDate);
      onChange?.(newDate, formatDate(newDate));
    };

    const handleClear = (e: React.MouseEvent) => {
      e.stopPropagation();
      setSelectedDate(null);
      onChange?.(null, '');
    };

    const handleToday = () => {
      const today = new Date();
      handleDateSelect(today);
    };

    // 生成日历
    const generateCalendar = (date: Date) => {
      const year = date.getFullYear();
      const month = date.getMonth();

      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const firstDayWeek = firstDay.getDay();
      const daysInMonth = lastDay.getDate();

      const days: (Date | null)[] = [];

      // 前面的空白天数
      for (let i = 0; i < firstDayWeek; i++) {
        days.push(null);
      }

      // 当月的天数
      for (let i = 1; i <= daysInMonth; i++) {
        days.push(new Date(year, month, i));
      }

      return days;
    };

    const days = generateCalendar(currentMonth);
    const monthNames = [
      '一月',
      '二月',
      '三月',
      '四月',
      '五月',
      '六月',
      '七月',
      '八月',
      '九月',
      '十月',
      '十一月',
      '十二月',
    ];

    const sizeClasses = {
      small: 'h-8',
      middle: 'h-10',
      large: 'h-12',
    };

    const displayValue = selectedDate ? formatDate(selectedDate) : '';

    return (
      <div ref={ref} className={cn('relative', className)} {...props}>
        <Popover open={controlledOpen} onOpenChange={setControlledOpen}>
          <PopoverTrigger asChild>
            <div className='relative'>
              <Input
                value={displayValue}
                placeholder={placeholder}
                disabled={disabled}
                readOnly
                className={cn('cursor-pointer pr-8', sizeClasses[size])}
              />
              <div className='absolute right-2 top-1/2 -translate-y-1/2 flex items-center space-x-1'>
                {allowClear && selectedDate && (
                  <button
                    onClick={handleClear}
                    className='text-muted-foreground hover:text-foreground'
                  >
                    ×
                  </button>
                )}
                <CalendarIcon className='h-4 w-4 text-muted-foreground' />
              </div>
            </div>
          </PopoverTrigger>

          <PopoverContent className='w-64 p-4 bg-background border border-border rounded-md shadow-md'>
            {/* 月份导航 */}
            <div className='flex items-center justify-between mb-4'>
              <Button
                variant='outline'
                size='sm'
                onClick={() =>
                  setCurrentMonth(
                    new Date(
                      currentMonth.getFullYear(),
                      currentMonth.getMonth() - 1
                    )
                  )
                }
              >
                <ChevronLeft className='h-4 w-4' />
              </Button>

              <span className='font-medium'>
                {currentMonth.getFullYear()}年{' '}
                {monthNames[currentMonth.getMonth()]}
              </span>

              <Button
                variant='outline'
                size='sm'
                onClick={() =>
                  setCurrentMonth(
                    new Date(
                      currentMonth.getFullYear(),
                      currentMonth.getMonth() + 1
                    )
                  )
                }
              >
                <ChevronRight className='h-4 w-4' />
              </Button>
            </div>

            {/* 星期标题 */}
            <div className='grid grid-cols-7 gap-1 mb-2'>
              {['日', '一', '二', '三', '四', '五', '六'].map(day => (
                <div
                  key={day}
                  className='text-center text-xs text-muted-foreground p-2'
                >
                  {day}
                </div>
              ))}
            </div>

            {/* 日期网格 */}
            <div className='grid grid-cols-7 gap-1 mb-4'>
              {days.map((day, index) => (
                <div key={index} className='aspect-square'>
                  {day ? (
                    <Button
                      variant={
                        selectedDate && day.getTime() === selectedDate.getTime()
                          ? 'default'
                          : 'ghost'
                      }
                      size='sm'
                      className='w-full h-full p-0'
                      onClick={() => handleDateSelect(day)}
                    >
                      {day.getDate()}
                    </Button>
                  ) : (
                    <div />
                  )}
                </div>
              ))}
            </div>

            {/* 时间选择器 */}
            {showTime && (
              <div className='border-t pt-4 mt-4'>
                <div className='flex items-center gap-2 justify-center'>
                  <div className='flex flex-col items-center'>
                    <label className='text-xs text-muted-foreground mb-1'>
                      时
                    </label>
                    <input
                      type='number'
                      min='0'
                      max='23'
                      value={selectedDate?.getHours() || 0}
                      onChange={e => {
                        const hours = parseInt(e.target.value) || 0;
                        handleTimeChange(
                          hours,
                          selectedDate?.getMinutes() || 0,
                          selectedDate?.getSeconds() || 0
                        );
                      }}
                      className='w-12 h-8 text-center text-sm border border-input bg-background text-foreground rounded px-1 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2'
                    />
                  </div>
                  <span className='text-muted-foreground'>:</span>
                  <div className='flex flex-col items-center'>
                    <label className='text-xs text-muted-foreground mb-1'>
                      分
                    </label>
                    <input
                      type='number'
                      min='0'
                      max='59'
                      value={selectedDate?.getMinutes() || 0}
                      onChange={e => {
                        const minutes = parseInt(e.target.value) || 0;
                        handleTimeChange(
                          selectedDate?.getHours() || 0,
                          minutes,
                          selectedDate?.getSeconds() || 0
                        );
                      }}
                      className='w-12 h-8 text-center text-sm border border-input bg-background text-foreground rounded px-1 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2'
                    />
                  </div>
                  <span className='text-muted-foreground'>:</span>
                  <div className='flex flex-col items-center'>
                    <label className='text-xs text-muted-foreground mb-1'>
                      秒
                    </label>
                    <input
                      type='number'
                      min='0'
                      max='59'
                      value={selectedDate?.getSeconds() || 0}
                      onChange={e => {
                        const seconds = parseInt(e.target.value) || 0;
                        handleTimeChange(
                          selectedDate?.getHours() || 0,
                          selectedDate?.getMinutes() || 0,
                          seconds
                        );
                      }}
                      className='w-12 h-8 text-center text-sm border border-input bg-background text-foreground rounded px-1 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2'
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 底部按钮 */}
            <div className='flex justify-between mt-4'>
              {showToday && (
                <Button variant='outline' size='sm' onClick={handleToday}>
                  今天
                </Button>
              )}
              {showTime && (
                <Button
                  variant='default'
                  size='sm'
                  onClick={() => setControlledOpen?.(false)}
                  className='ml-auto'
                >
                  确定
                </Button>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    );
  }
);
DatePicker.displayName = 'DatePicker';

export { DatePicker };
export type { DatePickerProps };
