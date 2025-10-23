/**
 * Flux Language Support for CodeMirror 6
 * 
 * Provides syntax highlighting, auto-completion, and snippets for Flux (InfluxDB 2.x)
 */

import { LanguageSupport, StreamLanguage } from '@codemirror/language';
import type { CompletionContext, CompletionResult } from '@codemirror/autocomplete';

/**
 * Flux keywords
 */
const KEYWORDS = [
  'import', 'option', 'builtin', 'testcase', 'return', 'package',
  'if', 'then', 'else', 'and', 'or', 'not', 'exists', 'in'
];

/**
 * Flux data source functions
 */
const DATA_SOURCE_FUNCTIONS = [
  'from', 'buckets', 'bucket', 'database', 'databases', 'measurement', 'measurements',
  'fieldKeys', 'tagKeys', 'tagValues'
];

/**
 * Flux transformation functions
 */
const TRANSFORMATION_FUNCTIONS = [
  'filter', 'range', 'map', 'reduce', 'group', 'window', 'aggregateWindow',
  'derivative', 'difference', 'distinct', 'drop', 'duplicate', 'fill',
  'first', 'last', 'limit', 'offset', 'pivot', 'rename', 'sample',
  'set', 'shift', 'sort', 'tail', 'timeShift', 'to', 'toBool', 'toFloat',
  'toInt', 'toString', 'toTime', 'toUInt', 'unique', 'yield', 'keep'
];

/**
 * Flux aggregation functions
 */
const AGGREGATION_FUNCTIONS = [
  'count', 'sum', 'mean', 'median', 'mode', 'min', 'max', 'quantile',
  'stddev', 'spread', 'skew', 'covariance', 'correlation', 'pearsonr',
  'cumulativeSum', 'movingAverage', 'exponentialMovingAverage',
  'doubleEMA', 'tripleEMA', 'kaufmansER', 'kaufmansAMA', 'relativeStrengthIndex',
  'chandeMomentumOscillator', 'holtWinters'
];

/**
 * Flux selector functions
 */
const SELECTOR_FUNCTIONS = [
  'top', 'bottom', 'highestAverage', 'highestCurrent', 'highestMax',
  'lowestAverage', 'lowestCurrent', 'lowestMin'
];

/**
 * Flux utility functions
 */
const UTILITY_FUNCTIONS = [
  'contains', 'die', 'getColumn', 'getRecord', 'length', 'now', 'today',
  'experimental', 'testing', 'universe', 'influxdb', 'sql', 'csv', 'json',
  'http', 'socket', 'date', 'math', 'regexp', 'strings', 'types'
];

/**
 * All Flux functions
 */
const FUNCTIONS = [
  ...DATA_SOURCE_FUNCTIONS,
  ...TRANSFORMATION_FUNCTIONS,
  ...AGGREGATION_FUNCTIONS,
  ...SELECTOR_FUNCTIONS,
  ...UTILITY_FUNCTIONS
];

/**
 * Flux data types
 */
const DATA_TYPES = [
  'bool', 'int', 'uint', 'float', 'string', 'duration', 'time', 'bytes', 'regexp'
];

/**
 * Flux constants
 */
const CONSTANTS = [
  'true', 'false', 'null'
];

/**
 * Create keyword set for fast lookup
 */
const keywordSet = new Set(KEYWORDS);
const functionSet = new Set(FUNCTIONS.map(f => f.toLowerCase()));
const dataTypeSet = new Set(DATA_TYPES);
const constantSet = new Set(CONSTANTS);

/**
 * Flux stream parser
 */
const fluxLanguage = StreamLanguage.define({
  name: 'flux',

  token(stream, state) {
    const fluxState = state as { inComment?: boolean };

    // Skip whitespace
    if (stream.eatSpace()) {
      return null;
    }

    // Comments
    if (stream.match(/^\/\/.*/)) {
      return 'comment';
    }
    if (stream.match(/^\/\*/)) {
      fluxState.inComment = true;
      return 'comment';
    }
    if (fluxState.inComment) {
      if (stream.match(/.*?\*\//)) {
        fluxState.inComment = false;
      } else {
        stream.skipToEnd();
      }
      return 'comment';
    }

    // Strings (double quoted)
    if (stream.match(/^"([^"\\]|\\.)*"/)) {
      return 'string';
    }

    // Regular expressions
    if (stream.match(/^\/([^\/\\]|\\.)+\//)) {
      return 'string.special';
    }

    // Numbers (including scientific notation)
    if (stream.match(/^-?[0-9]+(\.[0-9]+)?([eE][+-]?[0-9]+)?/)) {
      return 'number';
    }

    // Duration literals (e.g., 1h, 5m, 30s, 1d, 1w, 1mo, 1y)
    if (stream.match(/^-?[0-9]+[nuµsmhdwMy]/)) {
      return 'number';
    }

    // Pipe operator (important in Flux)
    if (stream.match(/^\|>/)) {
      return 'operator.special';
    }

    // Operators
    if (stream.match(/^(==|!=|<=|>=|=~|!~|[+\-*/%<>=!])/)) {
      return 'operator';
    }

    // Punctuation
    if (stream.match(/^[(){}[\],.;:]/)) {
      return 'punctuation';
    }

    // Arrow function
    if (stream.match(/^=>/)) {
      return 'operator';
    }

    // Identifiers and keywords
    const word = stream.match(/^[a-zA-Z_][a-zA-Z0-9_]*/);
    if (word && Array.isArray(word)) {
      const lower = word[0].toLowerCase();

      if (keywordSet.has(word[0])) {
        return 'keyword';
      }
      if (functionSet.has(lower)) {
        return 'function';
      }
      if (dataTypeSet.has(word[0])) {
        return 'type';
      }
      if (constantSet.has(word[0])) {
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

  startState() {
    return { inComment: false };
  },

  languageData: {
    commentTokens: { line: '//', block: { open: '/*', close: '*/' } },
    closeBrackets: { brackets: ['(', '[', '{', '"'] },
  }
});

/**
 * Auto-completion for Flux
 */
export function fluxCompletion(context: CompletionContext): CompletionResult | null {
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
    // Data source functions
    ...DATA_SOURCE_FUNCTIONS.map(f => ({
      label: f,
      type: 'function',
      boost: 4,
      apply: `${f}()`,
    })),
    // Transformation functions
    ...TRANSFORMATION_FUNCTIONS.map(f => ({
      label: f,
      type: 'function',
      boost: 3,
      apply: `${f}()`,
    })),
    // Aggregation functions
    ...AGGREGATION_FUNCTIONS.map(f => ({
      label: f,
      type: 'function',
      boost: 3,
      apply: `${f}()`,
    })),
    // Selector functions
    ...SELECTOR_FUNCTIONS.map(f => ({
      label: f,
      type: 'function',
      boost: 2,
      apply: `${f}()`,
    })),
    // Utility functions
    ...UTILITY_FUNCTIONS.map(f => ({
      label: f,
      type: 'function',
      boost: 1,
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
 * Flux snippets
 */
export const fluxSnippets = [
  {
    label: 'basic-query',
    detail: 'Basic Flux query',
    apply: 'from(bucket: "${1:bucket}")\n  |> range(start: ${2:-1h})\n  |> filter(fn: (r) => r["_measurement"] == "${3:measurement}")',
    type: 'snippet',
  },
  {
    label: 'filter-field',
    detail: 'Filter by field',
    apply: '|> filter(fn: (r) => r["_field"] == "${1:field}")',
    type: 'snippet',
  },
  {
    label: 'filter-tag',
    detail: 'Filter by tag',
    apply: '|> filter(fn: (r) => r["${1:tag}"] == "${2:value}")',
    type: 'snippet',
  },
  {
    label: 'aggregate-window',
    detail: 'Aggregate window',
    apply: '|> aggregateWindow(every: ${1:5m}, fn: ${2:mean}, createEmpty: false)',
    type: 'snippet',
  },
  {
    label: 'group-by',
    detail: 'Group by columns',
    apply: '|> group(columns: [${1:"tag1", "tag2"}])',
    type: 'snippet',
  },
  {
    label: 'map',
    detail: 'Map transformation',
    apply: '|> map(fn: (r) => ({ r with ${1:newField}: ${2:r._value * 2} }))',
    type: 'snippet',
  },
  {
    label: 'yield',
    detail: 'Yield result',
    apply: '|> yield(name: "${1:result}")',
    type: 'snippet',
  },
  {
    label: 'join',
    detail: 'Join two streams',
    apply: 'join(tables: {${1:left}: ${2:stream1}, ${3:right}: ${4:stream2}}, on: [${5:"_time"}])',
    type: 'snippet',
  },
];

/**
 * Create Flux language support
 */
export function flux(): LanguageSupport {
  return new LanguageSupport(fluxLanguage);
}

