import React, {useState} from 'react';
import {Button, Input, Label} from '@/components/ui';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from '@/components/ui';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui';
import {Clock, Calendar, ChevronDown} from 'lucide-react';
import {showMessage} from '@/utils/message';

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
    const [selectedRange, setSelectedRange] = useState<TimeRange>(
        value || TIME_RANGES[0] // 默认选择不限制时间
    );
    const [showCustomPopover, setShowCustomPopover] = useState(false);
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');
    const [customLabel, setCustomLabel] = useState('');

    // 当外部传入的value发生变化时，更新内部状态
    React.useEffect(() => {
        if (value && value !== selectedRange) {
            setSelectedRange(value);
        }
    }, [value]);

    const handleRangeSelect = (range: TimeRange) => {
        setSelectedRange(range);
        onChange?.(range);
    };

    const handleCustomRange = () => {
        setShowCustomPopover(true);
        // 预填充当前时间范围的值
        if (selectedRange && selectedRange.value === 'custom') {
            setCustomStart(selectedRange.start);
            setCustomEnd(selectedRange.end);
            setCustomLabel(selectedRange.label);
        } else {
            // 默认值
            setCustomStart('now() - 1h');
            setCustomEnd('now()');
            setCustomLabel('自定义时间范围');
        }
    };

    const handleCustomSubmit = () => {
        if (!customStart.trim() || !customEnd.trim()) {
            showMessage.error('请填写开始时间和结束时间');
            return;
        }

        if (!customLabel.trim()) {
            showMessage.error('请填写时间范围标签');
            return;
        }

        const customRange: TimeRange = {
            label: customLabel,
            value: 'custom',
            start: customStart,
            end: customEnd,
        };

        setSelectedRange(customRange);
        onChange?.(customRange);
        setShowCustomPopover(false);
        showMessage.success('自定义时间范围已设置');
    };

    const handleCustomCancel = () => {
        setShowCustomPopover(false);
        // 重置表单
        setCustomStart('');
        setCustomEnd('');
        setCustomLabel('');
    };

    return (
        <TooltipProvider>
            <div className={`flex items-center gap-2 ${className}`}>
                <DropdownMenu>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant='outline'
                                    size='sm'
                                    className='h-8 min-w-24 gap-1'
                                    disabled={disabled}
                                >
                                    <Clock className='w-3 h-3'/>
                                    <span className='text-xs'>{selectedRange.label}</span>
                                    <ChevronDown className='w-3 h-3'/>
                                </Button>
                            </DropdownMenuTrigger>
                        </TooltipTrigger>
                        <TooltipContent>
                            {selectedRange.value === 'none'
                                ? '不限制时间范围'
                                : `时间范围: ${selectedRange.start} 到 ${selectedRange.end}`}
                        </TooltipContent>
                    </Tooltip>

                    <DropdownMenuContent align='start' className='w-48'>
                        <div className='px-2 py-1 text-xs font-medium text-muted-foreground border-b'>
                            快速选择
                        </div>

                        {TIME_RANGES.map(range => (
                            <DropdownMenuItem
                                key={range.value}
                                onClick={() => handleRangeSelect(range)}
                                className={`
                  flex items-center gap-2 text-sm
                  ${selectedRange.value === range.value ? 'bg-blue-50 text-primary' : ''}
                `}
                            >
                                <Clock className='w-3 h-3'/>
                                <span>{range.label}</span>
                                {selectedRange.value === range.value && (
                                    <div className='w-2 h-2 bg-primary rounded-full ml-auto'/>
                                )}
                            </DropdownMenuItem>
                        ))}

                        <DropdownMenuSeparator/>

                        <DropdownMenuItem
                            onClick={handleCustomRange}
                            className='flex items-center gap-2 text-sm'
                        >
                            <Calendar className='w-3 h-3'/>
                            <span>自定义时间范围...</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

                {/* 自定义时间范围弹出框 */}
                <Popover open={showCustomPopover} onOpenChange={setShowCustomPopover}>
                    <PopoverTrigger asChild>
                        <Button style={{ display: 'none' }} />
                    </PopoverTrigger>
                    <PopoverContent className='w-96 p-4' align='start' side='bottom'>
                        <div className='mb-3'>
                            <h4 className='text-sm font-medium mb-1'>自定义时间范围</h4>
                            <p className='text-xs text-muted-foreground'>
                                支持 InfluxQL 时间表达式，如 'now() - 1h'、'2024-01-01T00:00:00Z' 等。
                            </p>
                        </div>

                        <div className='space-y-3'>
                            <div className='grid grid-cols-4 items-center gap-2'>
                                <Label htmlFor='custom-label' className='text-sm'>
                                    标签
                                </Label>
                                <Input
                                    id='custom-label'
                                    value={customLabel}
                                    onChange={e => setCustomLabel(e.target.value)}
                                    placeholder='例如：自定义时间'
                                    className='col-span-3 h-8'
                                    size='sm'
                                />
                            </div>

                            <div className='grid grid-cols-4 items-center gap-2'>
                                <Label htmlFor='custom-start' className='text-sm'>
                                    开始时间
                                </Label>
                                <Input
                                    id='custom-start'
                                    value={customStart}
                                    onChange={e => setCustomStart(e.target.value)}
                                    placeholder='例如：now() - 2h'
                                    className='col-span-3 h-8'
                                    size='sm'
                                />
                            </div>

                            <div className='grid grid-cols-4 items-center gap-2'>
                                <Label htmlFor='custom-end' className='text-sm'>
                                    结束时间
                                </Label>
                                <Input
                                    id='custom-end'
                                    value={customEnd}
                                    onChange={e => setCustomEnd(e.target.value)}
                                    placeholder='例如：now()'
                                    className='col-span-3 h-8'
                                    size='sm'
                                />
                            </div>
                        </div>

                        <div className='flex justify-end gap-2 mt-4'>
                            <Button variant='outline' size='sm' onClick={handleCustomCancel}>
                                取消
                            </Button>
                            <Button size='sm' onClick={handleCustomSubmit}>确定</Button>
                        </div>
                    </PopoverContent>
                </Popover>
            </div>
        </TooltipProvider>
    );
};

export default TimeRangeSelector;
