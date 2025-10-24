/**
 * 统一错误提示组件
 * 基于 shadcn/ui Alert 组件，提供友好的错误提示和恢复建议
 */

import React from 'react';
import {
  Alert,
  AlertTitle,
  AlertDescription,
} from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  AlertCircle,
  AlertTriangle,
  Info,
  XCircle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  HelpCircle,
  FileText,
  Wifi,
  Server,
  Key,
  Shield,
  CheckCircle,
  Folder,
  Lock,
  HardDrive,
  Code,
  Book,
  Layout,
  Activity,
  Settings,
  UserCheck,
} from 'lucide-react';
import { ErrorDetails, ErrorSeverity, RecoverySuggestion } from '@/types/error';
import { cn } from '@/lib/utils';

/**
 * 图标映射
 */
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  refresh: RefreshCw,
  'help-circle': HelpCircle,
  'file-text': FileText,
  wifi: Wifi,
  server: Server,
  key: Key,
  shield: Shield,
  'check-circle': CheckCircle,
  folder: Folder,
  lock: Lock,
  'hard-drive': HardDrive,
  code: Code,
  book: Book,
  layout: Layout,
  activity: Activity,
  settings: Settings,
  'user-check': UserCheck,
};

/**
 * 组件属性
 */
export interface ErrorAlertProps {
  /** 错误详情 */
  error: ErrorDetails;
  /** 是否显示技术详情 */
  showTechnicalDetails?: boolean;
  /** 是否可折叠 */
  collapsible?: boolean;
  /** 默认是否展开 */
  defaultExpanded?: boolean;
  /** 自定义类名 */
  className?: string;
  /** 关闭回调 */
  onClose?: () => void;
}

/**
 * 获取严重程度对应的图标
 */
const getSeverityIcon = (severity: ErrorSeverity) => {
  switch (severity) {
    case ErrorSeverity.INFO:
      return Info;
    case ErrorSeverity.WARNING:
      return AlertTriangle;
    case ErrorSeverity.ERROR:
      return AlertCircle;
    case ErrorSeverity.CRITICAL:
      return XCircle;
    default:
      return AlertCircle;
  }
};

/**
 * 获取严重程度对应的样式
 */
const getSeverityVariant = (severity: ErrorSeverity): 'default' | 'destructive' => {
  switch (severity) {
    case ErrorSeverity.INFO:
      return 'default';
    case ErrorSeverity.WARNING:
      return 'default';
    case ErrorSeverity.ERROR:
    case ErrorSeverity.CRITICAL:
      return 'destructive';
    default:
      return 'destructive';
  }
};

/**
 * 恢复建议项组件
 */
const SuggestionItem: React.FC<{
  suggestion: RecoverySuggestion;
  index: number;
}> = ({ suggestion, index }) => {
  const IconComponent = suggestion.icon ? ICON_MAP[suggestion.icon] : HelpCircle;

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
      <div className="flex-shrink-0 mt-0.5">
        {IconComponent && (
          <IconComponent className="w-4 h-4 text-muted-foreground" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm mb-1">{suggestion.title}</div>
        <div className="text-xs text-muted-foreground">{suggestion.description}</div>
      </div>
      {suggestion.action && suggestion.actionLabel && (
        <Button
          variant="outline"
          size="sm"
          onClick={suggestion.action}
          className="flex-shrink-0"
        >
          {suggestion.actionLabel}
        </Button>
      )}
    </div>
  );
};

/**
 * 错误提示组件
 */
export const ErrorAlert: React.FC<ErrorAlertProps> = ({
  error,
  showTechnicalDetails = false,
  collapsible = true,
  defaultExpanded = false,
  className,
  onClose,
}) => {
  const [isExpanded, setIsExpanded] = React.useState(defaultExpanded);
  const SeverityIcon = getSeverityIcon(error.severity);
  const variant = getSeverityVariant(error.severity);

  const hasSuggestions = error.suggestions && error.suggestions.length > 0;
  const hasTechnicalDetails = showTechnicalDetails && (error.technicalDetails || error.stack);

  return (
    <Alert variant={variant} className={cn('relative', className)}>
      <SeverityIcon className="h-4 w-4" />
      <AlertTitle className="flex items-center justify-between">
        <span>{error.friendlyMessage || error.message}</span>
        {onClose && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-6 w-6 p-0 hover:bg-transparent"
          >
            <XCircle className="h-4 w-4" />
          </Button>
        )}
      </AlertTitle>

      <AlertDescription className="mt-2 space-y-3">
        {/* 恢复建议 */}
        {hasSuggestions && (
          <div className="space-y-2">
            {collapsible ? (
              <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-between p-2 h-auto font-medium"
                  >
                    <span className="text-sm">
                      {isExpanded ? '隐藏' : '查看'}恢复建议 ({error.suggestions?.length})
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-2 mt-2">
                  <ScrollArea className="max-h-[300px]">
                    <div className="space-y-2 pr-4">
                      {error.suggestions?.map((suggestion, index) => (
                        <SuggestionItem
                          key={index}
                          suggestion={suggestion}
                          index={index}
                        />
                      ))}
                    </div>
                  </ScrollArea>
                </CollapsibleContent>
              </Collapsible>
            ) : (
              <div className="space-y-2">
                <div className="text-sm font-medium mb-2">恢复建议：</div>
                <ScrollArea className="max-h-[300px]">
                  <div className="space-y-2 pr-4">
                    {error.suggestions?.map((suggestion, index) => (
                      <SuggestionItem
                        key={index}
                        suggestion={suggestion}
                        index={index}
                      />
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>
        )}

        {/* 技术详情 */}
        {hasTechnicalDetails && (
          <Collapsible>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-between p-2 h-auto font-medium text-xs"
              >
                <span>技术详情</span>
                <ChevronDown className="h-3 w-3" />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              <ScrollArea className="max-h-[200px]">
                <div className="p-3 rounded-lg bg-muted/50 font-mono text-xs space-y-2">
                  {error.technicalDetails && (
                    <div>
                      <div className="font-semibold mb-1">详情：</div>
                      <div className="text-muted-foreground whitespace-pre-wrap">
                        {error.technicalDetails}
                      </div>
                    </div>
                  )}
                  {error.stack && (
                    <div>
                      <div className="font-semibold mb-1">堆栈跟踪：</div>
                      <div className="text-muted-foreground whitespace-pre-wrap">
                        {error.stack}
                      </div>
                    </div>
                  )}
                  {error.context && Object.keys(error.context).length > 0 && (
                    <div>
                      <div className="font-semibold mb-1">上下文：</div>
                      <div className="text-muted-foreground whitespace-pre-wrap">
                        {JSON.stringify(error.context, null, 2)}
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CollapsibleContent>
          </Collapsible>
        )}
      </AlertDescription>
    </Alert>
  );
};

/**
 * 简化的错误提示组件（仅显示消息）
 */
export const SimpleErrorAlert: React.FC<{
  message: string;
  severity?: ErrorSeverity;
  className?: string;
  onClose?: () => void;
}> = ({ message, severity = ErrorSeverity.ERROR, className, onClose }) => {
  const SeverityIcon = getSeverityIcon(severity);
  const variant = getSeverityVariant(severity);

  return (
    <Alert variant={variant} className={cn('relative', className)}>
      <SeverityIcon className="h-4 w-4" />
      <AlertTitle className="flex items-center justify-between">
        <span>{message}</span>
        {onClose && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-6 w-6 p-0 hover:bg-transparent"
          >
            <XCircle className="h-4 w-4" />
          </Button>
        )}
      </AlertTitle>
    </Alert>
  );
};

export default ErrorAlert;

