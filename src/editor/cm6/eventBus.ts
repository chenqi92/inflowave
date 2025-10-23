/**
 * CodeMirror 6 Event Bus
 * 
 * Provides a centralized event system for editor-related events
 * Supports: onRun, onFormat, onCompletion, onDialectChange
 */

export type EditorEventType = 
  | 'run'
  | 'format'
  | 'completion'
  | 'dialectChange'
  | 'contentChange'
  | 'selectionChange'
  | 'focus'
  | 'blur';

export interface EditorEvent<T = any> {
  type: EditorEventType;
  payload: T;
  timestamp: number;
}

export interface RunEvent {
  mode: 'selected' | 'current' | 'all';
  content?: string;
}

export interface FormatEvent {
  dialect: string;
}

export interface CompletionEvent {
  trigger: 'manual' | 'auto';
  position: number;
}

export interface DialectChangeEvent {
  from: string;
  to: string;
}

export interface ContentChangeEvent {
  content: string;
  changes: any;
}

export interface SelectionChangeEvent {
  from: number;
  to: number;
  text: string;
}

type EventCallback<T = any> = (event: EditorEvent<T>) => void;

/**
 * Event Bus for CodeMirror 6 Editor
 */
export class EditorEventBus {
  private listeners: Map<EditorEventType, Set<EventCallback>> = new Map();
  private eventHistory: EditorEvent[] = [];
  private maxHistorySize = 100;

  /**
   * Subscribe to an event
   */
  on<T = any>(type: EditorEventType, callback: EventCallback<T>): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    
    this.listeners.get(type)!.add(callback as EventCallback);
    
    // Return unsubscribe function
    return () => {
      this.off(type, callback);
    };
  }

  /**
   * Unsubscribe from an event
   */
  off<T = any>(type: EditorEventType, callback: EventCallback<T>): void {
    const callbacks = this.listeners.get(type);
    if (callbacks) {
      callbacks.delete(callback as EventCallback);
    }
  }

  /**
   * Emit an event
   */
  emit<T = any>(type: EditorEventType, payload: T): void {
    const event: EditorEvent<T> = {
      type,
      payload,
      timestamp: Date.now(),
    };

    // Add to history
    this.eventHistory.push(event);
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }

    // Notify listeners
    const callbacks = this.listeners.get(type);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(event);
        } catch (error) {
          console.error(`Error in event listener for ${type}:`, error);
        }
      });
    }
  }

  /**
   * Subscribe to an event once
   */
  once<T = any>(type: EditorEventType, callback: EventCallback<T>): () => void {
    const wrappedCallback = (event: EditorEvent<T>) => {
      callback(event);
      this.off(type, wrappedCallback);
    };
    
    return this.on(type, wrappedCallback);
  }

  /**
   * Clear all listeners for a specific event type
   */
  clear(type?: EditorEventType): void {
    if (type) {
      this.listeners.delete(type);
    } else {
      this.listeners.clear();
    }
  }

  /**
   * Get event history
   */
  getHistory(type?: EditorEventType, limit?: number): EditorEvent[] {
    let history = type 
      ? this.eventHistory.filter(e => e.type === type)
      : this.eventHistory;
    
    if (limit) {
      history = history.slice(-limit);
    }
    
    return history;
  }

  /**
   * Clear event history
   */
  clearHistory(): void {
    this.eventHistory = [];
  }
}

/**
 * Global event bus instance
 */
export const editorEventBus = new EditorEventBus();

/**
 * Convenience functions for common events
 */
export const editorEvents = {
  /**
   * Emit a run event
   */
  run(mode: RunEvent['mode'], content?: string): void {
    editorEventBus.emit<RunEvent>('run', { mode, content });
  },

  /**
   * Emit a format event
   */
  format(dialect: string): void {
    editorEventBus.emit<FormatEvent>('format', { dialect });
  },

  /**
   * Emit a completion event
   */
  completion(trigger: CompletionEvent['trigger'], position: number): void {
    editorEventBus.emit<CompletionEvent>('completion', { trigger, position });
  },

  /**
   * Emit a dialect change event
   */
  dialectChange(from: string, to: string): void {
    editorEventBus.emit<DialectChangeEvent>('dialectChange', { from, to });
  },

  /**
   * Emit a content change event
   */
  contentChange(content: string, changes: any): void {
    editorEventBus.emit<ContentChangeEvent>('contentChange', { content, changes });
  },

  /**
   * Emit a selection change event
   */
  selectionChange(from: number, to: number, text: string): void {
    editorEventBus.emit<SelectionChangeEvent>('selectionChange', { from, to, text });
  },

  /**
   * Emit a focus event
   */
  focus(): void {
    editorEventBus.emit('focus', {});
  },

  /**
   * Emit a blur event
   */
  blur(): void {
    editorEventBus.emit('blur', {});
  },

  /**
   * Subscribe to run events
   */
  onRun(callback: (event: EditorEvent<RunEvent>) => void): () => void {
    return editorEventBus.on('run', callback);
  },

  /**
   * Subscribe to format events
   */
  onFormat(callback: (event: EditorEvent<FormatEvent>) => void): () => void {
    return editorEventBus.on('format', callback);
  },

  /**
   * Subscribe to completion events
   */
  onCompletion(callback: (event: EditorEvent<CompletionEvent>) => void): () => void {
    return editorEventBus.on('completion', callback);
  },

  /**
   * Subscribe to dialect change events
   */
  onDialectChange(callback: (event: EditorEvent<DialectChangeEvent>) => void): () => void {
    return editorEventBus.on('dialectChange', callback);
  },

  /**
   * Subscribe to content change events
   */
  onContentChange(callback: (event: EditorEvent<ContentChangeEvent>) => void): () => void {
    return editorEventBus.on('contentChange', callback);
  },

  /**
   * Subscribe to selection change events
   */
  onSelectionChange(callback: (event: EditorEvent<SelectionChangeEvent>) => void): () => void {
    return editorEventBus.on('selectionChange', callback);
  },

  /**
   * Subscribe to focus events
   */
  onFocus(callback: (event: EditorEvent<{}>) => void): () => void {
    return editorEventBus.on('focus', callback);
  },

  /**
   * Subscribe to blur events
   */
  onBlur(callback: (event: EditorEvent<{}>) => void): () => void {
    return editorEventBus.on('blur', callback);
  },
};

