// Shadcn/ui Components Export
export { Button, buttonVariants } from './button';
export type { ButtonProps } from './button';

export { Input } from './input';

export { SearchInput } from './search-input';

export {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './select';

export {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from './card';

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
} from './context-menu';

export {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './dialog';

export {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from './table';

// DataTable已移除，统一使用UnifiedDataTable
export { UnifiedDataTable } from './unified-data-table';
export type {
  UnifiedDataTableProps,
  DataRow as UnifiedDataRow,
  ColumnConfig as UnifiedColumnConfig,
  SortConfig as UnifiedSortConfig,
  FilterConfig as UnifiedFilterConfig,
  PaginationConfig as UnifiedPaginationConfig
} from './unified-data-table';

// 新的高性能数据表格组件 - 基于 Glide Data Grid
export { GlideDataTable } from './glide-data-table';
export type {
  GlideDataTableProps,
  DataRow,
  ColumnConfig,
  SortConfig,
  FilterConfig,
  PaginationConfig
} from './glide-data-table';

export { Skeleton } from './skeleton';

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
} from './skeleton-layouts';
export type {
  TableSkeletonProps,
  CardSkeletonProps,
  ListSkeletonProps,
  TreeSkeletonProps,
  FormSkeletonProps,
  ChartSkeletonProps,
  DetailSkeletonProps,
  ContentSkeletonProps,
} from './skeleton-layouts';

// 加载状态组件
export {
  LoadingState,
  InlineLoading,
  PageLoading,
  CardLoading,
  EmptyLoading,
} from './loading-state';
export type {
  LoadingStateProps,
  InlineLoadingProps,
  PageLoadingProps,
  CardLoadingProps,
  EmptyLoadingProps,
} from './loading-state';

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
export { ErrorAlert, SimpleErrorAlert } from './error-alert';
export type { ErrorAlertProps } from './error-alert';

export { Avatar, AvatarFallback, AvatarImage } from './avatar';

export { Checkbox } from './checkbox';

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
} from './dropdown-menu';

// Alias for backward compatibility
export { DropdownMenu as Dropdown } from './dropdown-menu';

export {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  useFormField,
} from './form';

export { Label } from './label';

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
} from './navigation-menu';

export { RadioGroup, RadioGroupItem } from './radio-group';

export { Slider } from './slider';

export { Switch } from './switch';

export { Textarea } from './textarea';

export { Badge, badgeVariants } from './badge';

export { Alert, AlertDescription, AlertTitle } from './alert';

export { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs';

export { Progress } from './progress';

export { Result } from './result';
export type { ResultProps } from './result';

import { Title, Text, Paragraph, CodeBlock, InlineCode } from './typography';

export {
  Title,
  Text,
  Paragraph,
  AntParagraph,
  CodeBlock,
  InlineCode,
} from './typography';
export type { TypographyProps, AntParagraphProps } from './typography';

// Export Typography as a namespace object
export const Typography = {
  Title,
  Text,
  Paragraph,
  CodeBlock,
  InlineCode,
};

export { Empty, EmptyDatabase, EmptySearch } from './empty';
export type { EmptyProps } from './empty';

export { Spin } from './spin';
export type { SpinProps } from './spin';

export { Tag, tagVariants } from './tag';

export { Space } from './space';
export type { SpaceProps } from './space';

export { List, ListItem, ListItemMeta } from './list';
export type { ListProps, ListItemProps, ListItemMetaProps } from './list';

export { Statistic } from './statistic';
export type { StatisticProps } from './statistic';

export { Row, Col } from './grid';
export type { RowProps, ColProps } from './grid';

export { Menu, MenuItem, MenuDivider } from './menu';
export type { MenuProps, MenuItemConfig } from './menu';

export { Popconfirm } from './popconfirm';
export type { PopconfirmProps } from './popconfirm';

export {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
  TooltipWrapper,
} from './tooltip';
export type { TooltipWrapperProps } from './tooltip';

export { InputNumber } from './input-number';
export type { InputNumberProps } from './input-number';

export { Steps, Step } from './steps';
export type { StepsProps, StepProps, StepItem } from './steps';

export { Descriptions, DescriptionsItem } from './descriptions';
export type {
  DescriptionsProps,
  DescriptionsItemProps,
  DescriptionItem,
} from './descriptions';

export { Timeline, TimelineItem } from './timeline';
export type {
  TimelineProps,
  TimelineItemProps,
  TimelineItemData,
} from './timeline';

export { DatePicker } from './date-picker';
export type { DatePickerProps } from './date-picker';

export { Popover, PopoverContent, PopoverTrigger } from './popover';

export { Separator } from './separator';

export {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from './accordion';

export {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from './sheet';

export {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from './collapsible';

export { Layout, Header, Sider, Content, Footer } from './layout';
export type {
  LayoutProps,
  HeaderProps,
  SiderProps,
  ContentProps,
  FooterProps,
} from './layout';

export { Upload } from './upload';
export type { UploadFile, UploadProps } from './upload';

export { Collapse, Panel } from './collapse';
export type { CollapseProps, PanelProps } from './collapse';

// Message system - backward compatibility

export {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from './resizable';

export { ScrollArea, ScrollBar } from './scroll-area';

export {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  ChartStyle,
} from './chart';
export type { ChartConfig } from './chart';

export { default as CustomDialog } from './custom-dialog';
