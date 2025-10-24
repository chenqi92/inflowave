/**
 * Syntax Validation and Linting for CodeMirror 6
 * 
 * Provides basic syntax checking and error detection for query languages
 */

import type { Diagnostic } from '@codemirror/lint';
import type { EditorView } from '@codemirror/view';
import type { QueryDialect } from './DialectSelector';
import { logger } from '@/utils/logger';

/**
 * Lint result
 */
interface LintResult {
  diagnostics: Diagnostic[];
}

/**
 * Base linter class
 */
abstract class BaseLinter {
  abstract lint(doc: string): Diagnostic[];

  /**
   * Create a diagnostic
   */
  protected createDiagnostic(
    from: number,
    to: number,
    message: string,
    severity: 'error' | 'warning' | 'info' = 'error'
  ): Diagnostic {
    return {
      from,
      to,
      severity,
      message,
    };
  }

  /**
   * Find all occurrences of a pattern
   */
  protected findPattern(doc: string, pattern: RegExp): Array<{ match: RegExpMatchArray; index: number }> {
    const results: Array<{ match: RegExpMatchArray; index: number }> = [];
    let match: RegExpMatchArray | null;

    const regex = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : `${pattern.flags  }g`);

    while ((match = regex.exec(doc)) !== null) {
      results.push({ match, index: match.index ?? 0 });
    }

    return results;
  }
}

/**
 * SQL/InfluxQL Linter
 */
class SQLLinter extends BaseLinter {
  lint(doc: string): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];
    const lines = doc.split('\n');

    // Check for unmatched quotes
    const quoteMatches = this.findPattern(doc, /["']/g);
    let inString = false;
    let stringChar = '';
    let stringStart = 0;

    for (const { match, index } of quoteMatches) {
      const char = match[0];
      if (!inString) {
        inString = true;
        stringChar = char;
        stringStart = index;
      } else if (char === stringChar) {
        inString = false;
      }
    }

    if (inString) {
      diagnostics.push(
        this.createDiagnostic(
          stringStart,
          stringStart + 1,
          'Unclosed string literal',
          'error'
        )
      );
    }

    // Check for unmatched parentheses
    let parenDepth = 0;
    let lastOpenParen = -1;

    for (let i = 0; i < doc.length; i++) {
      if (doc[i] === '(') {
        parenDepth++;
        if (parenDepth === 1) {
          lastOpenParen = i;
        }
      } else if (doc[i] === ')') {
        parenDepth--;
        if (parenDepth < 0) {
          diagnostics.push(
            this.createDiagnostic(i, i + 1, 'Unmatched closing parenthesis', 'error')
          );
          parenDepth = 0;
        }
      }
    }

    if (parenDepth > 0 && lastOpenParen >= 0) {
      diagnostics.push(
        this.createDiagnostic(
          lastOpenParen,
          lastOpenParen + 1,
          'Unmatched opening parenthesis',
          'error'
        )
      );
    }

    // Check for common SQL mistakes
    const upperDoc = doc.toUpperCase();

    // SELECT without FROM (warning, not error - could be valid in some cases)
    if (upperDoc.includes('SELECT') && !upperDoc.includes('FROM')) {
      const selectIndex = upperDoc.indexOf('SELECT');
      if (selectIndex >= 0) {
        diagnostics.push(
          this.createDiagnostic(
            selectIndex,
            selectIndex + 6,
            'SELECT statement without FROM clause',
            'warning'
          )
        );
      }
    }

    // WHERE without FROM
    if (upperDoc.includes('WHERE') && !upperDoc.includes('FROM')) {
      const whereIndex = upperDoc.indexOf('WHERE');
      if (whereIndex >= 0) {
        diagnostics.push(
          this.createDiagnostic(
            whereIndex,
            whereIndex + 5,
            'WHERE clause without FROM clause',
            'error'
          )
        );
      }
    }

    // GROUP BY without SELECT
    if (upperDoc.includes('GROUP BY') && !upperDoc.includes('SELECT')) {
      const groupByIndex = upperDoc.indexOf('GROUP BY');
      if (groupByIndex >= 0) {
        diagnostics.push(
          this.createDiagnostic(
            groupByIndex,
            groupByIndex + 8,
            'GROUP BY without SELECT',
            'error'
          )
        );
      }
    }

    return diagnostics;
  }
}

/**
 * Flux Linter
 */
class FluxLinter extends BaseLinter {
  lint(doc: string): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    // Check for unmatched quotes
    const quoteMatches = this.findPattern(doc, /["]/g);
    let inString = false;
    let stringStart = 0;

    for (const { match, index } of quoteMatches) {
      if (!inString) {
        inString = true;
        stringStart = index;
      } else {
        inString = false;
      }
    }

    if (inString) {
      diagnostics.push(
        this.createDiagnostic(stringStart, stringStart + 1, 'Unclosed string literal', 'error')
      );
    }

    // Check for unmatched parentheses and brackets
    let parenDepth = 0;
    let bracketDepth = 0;
    let braceDepth = 0;
    let lastOpenParen = -1;
    let lastOpenBracket = -1;
    let lastOpenBrace = -1;

    for (let i = 0; i < doc.length; i++) {
      const char = doc[i];
      
      if (char === '(') {
        parenDepth++;
        if (parenDepth === 1) lastOpenParen = i;
      } else if (char === ')') {
        parenDepth--;
        if (parenDepth < 0) {
          diagnostics.push(this.createDiagnostic(i, i + 1, 'Unmatched closing parenthesis', 'error'));
          parenDepth = 0;
        }
      } else if (char === '[') {
        bracketDepth++;
        if (bracketDepth === 1) lastOpenBracket = i;
      } else if (char === ']') {
        bracketDepth--;
        if (bracketDepth < 0) {
          diagnostics.push(this.createDiagnostic(i, i + 1, 'Unmatched closing bracket', 'error'));
          bracketDepth = 0;
        }
      } else if (char === '{') {
        braceDepth++;
        if (braceDepth === 1) lastOpenBrace = i;
      } else if (char === '}') {
        braceDepth--;
        if (braceDepth < 0) {
          diagnostics.push(this.createDiagnostic(i, i + 1, 'Unmatched closing brace', 'error'));
          braceDepth = 0;
        }
      }
    }

    if (parenDepth > 0 && lastOpenParen >= 0) {
      diagnostics.push(this.createDiagnostic(lastOpenParen, lastOpenParen + 1, 'Unmatched opening parenthesis', 'error'));
    }
    if (bracketDepth > 0 && lastOpenBracket >= 0) {
      diagnostics.push(this.createDiagnostic(lastOpenBracket, lastOpenBracket + 1, 'Unmatched opening bracket', 'error'));
    }
    if (braceDepth > 0 && lastOpenBrace >= 0) {
      diagnostics.push(this.createDiagnostic(lastOpenBrace, lastOpenBrace + 1, 'Unmatched opening brace', 'error'));
    }

    // Check for pipe operator usage
    if (!doc.includes('|>') && doc.includes('from(')) {
      diagnostics.push(
        this.createDiagnostic(0, 0, 'Flux queries typically use pipe operators (|>)', 'info')
      );
    }

    return diagnostics;
  }
}

/**
 * PromQL Linter
 */
class PromQLLinter extends BaseLinter {
  lint(doc: string): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    // Check for unmatched brackets (metric selectors)
    let bracketDepth = 0;
    let lastOpenBracket = -1;

    for (let i = 0; i < doc.length; i++) {
      if (doc[i] === '{') {
        bracketDepth++;
        if (bracketDepth === 1) lastOpenBracket = i;
      } else if (doc[i] === '}') {
        bracketDepth--;
        if (bracketDepth < 0) {
          diagnostics.push(this.createDiagnostic(i, i + 1, 'Unmatched closing brace', 'error'));
          bracketDepth = 0;
        }
      }
    }

    if (bracketDepth > 0 && lastOpenBracket >= 0) {
      diagnostics.push(this.createDiagnostic(lastOpenBracket, lastOpenBracket + 1, 'Unmatched opening brace', 'error'));
    }

    // Check for unmatched parentheses
    let parenDepth = 0;
    let lastOpenParen = -1;

    for (let i = 0; i < doc.length; i++) {
      if (doc[i] === '(') {
        parenDepth++;
        if (parenDepth === 1) lastOpenParen = i;
      } else if (doc[i] === ')') {
        parenDepth--;
        if (parenDepth < 0) {
          diagnostics.push(this.createDiagnostic(i, i + 1, 'Unmatched closing parenthesis', 'error'));
          parenDepth = 0;
        }
      }
    }

    if (parenDepth > 0 && lastOpenParen >= 0) {
      diagnostics.push(this.createDiagnostic(lastOpenParen, lastOpenParen + 1, 'Unmatched opening parenthesis', 'error'));
    }

    return diagnostics;
  }
}

/**
 * Get linter for dialect
 */
function getLinterForDialect(dialect: QueryDialect): BaseLinter {
  switch (dialect) {
    case 'influxql':
    case 'sql':
    case 'iotdb-sql':
      return new SQLLinter();
    
    case 'flux':
      return new FluxLinter();
    
    case 'promql':
      return new PromQLLinter();
    
    default:
      return new SQLLinter();
  }
}

/**
 * Create linter function for CodeMirror
 */
export function createLinter(dialect: QueryDialect) {
  return (view: EditorView): Diagnostic[] => {
    try {
      const doc = view.state.doc.toString();
      const linter = getLinterForDialect(dialect);
      return linter.lint(doc);
    } catch (error) {
      logger.error('Linting error:', error);
      return [];
    }
  };
}

