import React, {useState} from 'react';
import {
    Button,
    Label,
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DatePicker
} from '@/components/ui';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from '@/components/ui';
import {Clock, Calendar, ChevronDown} from 'lucide-react';
import {showMessage} from '@/utils/message';
import dayjs from 'dayjs';

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
        label: '不限制时间',
        value: 'none',
        start: '',
        end: '',
    },
    {
        label: '最近1小时',
        value: '1h',
        start: 'now() - 1h',
        end: 'now()',
    },
    {
        label: '最近6小时',
        value: '6h',
        start: 'now() - 6h',
        end: 'now()',
    },
    {
        label: '最近12小时',
        value: '12h',
        start: 'now() - 12h',
        end: 'now()',
    },
    {
        label: '最近1天',
        value: '1d',
        start: 'now() - 1d',
        end: 'now()',
    },
    {
        label: '最近3天',
        value: '3d',
        start: 'now() - 3d',
        end: 'now()',
    },
    {
        label: '最近7天',
        value: '7d',
        start: 'now() - 7d',
        end: 'now()',
    },
    {
        label: '最近30天',
        value: '30d',
        start: 'now() - 30d',
        end: 'now()',
    },
];

const TimeRangeSelector: React.FC<TimeRangeSelectorProps> = ({
                                                                 value,
                                                                 onChange,
                                                                 disabled = false,
                                                                 className = '',
                                                             }) => {
    // 使用外部传入的value，如果没有则使用默认值
    const selectedRange = value || TIME_RANGES[0];

    const [showCustomDialog, setShowCustomDialog] = useState(false);
    const [customStartDate, setCustomStartDate] = useState<Date | null>(null);
    const [customEndDate, setCustomEndDate] = useState<Date | null>(null);

    const handleRangeSelect = (range: TimeRange) => {
        // 直接调用onChange，不维护内部状态
        onChange?.(range);
    };

    const handleCustomRange = () => {
        setShowCustomDialog(true);
        // 预填充当前时间范围的值
        if (selectedRange && selectedRange.value === 'custom') {
            // 尝试解析现有的自定义时间范围
            const now = new Date();
            setCustomEndDate(now);
            setCustomStartDate(new Date(now.getTime() - 60 * 60 * 1000)); // 默认1小时前
        } else {
            // 默认值：最近1小时
            const now = new Date();
            setCustomEndDate(now);
            setCustomStartDate(new Date(now.getTime() - 60 * 60 * 1000));
        }
    };

    // 格式化日期为InfluxQL时间表达式
    const formatDateToInfluxQL = (date: Date): string => {
        return dayjs(date).format('YYYY-MM-DDTHH:mm:ss[Z]');
    };

    // 生成时间范围标签
    const generateTimeRangeLabel = (startDate: Date, endDate: Date): string => {
        const start = dayjs(startDate);
        const end = dayjs(endDate);

        // 如果是今天的时间范围，显示更友好的格式
        const now = dayjs();
        if (end.isSame(now, 'day') && start.isSame(now, 'day')) {
            return `${start.format('HH:mm')} - ${end.format('HH:mm')}`;
        }

        // 如果跨天，显示完整日期时间
        if (!start.isSame(end, 'day')) {
            return `${start.format('MM-DD HH:mm')} - ${end.format('MM-DD HH:mm')}`;
        }

        return `${start.format('YYYY-MM-DD HH:mm')} - ${end.format('HH:mm')}`;
    };

    const handleCustomSubmit = () => {
        if (!customStartDate || !customEndDate) {
            showMessage.error('请选择开始时间和结束时间');
            return;
        }

        if (customStartDate >= customEndDate) {
            showMessage.error('开始时间必须早于结束时间');
            return;
        }

        const customRange: TimeRange = {
            label: generateTimeRangeLabel(customStartDate, customEndDate),
            value: 'custom',
            start: formatDateToInfluxQL(customStartDate),
            end: formatDateToInfluxQL(customEndDate),
        };

        // 直接调用onChange，不维护内部状态
        onChange?.(customRange);
        setShowCustomDialog(false);
        showMessage.success('自定义时间范围已设置');
    };

    const handleCustomCancel = () => {
        setShowCustomDialog(false);
        // 重置表单
        setCustomStartDate(null);
        setCustomEndDate(null);
    };

    return (
        <div className={`flex items-center gap-2 ${className}`}>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant='outline'
                        size='sm'
                        className={`
                            h-8 min-w-24 gap-1 relative
                            ${selectedRange.value !== 'none'
                                ? 'border-red-500 bg-red-50 hover:bg-red-100 text-red-700 shadow-sm'
                                : 'hover:bg-accent hover:text-accent-foreground'
                            }
                            transition-all duration-200
                        `}
                        disabled={disabled}
                    >
                        {/* 红色强调指示器 */}
                        {selectedRange.value !== 'none' && (
                            <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                        )}
                        <Clock className={`w-3 h-3 ${selectedRange.value !== 'none' ? 'text-red-600' : ''}`}/>
                        <span className='text-xs font-medium'>{selectedRange.label}</span>
                        <ChevronDown className={`w-3 h-3 ${selectedRange.value !== 'none' ? 'text-red-600' : ''}`}/>
                    </Button>
                </DropdownMenuTrigger>

                    <DropdownMenuContent align='start' className='w-56'>
                        <div className='px-3 py-2 text-xs font-medium text-muted-foreground border-b bg-muted/50'>
                            <div className="flex items-center gap-2">
                                <Clock className="w-3 h-3" />
                                时间范围筛选
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                                选择后所有查询都会应用此筛选
                            </div>
                        </div>

                        {TIME_RANGES.map(range => (
                            <DropdownMenuItem
                                key={range.value}
                                onClick={() => handleRangeSelect(range)}
                                className={`
                                    flex items-center gap-2 text-sm py-2 px-3
                                    ${selectedRange.value === range.value
                                        ? (range.value === 'none'
                                            ? 'bg-blue-50 text-blue-700 border-l-2 border-blue-500'
                                            : 'bg-red-50 text-red-700 border-l-2 border-red-500'
                                        )
                                        : 'hover:bg-accent'
                                    }
                                    transition-colors duration-150
                                `}
                            >
                                <Clock className={`w-3 h-3 ${
                                    selectedRange.value === range.value
                                        ? (range.value === 'none' ? 'text-blue-600' : 'text-red-600')
                                        : 'text-muted-foreground'
                                }`}/>
                                <span className="flex-1">{range.label}</span>
                                {selectedRange.value === range.value && (
                                    <div className={`w-2 h-2 rounded-full ml-auto ${
                                        range.value === 'none' ? 'bg-blue-500' : 'bg-red-500'
                                    }`}/>
                                )}
                            </DropdownMenuItem>
                        ))}

                        <DropdownMenuSeparator/>

                        <DropdownMenuItem
                            onClick={handleCustomRange}
                            className='flex items-center gap-2 text-sm py-2 px-3 hover:bg-accent transition-colors duration-150'
                        >
                            <Calendar className='w-3 h-3 text-muted-foreground'/>
                            <span className="flex-1">自定义时间范围...</span>
                            <div className="text-xs text-muted-foreground">⚙️</div>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
            </DropdownMenu>

            {/* 自定义时间范围对话框 */}
                <Dialog open={showCustomDialog} onOpenChange={setShowCustomDialog}>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle>自定义时间范围</DialogTitle>
                            <DialogDescription>
                                选择查询数据的时间范围，系统将自动转换为InfluxQL时间表达式。
                            </DialogDescription>
                        </DialogHeader>

                        <div className='space-y-4 py-4'>
                            <div className='grid grid-cols-4 items-center gap-4'>
                                <Label htmlFor='custom-start-date' className='text-right text-sm font-medium'>
                                    开始时间
                                </Label>
                                <div className='col-span-3'>
                                    <DatePicker
                                        value={customStartDate || undefined}
                                        onChange={(date) => setCustomStartDate(date)}
                                        placeholder='选择开始时间'
                                        showTime={true}
                                        format='YYYY-MM-DD HH:mm:ss'
                                        className='w-full'
                                    />
                                </div>
                            </div>

                            <div className='grid grid-cols-4 items-center gap-4'>
                                <Label htmlFor='custom-end-date' className='text-right text-sm font-medium'>
                                    结束时间
                                </Label>
                                <div className='col-span-3'>
                                    <DatePicker
                                        value={customEndDate || undefined}
                                        onChange={(date) => setCustomEndDate(date)}
                                        placeholder='选择结束时间'
                                        showTime={true}
                                        format='YYYY-MM-DD HH:mm:ss'
                                        className='w-full'
                                    />
                                </div>
                            </div>

                            {/* 预览时间范围 */}
                            {customStartDate && customEndDate && (
                                <div className='grid grid-cols-4 items-center gap-4'>
                                    <Label className='text-right text-sm font-medium text-muted-foreground'>
                                        预览
                                    </Label>
                                    <div className='col-span-3 text-sm text-muted-foreground bg-muted p-2 rounded'>
                                        {generateTimeRangeLabel(customStartDate, customEndDate)}
                                    </div>
                                </div>
                            )}
                        </div>

                        <DialogFooter>
                            <Button variant='outline' onClick={handleCustomCancel}>
                                取消
                            </Button>
                            <Button onClick={handleCustomSubmit}>
                                确定
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
        </div>
    );
};

export default TimeRangeSelector;
