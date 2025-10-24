/**
 * InfluxQL Language Support for CodeMirror 6
 * 
 * Provides syntax highlighting, auto-completion, and snippets for InfluxQL (InfluxDB 1.x)
 */

import { LanguageSupport, StreamLanguage } from '@codemirror/language';
import type { CompletionContext, CompletionResult } from '@codemirror/autocomplete';

/**
 * InfluxQL keywords
 */
const KEYWORDS = [
  'SELECT', 'FROM', 'WHERE', 'GROUP BY', 'ORDER BY', 'LIMIT', 'OFFSET',
  'SHOW', 'CREATE', 'DROP', 'DELETE', 'INSERT', 'INTO', 'VALUES',
  'DATABASES', 'MEASUREMENTS', 'SERIES', 'TAG', 'FIELD', 'KEYS',
  'RETENTION', 'POLICY', 'POLICIES', 'CONTINUOUS', 'QUERY', 'QUERIES',
  'USER', 'USERS', 'GRANTS', 'REVOKE', 'GRANT', 'PRIVILEGES',
  'AND', 'OR', 'NOT', 'IN', 'LIKE', 'REGEXP', 'AS',
  'FILL', 'NULL', 'NONE', 'LINEAR', 'PREVIOUS', 'NOW',
  'ASC', 'DESC', 'ON', 'WITH', 'REPLICATION', 'DURATION', 'SHARD',
  'ALL', 'DEFAULT', 'ANY', 'SLIMIT', 'SOFFSET', 'TZ'
];

/**
 * InfluxQL aggregate functions
 */
const AGGREGATE_FUNCTIONS = [
  'COUNT', 'DISTINCT', 'INTEGRAL', 'MEAN', 'MEDIAN', 'MODE',
  'SPREAD', 'STDDEV', 'SUM', 'BOTTOM', 'FIRST', 'LAST',
  'MAX', 'MIN', 'PERCENTILE', 'SAMPLE', 'TOP'
];

/**
 * InfluxQL selector functions
 */
const SELECTOR_FUNCTIONS = [
  'BOTTOM', 'FIRST', 'LAST', 'MAX', 'MIN', 'PERCENTILE', 'SAMPLE', 'TOP'
];

/**
 * InfluxQL transformation functions
 */
const TRANSFORMATION_FUNCTIONS = [
  'CEILING', 'COS', 'CUMULATIVE_SUM', 'DERIVATIVE', 'DIFFERENCE',
  'ELAPSED', 'EXP', 'FLOOR', 'HISTOGRAM', 'LN', 'LOG', 'LOG2', 'LOG10',
  'MOVING_AVERAGE', 'NON_NEGATIVE_DERIVATIVE', 'NON_NEGATIVE_DIFFERENCE',
  'POW', 'ROUND', 'SIN', 'SQRT', 'TAN', 'HOLT_WINTERS', 'CHANDE_MOMENTUM_OSCILLATOR',
  'EXPONENTIAL_MOVING_AVERAGE', 'DOUBLE_EXPONENTIAL_MOVING_AVERAGE',
  'KAUFMANS_EFFICIENCY_RATIO', 'KAUFMANS_ADAPTIVE_MOVING_AVERAGE',
  'TRIPLE_EXPONENTIAL_MOVING_AVERAGE', 'TRIPLE_EXPONENTIAL_DERIVATIVE',
  'RELATIVE_STRENGTH_INDEX'
];

/**
 * All InfluxQL functions
 */
const FUNCTIONS = [
  ...AGGREGATE_FUNCTIONS,
  ...SELECTOR_FUNCTIONS,
  ...TRANSFORMATION_FUNCTIONS
];

/**
 * InfluxQL data types
 */
const DATA_TYPES = [
  'INTEGER', 'FLOAT', 'STRING', 'BOOLEAN', 'TIMESTAMP'
];

/**
 * InfluxQL constants
 */
const CONSTANTS = [
  'TRUE', 'FALSE', 'NULL', 'NOW'
];

/**
 * Create keyword set for fast lookup
 */
const keywordSet = new Set(KEYWORDS.map(k => k.toLowerCase()));
const functionSet = new Set(FUNCTIONS.map(f => f.toLowerCase()));
const dataTypeSet = new Set(DATA_TYPES.map(d => d.toLowerCase()));
const constantSet = new Set(CONSTANTS.map(c => c.toLowerCase()));

/**
 * InfluxQL stream parser
 */
const influxqlLanguage = StreamLanguage.define({
  name: 'influxql',
  
  token(stream, state) {
    // Skip whitespace
    if (stream.eatSpace()) {
      return null;
    }

    // Comments
    if (stream.match(/^--.*$/)) {
      return 'comment';
    }

    // Strings
    if (stream.match(/^'([^']|'')*'/)) {
      return 'string';
    }
    if (stream.match(/^"([^"]|"")*"/)) {
      return 'string';
    }

    // Numbers
    if (stream.match(/^[0-9]+(\.[0-9]+)?([eE][+-]?[0-9]+)?/)) {
      return 'number';
    }

    // Duration literals (e.g., 1h, 5m, 30s)
    if (stream.match(/^[0-9]+[smhdw]/)) {
      return 'number';
    }

    // Operators
    if (stream.match(/^[+\-*/%=<>!]+/)) {
      return 'operator';
    }

    // Punctuation
    if (stream.match(/^[(),.;]/)) {
      return 'punctuation';
    }

    // Identifiers and keywords
    const word = stream.match(/^[a-zA-Z_][a-zA-Z0-9_]*/);
    if (word && Array.isArray(word)) {
      const lower = word[0].toLowerCase();
      
      if (keywordSet.has(lower)) {
        return 'keyword';
      }
      if (functionSet.has(lower)) {
        return 'function';
      }
      if (dataTypeSet.has(lower)) {
        return 'type';
      }
      if (constantSet.has(lower)) {
        return 'constant';
      }
      
      // Check if it's followed by '(' - likely a function
      if (stream.peek() === '(') {
        return 'function';
      }
      
      return 'variable';
    }

    // Fallback
    stream.next();
    return null;
  },

  languageData: {
    commentTokens: { line: '--' },
    closeBrackets: { brackets: ['(', '[', '{', "'", '"'] },
  }
});

/**
 * Auto-completion for InfluxQL
 */
export function influxqlCompletion(context: CompletionContext): CompletionResult | null {
  const word = context.matchBefore(/\w*/);
  if (!word || (word.from === word.to && !context.explicit)) {
    return null;
  }

  const options = [
    // Keywords
    ...KEYWORDS.map(k => ({
      label: k,
      type: 'keyword',
      boost: 2,
    })),
    // Functions
    ...FUNCTIONS.map(f => ({
      label: f,
      type: 'function',
      boost: 1,
      apply: `${f}()`,
    })),
    // Data types
    ...DATA_TYPES.map(d => ({
      label: d,
      type: 'type',
    })),
    // Constants
    ...CONSTANTS.map(c => ({
      label: c,
      type: 'constant',
    })),
  ];

  return {
    from: word.from,
    options,
    validFor: /^\w*$/,
  };
}

/**
 * InfluxQL snippets
 */
export const influxqlSnippets = [
  {
    label: 'select-basic',
    detail: 'Basic SELECT query',
    apply: 'SELECT ${1:field} FROM ${2:measurement} WHERE ${3:condition}',
    type: 'snippet',
  },
  {
    label: 'select-time',
    detail: 'SELECT with time range',
    apply: 'SELECT ${1:field} FROM ${2:measurement} WHERE time > now() - ${3:1h}',
    type: 'snippet',
  },
  {
    label: 'select-group',
    detail: 'SELECT with GROUP BY',
    apply: 'SELECT ${1:MEAN(field)} FROM ${2:measurement} WHERE time > now() - ${3:1h} GROUP BY time(${4:5m})${5:, tag}',
    type: 'snippet',
  },
  {
    label: 'show-measurements',
    detail: 'Show all measurements',
    apply: 'SHOW MEASUREMENTS',
    type: 'snippet',
  },
  {
    label: 'show-tag-keys',
    detail: 'Show tag keys',
    apply: 'SHOW TAG KEYS FROM ${1:measurement}',
    type: 'snippet',
  },
  {
    label: 'show-field-keys',
    detail: 'Show field keys',
    apply: 'SHOW FIELD KEYS FROM ${1:measurement}',
    type: 'snippet',
  },
  {
    label: 'show-databases',
    detail: 'Show all databases',
    apply: 'SHOW DATABASES',
    type: 'snippet',
  },
  {
    label: 'create-database',
    detail: 'Create database',
    apply: 'CREATE DATABASE ${1:db_name}',
    type: 'snippet',
  },
  {
    label: 'drop-database',
    detail: 'Drop database',
    apply: 'DROP DATABASE ${1:db_name}',
    type: 'snippet',
  },
];

/**
 * Create InfluxQL language support
 */
export function influxql(): LanguageSupport {
  return new LanguageSupport(influxqlLanguage);
}

