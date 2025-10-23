/**
 * Dialect Language Support
 *
 * Exports all dialect-specific language support modules
 */

import type { Extension } from '@codemirror/state';
import { sql } from '@codemirror/lang-sql';
import { influxql, influxqlCompletion, influxqlSnippets } from './influxql';
import { flux, fluxCompletion, fluxSnippets } from './flux';
import { iotdb, iotdbCompletion, iotdbSnippets } from './iotdb';
import { promql, promqlCompletion, promqlSnippets } from './promql';
import { autocompletion } from '@codemirror/autocomplete';
import { linter } from '@codemirror/lint';
import type { QueryDialect } from '../DialectSelector';
import { schemaCompletionProvider } from '../schemaCompletion';
import { createLinter } from '../linting';

/**
 * Get language extension for a dialect
 */
export function getDialectLanguage(dialect: QueryDialect): Extension {
  switch (dialect) {
    case 'influxql':
      return influxql();

    case 'flux':
      return flux();

    case 'iotdb-sql':
      return iotdb();

    case 'sql':
      return sql();

    case 'promql':
      return promql();

    default:
      return sql();
  }
}

/**
 * Get auto-completion extension for a dialect
 * Combines dialect-specific completion with schema-aware completion
 */
export function getDialectCompletion(dialect: QueryDialect): Extension {
  // Schema completion function that combines with dialect completion
  const schemaCompletion = async (context: any) => {
    return await schemaCompletionProvider.provideCompletions(context);
  };

  switch (dialect) {
    case 'influxql':
      return autocompletion({
        override: [
          influxqlCompletion,
          schemaCompletion,
        ],
        defaultKeymap: true,
      });

    case 'flux':
      return autocompletion({
        override: [
          fluxCompletion,
          schemaCompletion,
        ],
        defaultKeymap: true,
      });

    case 'iotdb-sql':
      return autocompletion({
        override: [
          iotdbCompletion,
          schemaCompletion,
        ],
        defaultKeymap: true,
      });

    case 'promql':
      return autocompletion({
        override: [
          promqlCompletion,
          schemaCompletion,
        ],
        defaultKeymap: true,
      });

    case 'sql':
      // Use schema completion for SQL
      return autocompletion({
        override: [schemaCompletion],
        defaultKeymap: true,
      });

    default:
      return autocompletion({
        override: [schemaCompletion],
        defaultKeymap: true,
      });
  }
}

/**
 * Get snippets for a dialect
 */
export function getDialectSnippets(dialect: QueryDialect) {
  switch (dialect) {
    case 'influxql':
      return influxqlSnippets;

    case 'flux':
      return fluxSnippets;

    case 'iotdb-sql':
      return iotdbSnippets;

    case 'promql':
      return promqlSnippets;

    case 'sql':
    default:
      return [];
  }
}

/**
 * Get linting extension for a dialect
 */
export function getDialectLinting(dialect: QueryDialect): Extension {
  return linter(createLinter(dialect));
}

/**
 * Get all extensions for a dialect (language + completion + linting)
 */
export function getDialectExtensions(dialect: QueryDialect): Extension[] {
  return [
    getDialectLanguage(dialect),
    getDialectCompletion(dialect),
    getDialectLinting(dialect),
  ];
}

// Re-export individual dialect modules
export { influxql, influxqlCompletion, influxqlSnippets } from './influxql';
export { flux, fluxCompletion, fluxSnippets } from './flux';
export { iotdb, iotdbCompletion, iotdbSnippets } from './iotdb';
export { promql, promqlCompletion, promqlSnippets } from './promql';

