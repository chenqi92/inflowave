/**
 * IoTDB SQL Language Support for CodeMirror 6
 * 
 * Provides syntax highlighting, auto-completion, and snippets for IoTDB SQL
 */

import { LanguageSupport, StreamLanguage } from '@codemirror/language';
import type { CompletionContext, CompletionResult } from '@codemirror/autocomplete';

/**
 * IoTDB SQL keywords
 */
const KEYWORDS = [
  'SELECT', 'FROM', 'WHERE', 'GROUP BY', 'ORDER BY', 'LIMIT', 'OFFSET',
  'SHOW', 'CREATE', 'DROP', 'DELETE', 'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET',
  'TIMESERIES', 'STORAGE', 'GROUP', 'DEVICES', 'CHILD', 'PATHS', 'NODES',
  'DATABASE', 'DATABASES', 'SCHEMA', 'TEMPLATE', 'TEMPLATES',
  'ALIGN', 'BY', 'DEVICE', 'TIME', 'FILL', 'PREVIOUS', 'LINEAR', 'NULL',
  'AND', 'OR', 'NOT', 'IN', 'LIKE', 'REGEXP', 'IS', 'AS',
  'ASC', 'DESC', 'SLIMIT', 'SOFFSET', 'DISABLE', 'ENABLE',
  'WITH', 'DATATYPE', 'ENCODING', 'COMPRESSOR', 'TAGS', 'ATTRIBUTES',
  'LEVEL', 'COUNT', 'NODES', 'VERSION', 'TTL', 'LATEST', 'LAST',
  'USING', 'ON', 'TO', 'OF', 'MERGE', 'UNSET', 'LOAD', 'REMOVE',
  'START', 'STOP', 'FLUSH', 'CLEAR', 'CACHE', 'SETTLE'
];

/**
 * IoTDB aggregate functions
 */
const AGGREGATE_FUNCTIONS = [
  'COUNT', 'SUM', 'AVG', 'EXTREME', 'MAX_VALUE', 'MIN_VALUE',
  'FIRST_VALUE', 'LAST_VALUE', 'MAX_TIME', 'MIN_TIME',
  'STDDEV', 'STDDEV_POP', 'STDDEV_SAMP', 'VARIANCE', 'VAR_POP', 'VAR_SAMP'
];

/**
 * IoTDB time-series functions
 */
const TIMESERIES_FUNCTIONS = [
  'DIFF', 'DERIVATIVE', 'NON_NEGATIVE_DERIVATIVE', 'RATE',
  'IRATE', 'STDDEV', 'VARIANCE', 'SPREAD', 'PERCENTILE',
  'MEDIAN', 'MODE', 'SKEWNESS', 'KURTOSIS'
];

/**
 * IoTDB selector functions
 */
const SELECTOR_FUNCTIONS = [
  'TOP_K', 'BOTTOM_K', 'MAX_BY', 'MIN_BY'
];

/**
 * IoTDB transformation functions
 */
const TRANSFORMATION_FUNCTIONS = [
  'CAST', 'ROUND', 'REPLACE', 'SUBSTRING', 'CONCAT', 'TRIM',
  'UPPER', 'LOWER', 'LENGTH', 'STRCMP', 'STARTS_WITH', 'ENDS_WITH',
  'SIN', 'COS', 'TAN', 'ASIN', 'ACOS', 'ATAN', 'SINH', 'COSH', 'TANH',
  'DEGREES', 'RADIANS', 'ABS', 'SIGN', 'CEIL', 'FLOOR', 'EXP', 'LN', 'LOG10',
  'SQRT', 'POW', 'MOD', 'E', 'PI'
];

/**
 * IoTDB utility functions
 */
const UTILITY_FUNCTIONS = [
  'NOW', 'CURRENT_TIMESTAMP', 'CURRENT_DATE', 'CURRENT_TIME',
  'DATE_BIN', 'DATE_DIFF', 'DATE_FORMAT'
];

/**
 * All IoTDB functions
 */
const FUNCTIONS = [
  ...AGGREGATE_FUNCTIONS,
  ...TIMESERIES_FUNCTIONS,
  ...SELECTOR_FUNCTIONS,
  ...TRANSFORMATION_FUNCTIONS,
  ...UTILITY_FUNCTIONS
];

/**
 * IoTDB data types
 */
const DATA_TYPES = [
  'BOOLEAN', 'INT32', 'INT64', 'FLOAT', 'DOUBLE', 'TEXT', 'STRING', 'TIMESTAMP'
];

/**
 * IoTDB encoding types
 */
const ENCODING_TYPES = [
  'PLAIN', 'RLE', 'TS_2DIFF', 'GORILLA', 'REGULAR', 'DICTIONARY'
];

/**
 * IoTDB compression types
 */
const COMPRESSION_TYPES = [
  'UNCOMPRESSED', 'SNAPPY', 'GZIP', 'LZ4', 'ZSTD', 'LZMA2'
];

/**
 * Create keyword set for fast lookup
 */
const keywordSet = new Set(KEYWORDS.map(k => k.toLowerCase()));
const functionSet = new Set(FUNCTIONS.map(f => f.toLowerCase()));
const dataTypeSet = new Set(DATA_TYPES.map(d => d.toLowerCase()));
const encodingSet = new Set(ENCODING_TYPES.map(e => e.toLowerCase()));
const compressionSet = new Set(COMPRESSION_TYPES.map(c => c.toLowerCase()));

/**
 * IoTDB SQL stream parser
 */
const iotdbLanguage = StreamLanguage.define({
  name: 'iotdb-sql',

  token(stream, state) {
    const iotdbState = state as { inComment?: boolean };

    // Skip whitespace
    if (stream.eatSpace()) {
      return null;
    }

    // Comments
    if (stream.match(/^--.*$/)) {
      return 'comment';
    }
    if (stream.match(/^\/\/.*/)) {
      return 'comment';
    }
    if (stream.match(/^\/\*/)) {
      iotdbState.inComment = true;
      return 'comment';
    }
    if (iotdbState.inComment) {
      if (stream.match(/.*?\*\//)) {
        iotdbState.inComment = false;
      } else {
        stream.skipToEnd();
      }
      return 'comment';
    }

    // Strings
    if (stream.match(/^'([^']|'')*'/)) {
      return 'string';
    }
    if (stream.match(/^"([^"]|"")*"/)) {
      return 'string';
    }

    // Path identifiers (root.db.device.sensor)
    if (stream.match(/^root(\.[a-zA-Z0-9_*]+)+/)) {
      return 'variable.special';
    }

    // Backtick identifiers
    if (stream.match(/^`[^`]+`/)) {
      return 'variable';
    }

    // Numbers (including scientific notation)
    if (stream.match(/^[0-9]+(\.[0-9]+)?([eE][+-]?[0-9]+)?/)) {
      return 'number';
    }

    // Time literals (e.g., 2023-01-01T00:00:00)
    if (stream.match(/^[0-9]{4}-[0-9]{2}-[0-9]{2}(T[0-9]{2}:[0-9]{2}:[0-9]{2}(\.[0-9]+)?)?/)) {
      return 'string.special';
    }

    // Duration literals (e.g., 1d, 1h, 1m, 1s, 1ms)
    if (stream.match(/^[0-9]+[dhms]+/)) {
      return 'number';
    }

    // Operators
    if (stream.match(/^(==|!=|<=|>=|<>|[+\-*/%<>=!])/)) {
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
      if (encodingSet.has(lower)) {
        return 'type';
      }
      if (compressionSet.has(lower)) {
        return 'type';
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

  startState() {
    return { inComment: false };
  },

  languageData: {
    commentTokens: { line: '--', block: { open: '/*', close: '*/' } },
    closeBrackets: { brackets: ['(', '[', '{', "'", '"', '`'] },
  }
});

/**
 * Auto-completion for IoTDB SQL
 */
export function iotdbCompletion(context: CompletionContext): CompletionResult | null {
  const word = context.matchBefore(/[\w.]*/);
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
    // Encoding types
    ...ENCODING_TYPES.map(e => ({
      label: e,
      type: 'type',
    })),
    // Compression types
    ...COMPRESSION_TYPES.map(c => ({
      label: c,
      type: 'type',
    })),
  ];

  return {
    from: word.from,
    options,
    validFor: /^[\w.]*$/,
  };
}

/**
 * IoTDB SQL snippets
 */
export const iotdbSnippets = [
  {
    label: 'select-basic',
    detail: 'Basic SELECT query',
    apply: 'SELECT ${1:*} FROM ${2:root.db.device}',
    type: 'snippet',
  },
  {
    label: 'select-time',
    detail: 'SELECT with time range',
    apply: 'SELECT ${1:*} FROM ${2:root.db.device} WHERE time >= ${3:now() - 1h}',
    type: 'snippet',
  },
  {
    label: 'select-align-device',
    detail: 'SELECT align by device',
    apply: 'SELECT ${1:*} FROM ${2:root.db.device} ALIGN BY DEVICE',
    type: 'snippet',
  },
  {
    label: 'create-timeseries',
    detail: 'Create timeseries',
    apply: 'CREATE TIMESERIES ${1:root.db.device.sensor} WITH DATATYPE=${2:FLOAT}, ENCODING=${3:GORILLA}, COMPRESSOR=${4:SNAPPY}',
    type: 'snippet',
  },
  {
    label: 'create-database',
    detail: 'Create database',
    apply: 'CREATE DATABASE ${1:root.db}',
    type: 'snippet',
  },
  {
    label: 'show-timeseries',
    detail: 'Show timeseries',
    apply: 'SHOW TIMESERIES ${1:root.**}',
    type: 'snippet',
  },
  {
    label: 'show-devices',
    detail: 'Show devices',
    apply: 'SHOW DEVICES ${1:root.**}',
    type: 'snippet',
  },
  {
    label: 'show-databases',
    detail: 'Show databases',
    apply: 'SHOW DATABASES',
    type: 'snippet',
  },
  {
    label: 'insert',
    detail: 'Insert data',
    apply: 'INSERT INTO ${1:root.db.device}(timestamp, ${2:sensor}) VALUES(${3:now()}, ${4:value})',
    type: 'snippet',
  },
];

/**
 * Create IoTDB SQL language support
 */
export function iotdb(): LanguageSupport {
  return new LanguageSupport(iotdbLanguage);
}

