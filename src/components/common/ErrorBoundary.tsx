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
  Space,
  CustomDialog,
} from '@/components/ui';
import { Bug, RefreshCw, FileText, AlertTriangle, Copy } from 'lucide-react';
import { errorLogger } from '@/utils/errorLogger';
import { showMessage } from '@/utils/message';

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
  dialogState: {
    isOpen: boolean;
    message: string;
    type: 'info' | 'error';
  };
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      dialogState: {
        isOpen: false,
        message: '',
        type: 'info',
      },
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorId: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      errorInfo,
    });

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

  showDialog = (message: string, type: 'info' | 'error' = 'info') => {
    this.setState({
      dialogState: {
        isOpen: true,
        message,
        type,
      },
    });
  };

  hideDialog = () => {
    this.setState({
      dialogState: {
        isOpen: false,
        message: '',
        type: 'info',
      },
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    });
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
          stack: error?.stack,
        },
        errorInfo: {
          componentStack: errorInfo?.componentStack,
        },
        userAgent: navigator.userAgent,
        url: window.location.href,
        sessionId: errorLogger.getSessionId(),
      };

      const reportContent = JSON.stringify(errorReport, null, 2);
      const fileName = `error-report-${errorId}-${new Date().toISOString().split('T')[0]}.json`;

      // 尝试使用 Tauri 文件保存对话框
      try {
        const { safeTauriInvoke } = await import('@/utils/tauri');

        const result = await safeTauriInvoke<{ path?: string }>('save_file_dialog', {
          defaultPath: fileName,
          filters: [
            { name: 'JSON Files', extensions: ['json'] },
            { name: 'All Files', extensions: ['*'] },
          ],
        });

        if (result?.path) {
          await safeTauriInvoke<void>('write_file', {
            path: result.path,
            content: reportContent,
          });
          this.showDialog(`错误报告已保存到: ${result.path}`, 'info');
          return; // 成功保存，直接返回
        } else {
          console.log('用户取消了文件保存对话框');
        }
      } catch (tauriError) {
        console.warn('Tauri 文件保存失败，尝试浏览器方法:', tauriError);
      }

      // 如果 Tauri API 不可用，尝试浏览器文件保存
      try {
        if ('showSaveFilePicker' in window) {
          const fileHandle = await (window as any).showSaveFilePicker({
            suggestedName: fileName,
            types: [
              {
                description: 'JSON files',
                accept: { 'application/json': ['.json'] },
              },
            ],
          });

          const writable = await fileHandle.createWritable();
          await writable.write(reportContent);
          await writable.close();
          this.showDialog(`错误报告已保存到: ${fileHandle.name}`, 'info');
          return; // 成功保存，直接返回
        }
      } catch (browserError) {
        console.warn('浏览器文件保存失败，使用下载方式:', browserError);
      }

      // 降级到下载
      try {
        const blob = new Blob([reportContent], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        this.showDialog(`错误报告已下载: ${fileName}`, 'info');
      } catch (downloadError) {
        console.error('下载失败:', downloadError);
        throw downloadError;
      }

      // 同时记录到日志系统
      await errorLogger.logCustomError(
        `Detailed React Error Report for ${errorId}`,
        errorReport
      );
    } catch (err) {
      console.error('无法保存错误报告:', err);
      this.showDialog('保存错误报告失败，请查看控制台获取详细信息', 'error');
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
        <div className='h-screen flex items-center justify-center p-4 bg-muted/50'>
          <div className='max-w-4xl w-full max-h-[90vh] flex flex-col'>
            <div className='p-6 flex-shrink-0'>
              {/* 主要错误信息 */}
              <Alert variant='destructive' className='mb-6'>
                <Bug className='h-4 w-4' />
                <AlertTitle className='text-lg font-semibold'>
                  应用程序发生错误
                </AlertTitle>
                <AlertDescription className='mt-2'>
                  <div className='space-y-3'>
                    <Text variant='muted'>
                      很抱歉，应用程序遇到了一个意外错误。错误已被记录，您可以尝试以下操作：
                    </Text>
                    {errorId && (
                      <div className='bg-muted/50 p-2 rounded border font-mono text-xs break-all'>
                        错误 ID: {errorId}
                      </div>
                    )}
                  </div>
                </AlertDescription>
              </Alert>

              {/* 操作按钮 */}
              <Space size='middle' className='mb-6'>
                <Button
                  variant='default'
                  onClick={this.handleReload}
                  className='flex items-center gap-2'
                >
                  <RefreshCw className='w-4 h-4' />
                  重新加载页面
                </Button>
                <Button
                  variant='outline'
                  onClick={this.handleReset}
                  className='flex items-center gap-2'
                >
                  <AlertTriangle className='w-4 h-4' />
                  尝试恢复
                </Button>
                <Button
                  variant='outline'
                  onClick={this.handleReportError}
                  className='flex items-center gap-2'
                >
                  <FileText className='w-4 h-4' />
                  保存错误报告
                </Button>
              </Space>
            </div>

            {/* 错误详情（开发环境） */}
            <div className='flex-1 min-h-0'>
              {(import.meta.env?.DEV ||
                window.location.search.includes('debug=1')) && (
                <Accordion type='single' collapsible className='w-full h-full'>
                  <AccordionItem value='error-details' className='h-full'>
                    <AccordionTrigger className='text-destructive font-semibold px-6'>
                      🔍 错误详情 (开发模式)
                    </AccordionTrigger>
                    <AccordionContent className='px-6 pb-6 h-full'>
                      <ScrollArea className='h-[50vh]'>
                        <div className='space-y-6 pr-4'>
                          {error && (
                            <div className='space-y-2'>
                              <div className='flex items-center justify-between'>
                                <Text className='font-semibold'>错误消息:</Text>
                                <Button
                                  variant='ghost'
                                  size='sm'
                                  className='h-6 w-6 p-0'
                                  onClick={async () => {
                                    try {
                                      await navigator.clipboard.writeText(
                                        error.message
                                      );
                                    } catch (err) {
                                      console.warn(
                                        '复制到剪贴板失败，使用备用方法:',
                                        err
                                      );
                                      // 备用方法：创建临时文本区域
                                      const textArea =
                                        document.createElement('textarea');
                                      textArea.value = error.message;
                                      document.body.appendChild(textArea);
                                      textArea.select();
                                      document.execCommand('copy');
                                      document.body.removeChild(textArea);
                                    }
                                  }}
                                >
                                  <Copy className='h-3 w-3' />
                                </Button>
                              </div>
                              <CodeBlock className='bg-destructive/10 border border-destructive text-sm p-3 rounded whitespace-pre-wrap break-words'>
                                {error.message}
                              </CodeBlock>
                            </div>
                          )}

                          {error?.stack && (
                            <div className='space-y-2'>
                              <div className='flex items-center justify-between'>
                                <Text className='font-semibold'>错误堆栈:</Text>
                                <Button
                                  variant='ghost'
                                  size='sm'
                                  className='h-6 w-6 p-0'
                                  onClick={async () => {
                                    try {
                                      await navigator.clipboard.writeText(
                                        error.stack || ''
                                      );
                                    } catch (err) {
                                      console.warn(
                                        '复制到剪贴板失败，使用备用方法:',
                                        err
                                      );
                                      const textArea =
                                        document.createElement('textarea');
                                      textArea.value = error.stack || '';
                                      document.body.appendChild(textArea);
                                      textArea.select();
                                      document.execCommand('copy');
                                      document.body.removeChild(textArea);
                                    }
                                  }}
                                >
                                  <Copy className='h-3 w-3' />
                                </Button>
                              </div>
                              <ScrollArea className='max-h-64 border rounded'>
                                <CodeBlock className='bg-muted/50 text-xs p-3 whitespace-pre-wrap break-words'>
                                  {error.stack}
                                </CodeBlock>
                              </ScrollArea>
                            </div>
                          )}

                          {errorInfo?.componentStack && (
                            <div className='space-y-2'>
                              <div className='flex items-center justify-between'>
                                <Text className='font-semibold'>组件堆栈:</Text>
                                <Button
                                  variant='ghost'
                                  size='sm'
                                  className='h-6 w-6 p-0'
                                  onClick={async () => {
                                    try {
                                      await navigator.clipboard.writeText(
                                        errorInfo.componentStack || ''
                                      );
                                    } catch (err) {
                                      console.warn(
                                        '复制到剪贴板失败，使用备用方法:',
                                        err
                                      );
                                      const textArea =
                                        document.createElement('textarea');
                                      textArea.value =
                                        errorInfo.componentStack || '';
                                      document.body.appendChild(textArea);
                                      textArea.select();
                                      document.execCommand('copy');
                                      document.body.removeChild(textArea);
                                    }
                                  }}
                                >
                                  <Copy className='h-3 w-3' />
                                </Button>
                              </div>
                              <ScrollArea className='max-h-64 border border-blue-200 dark:border-blue-800 rounded'>
                                <CodeBlock className='bg-blue-50 dark:bg-blue-950/20 text-xs p-3 whitespace-pre-wrap break-words'>
                                  {errorInfo.componentStack}
                                </CodeBlock>
                              </ScrollArea>
                            </div>
                          )}

                          <div className='space-y-2'>
                            <Text className='font-semibold'>环境信息:</Text>
                            <div className='bg-muted/50 p-3 rounded border text-xs font-mono space-y-1'>
                              <div className='break-words'>
                                <strong>URL:</strong> {window.location.href}
                              </div>
                              <div className='break-words'>
                                <strong>用户代理:</strong> {navigator.userAgent}
                              </div>
                              <div>
                                <strong>时间戳:</strong>{' '}
                                {new Date().toISOString()}
                              </div>
                              <div>
                                <strong>会话 ID:</strong>{' '}
                                {errorLogger.getSessionId()}
                              </div>
                            </div>
                          </div>
                        </div>
                      </ScrollArea>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              )}
            </div>
          </div>
        </div>
      );
    }

    return (
      <>
        {this.props.children}
        <CustomDialog
          isOpen={this.state.dialogState.isOpen}
          onClose={this.hideDialog}
          options={{
            message: this.state.dialogState.message,
            type: this.state.dialogState.type,
            confirmText: '确定',
            onConfirm: this.hideDialog,
          }}
        />
      </>
    );
  }
}

export default ErrorBoundary;
