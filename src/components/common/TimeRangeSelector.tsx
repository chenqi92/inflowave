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
import { useTranslation } from '@/hooks/useTranslation';

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

// 时间范围配置（不包含 label，label 将从翻译中获取）
const TIME_RANGE_CONFIGS = [
    { value: 'none', key: 'no_limit', start: '', end: '' },
    { value: '1h', key: 'last_1_hour', start: 'now() - 1h', end: 'now()' },
    { value: '6h', key: 'last_6_hours', start: 'now() - 6h', end: 'now()' },
    { value: '12h', key: 'last_12_hours', start: 'now() - 12h', end: 'now()' },
    { value: '1d', key: 'last_1_day', start: 'now() - 1d', end: 'now()' },
    { value: '3d', key: 'last_3_days', start: 'now() - 3d', end: 'now()' },
    { value: '7d', key: 'last_7_days', start: 'now() - 7d', end: 'now()' },
    { value: '30d', key: 'last_30_days', start: 'now() - 30d', end: 'now()' },
];

const TimeRangeSelector: React.FC<TimeRangeSelectorProps> = ({
                                                                 value,
                                                                 onChange,
                                                                 disabled = false,
                                                                 className = '',
                                                             }) => {
    const { t } = useTranslation('query');

    // 生成带翻译的时间范围列表
    const TIME_RANGES: TimeRange[] = TIME_RANGE_CONFIGS.map(config => ({
        label: t(`time_range.${config.key}`),
        value: config.value,
        start: config.start,
        end: config.end,
    }));

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
            showMessage.error(t('time_range.error_select_time'));
            return;
        }

        if (customStartDate >= customEndDate) {
            showMessage.error(t('time_range.error_time_order'));
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
        showMessage.success(t('time_range.success_set'));
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
                                {t('time_range.filter_title')}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                                {t('time_range.filter_description')}
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
                            <span className="flex-1">{t('time_range.custom')}</span>
                            <div className="text-xs text-muted-foreground">⚙️</div>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
            </DropdownMenu>

            {/* 自定义时间范围对话框 */}
                <Dialog open={showCustomDialog} onOpenChange={setShowCustomDialog}>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle>{t('time_range.custom_dialog_title')}</DialogTitle>
                            <DialogDescription>
                                {t('time_range.custom_dialog_description')}
                            </DialogDescription>
                        </DialogHeader>

                        <div className='space-y-4 py-4'>
                            <div className='grid grid-cols-4 items-center gap-4'>
                                <Label htmlFor='custom-start-date' className='text-right text-sm font-medium'>
                                    {t('time_range.start_time')}
                                </Label>
                                <div className='col-span-3'>
                                    <DatePicker
                                        value={customStartDate || undefined}
                                        onChange={(date) => setCustomStartDate(date)}
                                        placeholder={t('time_range.select_start_time')}
                                        showTime={true}
                                        format='YYYY-MM-DD HH:mm:ss'
                                        className='w-full'
                                    />
                                </div>
                            </div>

                            <div className='grid grid-cols-4 items-center gap-4'>
                                <Label htmlFor='custom-end-date' className='text-right text-sm font-medium'>
                                    {t('time_range.end_time')}
                                </Label>
                                <div className='col-span-3'>
                                    <DatePicker
                                        value={customEndDate || undefined}
                                        onChange={(date) => setCustomEndDate(date)}
                                        placeholder={t('time_range.select_end_time')}
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
                                        {t('time_range.preview')}
                                    </Label>
                                    <div className='col-span-3 text-sm text-muted-foreground bg-muted p-2 rounded'>
                                        {generateTimeRangeLabel(customStartDate, customEndDate)}
                                    </div>
                                </div>
                            )}
                        </div>

                        <DialogFooter>
                            <Button variant='outline' onClick={handleCustomCancel}>
                                {t('time_range.cancel')}
                            </Button>
                            <Button onClick={handleCustomSubmit}>
                                {t('time_range.confirm')}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
        </div>
    );
};

export default TimeRangeSelector;
