// Shadcn/ui Components Export
export { Button, buttonVariants } from './Button';
export type { ButtonProps } from './Button';

export { Input } from './Input';

export { SearchInput } from './SearchInput';

export {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './Select';

export {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from './Card';

// Context Menu
export {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuCheckboxItem,
  ContextMenuRadioItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuGroup,
  ContextMenuPortal,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuRadioGroup,
} from './ContextMenu';

export {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './Dialog';

export {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from './Table';

// DataTable已移除，统一使用UnifiedDataTable
export { UnifiedDataTable } from './UnifiedDataTable';
export type {
  UnifiedDataTableProps,
  DataRow as UnifiedDataRow,
  ColumnConfig as UnifiedColumnConfig,
  SortConfig as UnifiedSortConfig,
  FilterConfig as UnifiedFilterConfig,
  PaginationConfig as UnifiedPaginationConfig
} from './UnifiedDataTable';

// 新的高性能数据表格组件 - 基于 Glide Data Grid
export { GlideDataTable } from './GlideDataTable';
export type {
  GlideDataTableProps,
  DataRow,
  ColumnConfig,
  SortConfig,
  FilterConfig,
  PaginationConfig
} from './GlideDataTable';

export { Skeleton } from './Skeleton';

// 骨架屏布局组件
export {
  TableSkeleton,
  CardSkeleton,
  ListSkeleton,
  TreeSkeleton,
  FormSkeleton,
  ChartSkeleton,
  DetailSkeleton,
  ContentSkeleton,
} from './SkeletonLayouts';
export type {
  TableSkeletonProps,
  CardSkeletonProps,
  ListSkeletonProps,
  TreeSkeletonProps,
  FormSkeletonProps,
  ChartSkeletonProps,
  DetailSkeletonProps,
  ContentSkeletonProps,
} from './SkeletonLayouts';

// 加载状态组件
export {
  LoadingState,
  InlineLoading,
  PageLoading,
  CardLoading,
  EmptyLoading,
} from './LoadingState';
export type {
  LoadingStateProps,
  InlineLoadingProps,
  PageLoadingProps,
  CardLoadingProps,
  EmptyLoadingProps,
} from './LoadingState';

// Sonner Toast 系统 (shadcn/ui 推荐)
export { Toaster } from './sonner';
export { toast } from 'sonner';

// 消息系统工具函数
export {
  showMessage,
  showNotification,
  specialMessage,
  toastControl,
  systemMessage,
  smartMessage,
  enhancedError,
} from '@/utils/message';

// 错误提示组件
export { ErrorAlert, SimpleErrorAlert } from './ErrorAlert';
export type { ErrorAlertProps } from './ErrorAlert';

export { Avatar, AvatarFallback, AvatarImage } from './Avatar';

export { Checkbox } from './Checkbox';

export {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from './DropdownMenu';

// Alias for backward compatibility
export { DropdownMenu as Dropdown } from './DropdownMenu';

export {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  useFormField,
} from './Form';

export { Label } from './Label';

export {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuIndicator,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  NavigationMenuViewport,
  navigationMenuTriggerStyle,
} from './NavigationMenu';

export { RadioGroup, RadioGroupItem } from './RadioGroup';

export { Slider } from './Slider';

export { Switch } from './Switch';

export { Textarea } from './Textarea';

export { Badge, badgeVariants } from './Badge';

export { Alert, AlertDescription, AlertTitle } from './Alert';

export { Tabs, TabsContent, TabsList, TabsTrigger } from './Tabs';

export { Progress } from './Progress';

export { Result } from './Result';
export type { ResultProps } from './Result';

import { Title, Text, Paragraph, CodeBlock, InlineCode } from './Typography';

export {
  Title,
  Text,
  Paragraph,
  AntParagraph,
  CodeBlock,
  InlineCode,
} from './Typography';
export type { TypographyProps, AntParagraphProps } from './Typography';

// Export Typography as a namespace object
export const Typography = {
  Title,
  Text,
  Paragraph,
  CodeBlock,
  InlineCode,
};

export { Empty, EmptyDatabase, EmptySearch } from './Empty';
export type { EmptyProps } from './Empty';

export { Spin } from './Spin';
export type { SpinProps } from './Spin';

export { Tag, tagVariants } from './Tag';

export { Space } from './Space';
export type { SpaceProps } from './Space';

export { List, ListItem, ListItemMeta } from './List';
export type { ListProps, ListItemProps, ListItemMetaProps } from './List';

export { Statistic } from './Statistic';
export type { StatisticProps } from './Statistic';

export { Row, Col } from './Grid';
export type { RowProps, ColProps } from './Grid';

export { Menu, MenuItem, MenuDivider } from './Menu';
export type { MenuProps, MenuItemType } from './Menu';

export { Popconfirm } from './Popconfirm';
export type { PopconfirmProps } from './Popconfirm';

export {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
  TooltipWrapper,
} from './Tooltip';
export type { TooltipWrapperProps } from './Tooltip';

export { InputNumber } from './InputNumber';
export type { InputNumberProps } from './InputNumber';

export { Steps, Step } from './Steps';
export type { StepsProps, StepProps, StepItem } from './Steps';

export { Descriptions, DescriptionsItem } from './Descriptions';
export type {
  DescriptionsProps,
  DescriptionsItemProps,
  DescriptionItem,
} from './Descriptions';

export { Timeline, TimelineItem } from './Timeline';
export type {
  TimelineProps,
  TimelineItemProps,
  TimelineItemData,
} from './Timeline';

export { DatePicker } from './DatePicker';
export type { DatePickerProps } from './DatePicker';

export { Popover, PopoverContent, PopoverTrigger } from './Popover';

export { Separator } from './Separator';

export {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from './Accordion';

export {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from './Sheet';

export {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from './Collapsible';

export { Layout, Header, Sider, Content, Footer } from './Layout';
export type {
  LayoutProps,
  HeaderProps,
  SiderProps,
  ContentProps,
  FooterProps,
} from './Layout';

export { Upload } from './Upload';
export type { UploadFile, UploadProps } from './Upload';

export { Collapse, Panel } from './Collapse';
export type { CollapseProps, PanelProps } from './Collapse';

// Message system - backward compatibility

export {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from './Resizable';

export { ScrollArea, ScrollBar } from './ScrollArea';

export {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  ChartStyle,
} from './Chart';
export type { ChartConfig } from './Chart';

export { default as CustomDialog } from './CustomDialog';
