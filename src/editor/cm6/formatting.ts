/**
 * CodeMirror 6 Formatting Service
 * 
 * Provides formatting capabilities for different query dialects
 */

import { EditorView } from '@codemirror/view';
import { EditorState, Transaction } from '@codemirror/state';
import { formatSQL, type DatabaseType as SQLFormatterDatabaseType } from '@/utils/sqlFormatter';
import type { QueryDialect } from './DialectSelector';
import { logger } from '@/utils/logger';
import { editorTelemetry } from './telemetry';

/**
 * Formatting options for different dialects
 */
export interface FormattingOptions {
  /** Indent string (default: 2 spaces) */
  indent?: string;
  /** Convert keywords to uppercase (SQL dialects only) */
  uppercase?: boolean;
  /** Number of blank lines between queries */
  linesBetweenQueries?: number;
  /** Preserve original formatting for non-SQL dialects */
  conservative?: boolean;
}

/**
 * Default formatting options
 */
export const DEFAULT_FORMATTING_OPTIONS: FormattingOptions = {
  indent: '  ',
  uppercase: true,
  linesBetweenQueries: 1,
  conservative: false,
};

/**
 * Map CM6 dialect to SQL formatter database type
 */
function dialectToFormatterType(dialect: QueryDialect): SQLFormatterDatabaseType {
  switch (dialect) {
    case 'influxql':
      return '1.x';
    case 'flux':
      return '2.x';
    case 'sql':
    case 'iotdb-sql':
      return '3.x';
    case 'promql':
      return 'unknown';
    default:
      return 'unknown';
  }
}

/**
 * Format PromQL (conservative - basic indentation only)
 */
function formatPromQL(query: string, options: FormattingOptions): string {
  const indent = options.indent || '  ';
  
  // Split by lines and trim
  const lines = query.split('\n').map(line => line.trim()).filter(line => line);
  
  // Basic indentation for multi-line queries
  let indentLevel = 0;
  const formatted = lines.map(line => {
    // Decrease indent for closing braces
    if (line.startsWith('}') || line.startsWith(')')) {
      indentLevel = Math.max(0, indentLevel - 1);
    }
    
    const indented = indent.repeat(indentLevel) + line;
    
    // Increase indent for opening braces
    if (line.endsWith('{') || line.endsWith('(')) {
      indentLevel++;
    }
    
    return indented;
  });
  
  return formatted.join('\n');
}

/**
 * Format IoTDB SQL (conservative - use standard SQL formatter with IoTDB-specific handling)
 */
function formatIoTDBSQL(query: string, options: FormattingOptions): string {
  // IoTDB uses SQL-like syntax, so we can use the standard SQL formatter
  // but we need to be careful with path-like identifiers (e.g., root.sg.d1.s1)
  return formatSQL(query, '3.x', {
    indent: options.indent,
    uppercase: options.uppercase,
    linesBetweenQueries: options.linesBetweenQueries,
  });
}

/**
 * Format query based on dialect
 */
export function formatQuery(
  query: string,
  dialect: QueryDialect,
  options: FormattingOptions = DEFAULT_FORMATTING_OPTIONS
): string {
  if (!query || !query.trim()) {
    return query;
  }

  try {
    switch (dialect) {
      case 'sql':
      case 'influxql':
      case 'flux':
        // Use the existing SQL formatter
        return formatSQL(query, dialectToFormatterType(dialect), {
          indent: options.indent,
          uppercase: options.uppercase,
          linesBetweenQueries: options.linesBetweenQueries,
        });

      case 'iotdb-sql':
        return formatIoTDBSQL(query, options);

      case 'promql':
        // Conservative formatting for PromQL
        return options.conservative ? query : formatPromQL(query, options);

      default:
        logger.warn('Unknown dialect for formatting:', dialect);
        return query;
    }
  } catch (error) {
    logger.error('Formatting error:', error);
    // Return original query on error (graceful degradation)
    return query;
  }
}

/**
 * Format the entire document in the editor
 */
export function formatDocument(
  view: EditorView,
  dialect: QueryDialect,
  options: FormattingOptions = DEFAULT_FORMATTING_OPTIONS
): boolean {
  editorTelemetry.startTimer('format-document');

  try {
    const state = view.state;
    const currentText = state.doc.toString();

    // Format the text
    const formatted = formatQuery(currentText, dialect, options);

    // If no changes, return early
    if (formatted === currentText) {
      logger.debug('No formatting changes needed');
      editorTelemetry.endTimer('format-document', 'editor.format', {
        dialect,
        docSize: currentText.length,
        changed: false,
      });
      return false;
    }

    // Create transaction to replace entire document
    const transaction: Transaction = state.update({
      changes: {
        from: 0,
        to: state.doc.length,
        insert: formatted,
      },
      // Preserve scroll position
      scrollIntoView: false,
    });

    view.dispatch(transaction);
    logger.debug('Document formatted successfully');

    editorTelemetry.endTimer('format-document', 'editor.format', {
      dialect,
      docSize: currentText.length,
      changed: true,
    });

    return true;
  } catch (error) {
    logger.error('Failed to format document:', error);
    editorTelemetry.endTimer('format-document', 'editor.format', {
      dialect,
      error: true,
    });
    return false;
  }
}

/**
 * Format the current selection in the editor
 */
export function formatSelection(
  view: EditorView,
  dialect: QueryDialect,
  options: FormattingOptions = DEFAULT_FORMATTING_OPTIONS
): boolean {
  try {
    const state = view.state;
    const selection = state.selection.main;
    
    // If no selection, format entire document
    if (selection.empty) {
      return formatDocument(view, dialect, options);
    }
    
    // Get selected text
    const selectedText = state.doc.sliceString(selection.from, selection.to);
    
    // Format the selected text
    const formatted = formatQuery(selectedText, dialect, options);
    
    // If no changes, return early
    if (formatted === selectedText) {
      logger.debug('No formatting changes needed for selection');
      return false;
    }
    
    // Create transaction to replace selection
    const transaction: Transaction = state.update({
      changes: {
        from: selection.from,
        to: selection.to,
        insert: formatted,
      },
      // Keep selection on the formatted text
      selection: {
        anchor: selection.from,
        head: selection.from + formatted.length,
      },
    });
    
    view.dispatch(transaction);
    logger.debug('Selection formatted successfully');
    return true;
  } catch (error) {
    logger.error('Failed to format selection:', error);
    return false;
  }
}

/**
 * Create a formatting command for CodeMirror
 */
export function createFormatCommand(
  dialect: QueryDialect,
  options: FormattingOptions = DEFAULT_FORMATTING_OPTIONS
) {
  return (view: EditorView): boolean => {
    return formatDocument(view, dialect, options);
  };
}

/**
 * Get formatting options from user preferences
 * (This can be extended to read from settings store)
 */
export function getFormattingOptions(): FormattingOptions {
  // TODO: Read from user preferences store when implemented
  return DEFAULT_FORMATTING_OPTIONS;
}

