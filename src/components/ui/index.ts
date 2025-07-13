// Shadcn/ui Components Export
export { Button, buttonVariants } from './Button';
export type { ButtonProps } from './Button';

export { Input } from './Input';
export type { InputProps } from './Input';

export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './Select';

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent } from './Card';

export { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './Dialog';

export { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from './Table';

export { Skeleton } from './Skeleton';

export { Toast, ToastAction, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from './Toast';
export { Toaster } from './Toaster';
export { useToast, toast } from '../../hooks/use-toast';

export { Avatar, AvatarFallback, AvatarImage } from './Avatar';

export { Breadcrumb, BreadcrumbEllipsis, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from './Breadcrumb';

export { Checkbox } from './Checkbox';

export { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuPortal, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuShortcut, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from './DropdownMenu';

// Alias for backward compatibility
export { DropdownMenu as Dropdown } from './DropdownMenu';

export { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage, useFormField } from './Form';

export { Label } from './Label';

export { NavigationMenu, NavigationMenuContent, NavigationMenuIndicator, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, NavigationMenuTrigger, NavigationMenuViewport, navigationMenuTriggerStyle } from './NavigationMenu';

export { RadioGroup, RadioGroupItem } from './RadioGroup';

export { Slider } from './Slider';

export { Switch } from './Switch';

export { Textarea } from './Textarea';

export { Badge, badgeVariants } from './Badge';

export { Alert, AlertDescription, AlertTitle } from './Alert';

export { Tabs, TabsContent, TabsList, TabsTrigger } from './Tabs';

export { Progress } from './Progress';

import { Title, Text, Paragraph } from './Typography';

export { Title, Text, Paragraph } from './Typography';
export type { TypographyProps } from './Typography';

// Export Typography as a namespace object
export const Typography = {
  Title,
  Text,
  Paragraph
};

export { Empty, EmptyDatabase, EmptySearch } from './Empty';
export type { EmptyProps } from './Empty';

export { Spin } from './Spin';
export type { SpinProps } from './Spin';

export { Tag, tagVariants } from './Tag';

export { Divider } from './Divider';
export type { DividerProps } from './Divider';

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

export { Modal, ModalPortal, ModalOverlay, ModalClose, ModalTrigger, ModalContent, ModalHeader, ModalFooter, ModalTitle, ModalDescription } from './Modal';

export { Popconfirm } from './Popconfirm';
export type { PopconfirmProps } from './Popconfirm';

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider, TooltipWrapper } from './Tooltip';
export type { TooltipWrapperProps } from './Tooltip';

export { InputNumber } from './InputNumber';
export type { InputNumberProps } from './InputNumber';

export { Steps, Step } from './Steps';
export type { StepsProps, StepProps, StepItem } from './Steps';

export { Descriptions, DescriptionsItem } from './Descriptions';
export type { DescriptionsProps, DescriptionsItemProps, DescriptionItem } from './Descriptions';

export { Timeline, TimelineItem } from './Timeline';
export type { TimelineProps, TimelineItemProps, TimelineItemType } from './Timeline';

export { Tree } from './Tree';
export type { TreeProps, TreeNode } from './Tree';

export { DatePicker } from './DatePicker';
export type { DatePickerProps } from './DatePicker';

export { Popover, PopoverContent, PopoverTrigger } from './popover';

export { Separator } from './Separator';

export { Layout, Header, Sider, Content, Footer } from './Layout';
export type { LayoutProps, HeaderProps, SiderProps, ContentProps, FooterProps } from './Layout';

export { Upload } from './Upload';
export type { UploadFile, UploadProps } from './Upload';

export { Collapse, Panel } from './Collapse';
export type { CollapseProps, PanelProps } from './Collapse';

// Message system - backward compatibility
export { toast as message } from '../../hooks/use-toast';
