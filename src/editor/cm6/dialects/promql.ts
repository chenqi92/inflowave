/**
 * PromQL Language Support for CodeMirror 6
 * 
 * Provides syntax highlighting, auto-completion, and snippets for PromQL (Prometheus Query Language)
 */

import { LanguageSupport, StreamLanguage } from '@codemirror/language';
import type { CompletionContext, CompletionResult } from '@codemirror/autocomplete';

/**
 * PromQL keywords and operators
 */
const KEYWORDS = [
  'and', 'or', 'unless', 'by', 'without', 'on', 'ignoring', 'group_left', 'group_right',
  'bool', 'offset'
];

/**
 * PromQL aggregation operators
 */
const AGGREGATION_OPERATORS = [
  'sum', 'min', 'max', 'avg', 'group', 'stddev', 'stdvar',
  'count', 'count_values', 'bottomk', 'topk', 'quantile'
];

/**
 * PromQL functions
 */
const FUNCTIONS = [
  // Math functions
  'abs', 'ceil', 'floor', 'round', 'exp', 'ln', 'log2', 'log10', 'sqrt',
  // Time functions
  'time', 'timestamp', 'minute', 'hour', 'day_of_month', 'day_of_week',
  'day_of_year', 'days_in_month', 'month', 'year',
  // Rate functions
  'rate', 'irate', 'increase', 'delta', 'idelta', 'deriv', 'predict_linear',
  // Aggregation over time
  'avg_over_time', 'min_over_time', 'max_over_time', 'sum_over_time',
  'count_over_time', 'quantile_over_time', 'stddev_over_time', 'stdvar_over_time',
  'last_over_time', 'present_over_time',
  // Label manipulation
  'label_replace', 'label_join',
  // Sorting
  'sort', 'sort_desc',
  // Histogram
  'histogram_quantile',
  // Other
  'absent', 'absent_over_time', 'changes', 'clamp', 'clamp_max', 'clamp_min',
  'resets', 'scalar', 'vector', 'holt_winters'
];

/**
 * All PromQL operators
 */
const ALL_OPERATORS = [...AGGREGATION_OPERATORS, ...FUNCTIONS];

/**
 * Create keyword set for fast lookup
 */
const keywordSet = new Set(KEYWORDS);
const operatorSet = new Set(ALL_OPERATORS);

/**
 * PromQL stream parser
 */
const promqlLanguage = StreamLanguage.define({
  name: 'promql',
  
  token(stream, state) {
    // Skip whitespace
    if (stream.eatSpace()) {
      return null;
    }

    // Comments
    if (stream.match(/^#.*/)) {
      return 'comment';
    }

    // Strings (single or double quoted)
    if (stream.match(/^"([^"\\]|\\.)*"/)) {
      return 'string';
    }
    if (stream.match(/^'([^'\\]|\\.)*'/)) {
      return 'string';
    }
    if (stream.match(/^`([^`\\]|\\.)*`/)) {
      return 'string';
    }

    // Numbers (including scientific notation)
    if (stream.match(/^[0-9]+(\.[0-9]+)?([eE][+-]?[0-9]+)?/)) {
      return 'number';
    }

    // Duration literals (e.g., 5m, 1h, 30s)
    if (stream.match(/^[0-9]+[smhdwy]/)) {
      return 'number';
    }

    // Operators
    if (stream.match(/^(==|!=|<=|>=|=~|!~|[+\-*/%^<>])/)) {
      return 'operator';
    }

    // Punctuation
    if (stream.match(/^[(){}[\],]/)) {
      return 'punctuation';
    }

    // Metric names and identifiers
    const word = stream.match(/^[a-zA-Z_:][a-zA-Z0-9_:]*/);
    if (word && Array.isArray(word)) {
      const lower = word[0].toLowerCase();
      
      if (keywordSet.has(lower)) {
        return 'keyword';
      }
      if (operatorSet.has(lower)) {
        return 'function';
      }
      
      // Check if it's followed by '(' - likely a function
      if (stream.peek() === '(') {
        return 'function';
      }
      
      // Check if it's followed by '{' - likely a metric name
      if (stream.peek() === '{') {
        return 'variable.special';
      }
      
      return 'variable';
    }

    // Fallback
    stream.next();
    return null;
  },

  languageData: {
    commentTokens: { line: '#' },
    closeBrackets: { brackets: ['(', '[', '{', "'", '"', '`'] },
  }
});

/**
 * Auto-completion for PromQL
 */
export function promqlCompletion(context: CompletionContext): CompletionResult | null {
  const word = context.matchBefore(/[\w:]*/);
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
    // Aggregation operators
    ...AGGREGATION_OPERATORS.map(op => ({
      label: op,
      type: 'function',
      boost: 3,
      apply: `${op}()`,
    })),
    // Functions
    ...FUNCTIONS.map(f => ({
      label: f,
      type: 'function',
      boost: 1,
      apply: `${f}()`,
    })),
  ];

  return {
    from: word.from,
    options,
    validFor: /^[\w:]*$/,
  };
}

/**
 * PromQL snippets
 */
export const promqlSnippets = [
  {
    label: 'rate',
    detail: 'Calculate per-second rate',
    apply: 'rate(${1:metric}[${2:5m}])',
    type: 'snippet',
  },
  {
    label: 'irate',
    detail: 'Calculate instant rate',
    apply: 'irate(${1:metric}[${2:5m}])',
    type: 'snippet',
  },
  {
    label: 'sum-by',
    detail: 'Sum by labels',
    apply: 'sum by (${1:label}) (${2:metric})',
    type: 'snippet',
  },
  {
    label: 'avg-by',
    detail: 'Average by labels',
    apply: 'avg by (${1:label}) (${2:metric})',
    type: 'snippet',
  },
  {
    label: 'topk',
    detail: 'Top K metrics',
    apply: 'topk(${1:10}, ${2:metric})',
    type: 'snippet',
  },
  {
    label: 'bottomk',
    detail: 'Bottom K metrics',
    apply: 'bottomk(${1:10}, ${2:metric})',
    type: 'snippet',
  },
  {
    label: 'histogram-quantile',
    detail: 'Calculate histogram quantile',
    apply: 'histogram_quantile(${1:0.95}, sum by (le) (rate(${2:metric}_bucket[${3:5m}])))',
    type: 'snippet',
  },
  {
    label: 'increase',
    detail: 'Calculate increase over time',
    apply: 'increase(${1:metric}[${2:5m}])',
    type: 'snippet',
  },
  {
    label: 'avg-over-time',
    detail: 'Average over time',
    apply: 'avg_over_time(${1:metric}[${2:5m}])',
    type: 'snippet',
  },
  {
    label: 'max-over-time',
    detail: 'Maximum over time',
    apply: 'max_over_time(${1:metric}[${2:5m}])',
    type: 'snippet',
  },
];

/**
 * Create PromQL language support
 */
export function promql(): LanguageSupport {
  return new LanguageSupport(promqlLanguage);
}

