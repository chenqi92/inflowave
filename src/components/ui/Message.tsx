import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/utils/cn';

export interface MessageInstance {
  key: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'loading';
  content: React.ReactNode;
  duration?: number;
  onClose?: () => void;
}

interface MessageContainerProps {
  messages: MessageInstance[];
  onRemove: (key: string) => void;
}

const MessageContainer: React.FC<MessageContainerProps> = ({ messages, onRemove }) => {
  const typeStyles = {
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    success: 'bg-green-50 border-green-200 text-green-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    loading: 'bg-blue-50 border-blue-200 text-blue-800',
  };

  const icons = {
    info: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
      </svg>
    ),
    success: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
    ),
    warning: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
    ),
    error: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
      </svg>
    ),
    loading: (
      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
      </svg>
    ),
  };

  useEffect(() => {
    messages.forEach((message) => {
      if (message.duration !== 0 && message.type !== 'loading') {
        const timer = setTimeout(() => {
          onRemove(message.key);
          message.onClose?.();
        }, message.duration || 3000);

        return () => clearTimeout(timer);
      }
    });
  }, [messages, onRemove]);

  if (messages.length === 0) return null;

  return createPortal(
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 space-y-2">
      {messages.map((message) => (
        <div
          key={message.key}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-md border shadow-lg',
            'animate-in slide-in-from-top-2 duration-300',
            typeStyles[message.type]
          )}
        >
          {icons[message.type]}
          <span className="text-sm font-medium">{message.content}</span>
        </div>
      ))}
    </div>,
    document.body
  );
};

// Message API
class MessageAPI {
  private messages: MessageInstance[] = [];
  private listeners: ((messages: MessageInstance[]) => void)[] = [];
  private keyCounter = 0;

  private notify() {
    this.listeners.forEach(listener => listener([...this.messages]));
  }

  private add(type: MessageInstance['type'], content: React.ReactNode, duration?: number) {
    const key = `message-${++this.keyCounter}`;
    const message: MessageInstance = {
      key,
      type,
      content,
      duration,
      onClose: () => this.remove(key),
    };

    this.messages.push(message);
    this.notify();
    return key;
  }

  private remove(key: string) {
    this.messages = this.messages.filter(msg => msg.key !== key);
    this.notify();
  }

  info(content: React.ReactNode, duration?: number) {
    return this.add('info', content, duration);
  }

  success(content: React.ReactNode, duration?: number) {
    return this.add('success', content, duration);
  }

  warning(content: React.ReactNode, duration?: number) {
    return this.add('warning', content, duration);
  }

  error(content: React.ReactNode, duration?: number) {
    return this.add('error', content, duration);
  }

  loading(content: React.ReactNode, duration = 0) {
    return this.add('loading', content, duration);
  }

  destroy(key?: string) {
    if (key) {
      this.remove(key);
    } else {
      this.messages = [];
      this.notify();
    }
  }

  subscribe(listener: (messages: MessageInstance[]) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }
}

export const message = new MessageAPI();

// Message Provider Component
export const MessageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [messages, setMessages] = useState<MessageInstance[]>([]);

  useEffect(() => {
    return message.subscribe(setMessages);
  }, []);

  return (
    <>
      {children}
      <MessageContainer messages={messages} onRemove={(key) => message.destroy(key)} />
    </>
  );
};
