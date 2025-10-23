/**
 * CodeMirror 6 Telemetry & Performance Monitoring
 * 
 * Tracks performance metrics for the editor to help identify bottlenecks
 * and ensure smooth user experience.
 */

import { logger } from '@/utils/logger';

/**
 * Performance metric types
 */
export type MetricType = 
  | 'editor.render'
  | 'editor.format'
  | 'editor.completion'
  | 'editor.document.size'
  | 'editor.selection.change'
  | 'editor.content.change'
  | 'editor.dialect.change';

/**
 * Performance metric data
 */
export interface PerformanceMetric {
  type: MetricType;
  timestamp: number;
  duration?: number;
  value?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Telemetry configuration
 */
export interface TelemetryConfig {
  enabled: boolean;
  logToConsole: boolean;
  logThreshold: number; // Only log metrics slower than this (ms)
  maxMetrics: number; // Maximum number of metrics to keep in memory
}

/**
 * Default telemetry configuration
 */
const DEFAULT_CONFIG: TelemetryConfig = {
  enabled: true,
  logToConsole: true,
  logThreshold: 100, // Log operations taking more than 100ms
  maxMetrics: 1000,
};

/**
 * Telemetry service for tracking editor performance
 */
class EditorTelemetry {
  private config: TelemetryConfig;
  private metrics: PerformanceMetric[] = [];
  private timers: Map<string, number> = new Map();

  constructor(config: Partial<TelemetryConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Update telemetry configuration
   */
  configure(config: Partial<TelemetryConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Start a performance timer
   */
  startTimer(id: string): void {
    this.timers.set(id, performance.now());
  }

  /**
   * End a performance timer and record the metric
   */
  endTimer(id: string, type: MetricType, metadata?: Record<string, unknown>): number | null {
    const startTime = this.timers.get(id);
    if (!startTime) {
      logger.warn(`Timer '${id}' not found`);
      return null;
    }

    const duration = performance.now() - startTime;
    this.timers.delete(id);

    this.recordMetric({
      type,
      timestamp: Date.now(),
      duration,
      metadata,
    });

    return duration;
  }

  /**
   * Record a performance metric
   */
  recordMetric(metric: PerformanceMetric): void {
    if (!this.config.enabled) {
      return;
    }

    // Add to metrics array
    this.metrics.push(metric);

    // Trim if exceeds max
    if (this.metrics.length > this.config.maxMetrics) {
      this.metrics.shift();
    }

    // Log if enabled and exceeds threshold
    if (this.config.logToConsole) {
      const duration = metric.duration ?? 0;
      if (duration >= this.config.logThreshold) {
        logger.debug(
          `[CM6 Telemetry] ${metric.type}: ${duration.toFixed(2)}ms`,
          metric.metadata
        );
      }
    }
  }

  /**
   * Record a value metric (e.g., document size)
   */
  recordValue(type: MetricType, value: number, metadata?: Record<string, unknown>): void {
    this.recordMetric({
      type,
      timestamp: Date.now(),
      value,
      metadata,
    });
  }

  /**
   * Get all recorded metrics
   */
  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  /**
   * Get metrics by type
   */
  getMetricsByType(type: MetricType): PerformanceMetric[] {
    return this.metrics.filter(m => m.type === type);
  }

  /**
   * Get average duration for a metric type
   */
  getAverageDuration(type: MetricType): number | null {
    const metrics = this.getMetricsByType(type).filter(m => m.duration !== undefined);
    if (metrics.length === 0) {
      return null;
    }

    const total = metrics.reduce((sum, m) => sum + (m.duration ?? 0), 0);
    return total / metrics.length;
  }

  /**
   * Get statistics for a metric type
   */
  getStats(type: MetricType): {
    count: number;
    avg: number | null;
    min: number | null;
    max: number | null;
    p50: number | null;
    p95: number | null;
    p99: number | null;
  } {
    const metrics = this.getMetricsByType(type).filter(m => m.duration !== undefined);
    
    if (metrics.length === 0) {
      return {
        count: 0,
        avg: null,
        min: null,
        max: null,
        p50: null,
        p95: null,
        p99: null,
      };
    }

    const durations = metrics.map(m => m.duration!).sort((a, b) => a - b);
    const count = durations.length;
    const sum = durations.reduce((a, b) => a + b, 0);

    return {
      count,
      avg: sum / count,
      min: durations[0],
      max: durations[count - 1],
      p50: durations[Math.floor(count * 0.5)],
      p95: durations[Math.floor(count * 0.95)],
      p99: durations[Math.floor(count * 0.99)],
    };
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = [];
    this.timers.clear();
  }

  /**
   * Get a summary of all metrics
   */
  getSummary(): Record<MetricType, ReturnType<typeof this.getStats>> {
    const types: MetricType[] = [
      'editor.render',
      'editor.format',
      'editor.completion',
      'editor.document.size',
      'editor.selection.change',
      'editor.content.change',
      'editor.dialect.change',
    ];

    const summary = {} as Record<MetricType, ReturnType<typeof this.getStats>>;
    for (const type of types) {
      summary[type] = this.getStats(type);
    }

    return summary;
  }

  /**
   * Log a summary of all metrics
   */
  logSummary(): void {
    const summary = this.getSummary();
    logger.info('=== CM6 Performance Summary ===');
    
    for (const [type, stats] of Object.entries(summary)) {
      if (stats.count > 0) {
        logger.info(`${type}:`, {
          count: stats.count,
          avg: stats.avg?.toFixed(2) + 'ms',
          min: stats.min?.toFixed(2) + 'ms',
          max: stats.max?.toFixed(2) + 'ms',
          p95: stats.p95?.toFixed(2) + 'ms',
        });
      }
    }
  }
}

/**
 * Global telemetry instance
 */
export const editorTelemetry = new EditorTelemetry();

/**
 * Utility function to measure async operations
 */
export async function measureAsync<T>(
  id: string,
  type: MetricType,
  fn: () => Promise<T>,
  metadata?: Record<string, unknown>
): Promise<T> {
  editorTelemetry.startTimer(id);
  try {
    const result = await fn();
    editorTelemetry.endTimer(id, type, metadata);
    return result;
  } catch (error) {
    editorTelemetry.endTimer(id, type, { ...metadata, error: true });
    throw error;
  }
}

/**
 * Utility function to measure sync operations
 */
export function measureSync<T>(
  id: string,
  type: MetricType,
  fn: () => T,
  metadata?: Record<string, unknown>
): T {
  editorTelemetry.startTimer(id);
  try {
    const result = fn();
    editorTelemetry.endTimer(id, type, metadata);
    return result;
  } catch (error) {
    editorTelemetry.endTimer(id, type, { ...metadata, error: true });
    throw error;
  }
}

