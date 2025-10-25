/**
 * SQL Utilities for CodeMirror 6
 * 
 * Provides utilities for parsing and handling SQL statements
 */

import type { EditorView } from '@codemirror/view';

/**
 * Statement boundary information
 */
export interface StatementBoundary {
  start: number;
  end: number;
  statement: string;
}

/**
 * Parse SQL text and split into individual statements
 * Handles strings and comments correctly
 */
export function findStatementBoundaries(text: string): StatementBoundary[] {
  const boundaries: StatementBoundary[] = [];
  let currentStart = 0;
  let inString = false;
  let stringChar = '';
  let inLineComment = false;
  let inBlockComment = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    // Handle line comments
    if (!inString && !inBlockComment) {
      if ((char === '-' && nextChar === '-') || char === '#') {
        inLineComment = true;
        continue;
      }
    }

    if (inLineComment) {
      if (char === '\n') {
        inLineComment = false;
      }
      continue;
    }

    // Handle block comments
    if (!inString && !inLineComment) {
      if (char === '/' && nextChar === '*') {
        inBlockComment = true;
        i++; // Skip next char
        continue;
      }
    }

    if (inBlockComment) {
      if (char === '*' && nextChar === '/') {
        inBlockComment = false;
        i++; // Skip next char
      }
      continue;
    }

    // Handle strings
    if (!inLineComment && !inBlockComment) {
      if (char === "'" || char === '"' || char === '`') {
        if (!inString) {
          inString = true;
          stringChar = char;
        } else if (char === stringChar) {
          // Check for escaped quote
          if (nextChar === stringChar) {
            i++; // Skip escaped quote
          } else {
            inString = false;
          }
        }
        continue;
      }
    }

    // Handle semicolon (statement separator)
    if (!inString && !inLineComment && !inBlockComment && char === ';') {
      const statement = text.slice(currentStart, i + 1).trim();
      if (statement) {
        boundaries.push({
          start: currentStart,
          end: i + 1,
          statement,
        });
      }
      currentStart = i + 1;
    }
  }

  // Add the last statement if there's any remaining text
  const lastStatement = text.slice(currentStart).trim();
  if (lastStatement) {
    boundaries.push({
      start: currentStart,
      end: text.length,
      statement: lastStatement,
    });
  }

  return boundaries;
}

/**
 * Get all SQL statements from text
 */
export function getAllStatements(text: string): string[] {
  const boundaries = findStatementBoundaries(text);
  return boundaries.map(b => b.statement);
}

/**
 * Get the SQL statement at a specific position
 */
export function getCurrentStatementFromText(text: string, pos: number): string | null {
  const boundaries = findStatementBoundaries(text);
  
  for (const boundary of boundaries) {
    if (pos >= boundary.start && pos <= boundary.end) {
      return boundary.statement;
    }
  }

  return null;
}

/**
 * Get the SQL statement at the current cursor position
 */
export function getCurrentStatement(view: EditorView): string | null {
  const state = view.state;
  const pos = state.selection.main.head;
  const text = state.doc.toString();
  
  return getCurrentStatementFromText(text, pos);
}

/**
 * Get the number of SQL statements in the text
 */
export function getStatementCount(text: string): number {
  return findStatementBoundaries(text).length;
}

/**
 * Check if cursor is at the end of a statement
 */
export function isAtStatementEnd(view: EditorView): boolean {
  const state = view.state;
  const pos = state.selection.main.head;
  const text = state.doc.toString();
  
  // Check if the character before cursor is a semicolon
  if (pos > 0 && text[pos - 1] === ';') {
    return true;
  }

  // Check if we're at the end of the document
  if (pos === text.length) {
    return true;
  }

  return false;
}

/**
 * Highlight statement separators (semicolons)
 * This can be used to add visual indicators for statement boundaries
 */
export function highlightStatementSeparators(view: EditorView): void {
  // This is a placeholder for future implementation
  // Could add decorations to highlight semicolons
}

