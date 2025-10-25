/**
 * CodeMirror 6 Editor Module
 *
 * Exports all CM6 components, utilities, and types
 */

export { CodeMirrorEditor } from './CodeMirrorEditor';
export type { CodeMirrorEditorProps, CodeMirrorEditorRef } from './CodeMirrorEditor';

export { DialectSelector } from './DialectSelector';
export type { DialectSelectorProps, QueryDialect, DialectInfo } from './DialectSelector';

export { basicPreset, minimalPreset, fullPreset } from './preset';
export type { PresetOptions } from './preset';

export { createEditorTheme, createAppTheme, createSyntaxTheme, watchThemeChanges } from './theme';

export { editorEventBus, editorEvents } from './eventBus';
export type {
  EditorEventType,
  EditorEvent,
  RunEvent,
  FormatEvent,
  CompletionEvent,
  DialectChangeEvent,
  ContentChangeEvent,
  SelectionChangeEvent,
} from './eventBus';

export {
  formatQuery,
  formatDocument,
  formatSelection,
  createFormatCommand,
  getFormattingOptions,
  DEFAULT_FORMATTING_OPTIONS
} from './formatting';
export type { FormattingOptions } from './formatting';

export { editorTelemetry, measureAsync, measureSync } from './telemetry';
export type { PerformanceMetric, MetricType, TelemetryConfig } from './telemetry';

export { schemaCompletionProvider } from './schemaCompletion';
export type { SchemaCompletionProvider } from './schemaCompletion';

export { createLinter } from './linting';

export {
  getCurrentStatement,
  getCurrentStatementFromText,
  getAllStatements,
  findStatementBoundaries,
  getStatementCount,
  isAtStatementEnd,
  highlightStatementSeparators
} from './sqlUtils';

export {
  getDialectLanguage,
  getDialectCompletion,
  getDialectLinting,
  getDialectSnippets,
  getDialectExtensions,
  influxql,
  influxqlCompletion,
  influxqlSnippets,
  flux,
  fluxCompletion,
  fluxSnippets,
  iotdb,
  iotdbCompletion,
  iotdbSnippets,
  promql,
  promqlCompletion,
  promqlSnippets
} from './dialects';
