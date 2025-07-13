import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button, Card, Alert, Text, Collapse, Panel } from '@/components/ui';
import { Bug, RefreshCw, FileText } from 'lucide-react';
import { AlertTriangle } from 'lucide-react';
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
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
          <div className="max-w-2xl w-full">
            <Result
              status="error"
              icon={<Bug className="w-4 h-4 text-red-500"   />}
              title="应用程序发生错误"
              subTitle={
                <div className="space-y-2">
                  <Text type="secondary">
                    很抱歉，应用程序遇到了一个意外错误。错误已被记录，您可以尝试以下操作：
                  </Text>
                  {errorId && (
                    <Text code className="text-xs">
                      错误 ID: {errorId}
                    </Text>
                  )}
                </div>
              }
              extra={
                <div className="flex gap-2" size="middle" wrap>
                  <Button 
                    type="primary" 
                    icon={<RefreshCw className="w-4 h-4"  />}
                    onClick={this.handleReload}
                  >
                    重新加载页面
                  </Button>
                  <Button 
                    icon={<AlertTriangle />}
                    onClick={this.handleReset}
                  >
                    尝试恢复
                  </Button>
                  <Button 
                    icon={<FileText className="w-4 h-4"  />}
                    onClick={this.handleReportError}
                  >
                    保存错误报告
                  </Button>
                </div>
              }
            />

            {/* 错误详情（开发环境） */}
            {(import.meta.env?.DEV || window.location.search.includes('debug=1')) && (
              <div className="mt-6">
                <Collapse ghost>
                  <Panel 
                    header={
                      <Text strong className="text-red-600">
                        🔍 错误详情 (开发模式)
                      </Text>
                    } 
                    key="error-details"
                  >
                    <div className="space-y-4">
                      {error && (
                        <div>
                          <Text strong>错误消息:</Text>
                          <Paragraph 
                            code 
                            copyable 
                            className="bg-red-50 p-3 rounded border border-red-200"
                          >
                            {error.message}
                          </Paragraph>
                        </div>
                      )}

                      {error?.stack && (
                        <div>
                          <Text strong>错误堆栈:</Text>
                          <Paragraph 
                            code 
                            copyable 
                            className="bg-gray-50 p-3 rounded border text-xs"
                            style={{ whiteSpace: 'pre-wrap' }}
                          >
                            {error.stack}
                          </Paragraph>
                        </div>
                      )}

                      {errorInfo?.componentStack && (
                        <div>
                          <Text strong>组件堆栈:</Text>
                          <Paragraph 
                            code 
                            copyable 
                            className="bg-blue-50 p-3 rounded border text-xs"
                            style={{ whiteSpace: 'pre-wrap' }}
                          >
                            {errorInfo.componentStack}
                          </Paragraph>
                        </div>
                      )}

                      <div>
                        <Text strong>环境信息:</Text>
                        <Paragraph 
                          code 
                          className="bg-gray-50 p-3 rounded border text-xs"
                        >
                          <div>URL: {window.location.href}</div>
                          <div>用户代理: {navigator.userAgent}</div>
                          <div>时间戳: {new Date().toISOString()}</div>
                          <div>会话 ID: {errorLogger.getSessionId()}</div>
                        </Paragraph>
                      </div>
                    </div>
                  </Panel>
                </Collapse>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;