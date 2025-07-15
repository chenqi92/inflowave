import React, { Component, ErrorInfo, ReactNode } from 'react';
import {
  Button,
  Alert,
  AlertTitle,
  AlertDescription,
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  ScrollArea,
  Text,
  CodeBlock,
  Space
} from '@/components/ui';
import { Bug, RefreshCw, FileText, AlertTriangle, Copy } from 'lucide-react';
import { errorLogger } from '@/utils/errorLogger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null};
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorId: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`};
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      errorInfo});

    // 记录到错误日志系统
    errorLogger.logReactError(error, errorInfo);

    // 调用自定义错误处理器
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // 发送到控制台
    console.group('🔴 React Error Boundary Caught Error');
    console.error('Error:', error);
    console.error('Error Info:', errorInfo);
    console.error('Component Stack:', errorInfo.componentStack);
    console.groupEnd();
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null});
  };

  handleReportError = async () => {
    const { error, errorInfo, errorId } = this.state;
    
    try {
      // 创建详细的错误报告
      const errorReport = {
        id: errorId,
        timestamp: new Date().toISOString(),
        error: {
          name: error?.name,
          message: error?.message,
          stack: error?.stack},
        errorInfo: {
          componentStack: errorInfo?.componentStack},
        userAgent: navigator.userAgent,
        url: window.location.href,
        sessionId: errorLogger.getSessionId()};

      // 记录详细报告
      await errorLogger.logCustomError(
        `Detailed React Error Report for ${errorId}`,
        errorReport
      );

      console.log('错误报告已记录:', errorReport);
      alert('错误报告已保存到日志文件中');
    } catch (err) {
      console.error('无法保存错误报告:', err);
    }
  };

  render() {
    if (this.state.hasError) {
      // 如果有自定义 fallback，使用它
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { error, errorInfo, errorId } = this.state;

      return (
        <div className="h-screen flex items-center justify-center p-4 bg-muted/50">
          <ScrollArea className="max-w-4xl w-full max-h-[90vh]">
            <div className="p-6">
              {/* 主要错误信息 */}
              <Alert variant="destructive" className="mb-6">
                <Bug className="h-4 w-4" />
                <AlertTitle className="text-lg font-semibold">应用程序发生错误</AlertTitle>
                <AlertDescription className="mt-2">
                  <div className="space-y-3">
                    <Text variant="muted">
                      很抱歉，应用程序遇到了一个意外错误。错误已被记录，您可以尝试以下操作：
                    </Text>
                    {errorId && (
                      <div className="bg-muted/50 p-2 rounded border font-mono text-xs">
                        错误 ID: {errorId}
                      </div>
                    )}
                  </div>
                </AlertDescription>
              </Alert>

              {/* 操作按钮 */}
              <Space size="middle" className="mb-6">
                <Button
                  variant="default"
                  onClick={this.handleReload}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  重新加载页面
                </Button>
                <Button
                  variant="outline"
                  onClick={this.handleReset}
                  className="flex items-center gap-2"
                >
                  <AlertTriangle className="w-4 h-4" />
                  尝试恢复
                </Button>
                <Button
                  variant="outline"
                  onClick={this.handleReportError}
                  className="flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  保存错误报告
                </Button>
              </Space>

              {/* 错误详情（开发环境） */}
              {(import.meta.env?.DEV || window.location.search.includes('debug=1')) && (
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="error-details">
                    <AccordionTrigger className="text-destructive font-semibold">
                      🔍 错误详情 (开发模式)
                    </AccordionTrigger>
                    <AccordionContent>
                      <ScrollArea className="max-h-96">
                        <div className="space-y-6 pr-4">
                          {error && (
                            <div className="space-y-2">
                              <Text className="font-semibold">错误消息:</Text>
                              <div className="relative">
                                <CodeBlock
                                  className="bg-destructive/10 border border-destructive text-sm p-3 rounded"
                                >
                                  {error.message}
                                </CodeBlock>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="absolute top-2 right-2 h-6 w-6 p-0"
                                  onClick={() => navigator.clipboard.writeText(error.message)}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          )}

                          {error?.stack && (
                            <div className="space-y-2">
                              <Text className="font-semibold">错误堆栈:</Text>
                              <div className="relative">
                                <CodeBlock
                                  className="bg-muted/50 border text-xs p-3 rounded max-h-48 overflow-auto"
                                >
                                  {error.stack}
                                </CodeBlock>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="absolute top-2 right-2 h-6 w-6 p-0"
                                  onClick={() => navigator.clipboard.writeText(error.stack || '')}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          )}

                          {errorInfo?.componentStack && (
                            <div className="space-y-2">
                              <Text className="font-semibold">组件堆栈:</Text>
                              <div className="relative">
                                <CodeBlock
                                  className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 text-xs p-3 rounded max-h-48 overflow-auto"
                                >
                                  {errorInfo.componentStack}
                                </CodeBlock>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="absolute top-2 right-2 h-6 w-6 p-0"
                                  onClick={() => navigator.clipboard.writeText(errorInfo.componentStack || '')}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          )}

                          <div className="space-y-2">
                            <Text className="font-semibold">环境信息:</Text>
                            <div className="bg-muted/50 p-3 rounded border text-xs font-mono space-y-1">
                              <div><strong>URL:</strong> {window.location.href}</div>
                              <div><strong>用户代理:</strong> {navigator.userAgent}</div>
                              <div><strong>时间戳:</strong> {new Date().toISOString()}</div>
                              <div><strong>会话 ID:</strong> {errorLogger.getSessionId()}</div>
                            </div>
                          </div>
                        </div>
                      </ScrollArea>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              )}
            </div>
          </ScrollArea>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;