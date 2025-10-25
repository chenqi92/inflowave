/**
 * Schema-aware Auto-completion for CodeMirror 6
 *
 * Provides intelligent auto-completion based on database schema
 */

import type { CompletionContext, CompletionResult, Completion } from '@codemirror/autocomplete';
import { safeTauriInvoke } from '@/utils/tauri';
import { logger } from '@/utils/logger';
import type { QueryDialect } from './DialectSelector';

/**
 * SQL Keywords by dialect
 */
const SQL_KEYWORDS: Record<QueryDialect, string[]> = {
  'sql': [
    'SELECT', 'FROM', 'WHERE', 'GROUP BY', 'ORDER BY', 'LIMIT', 'OFFSET',
    'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'DROP', 'ALTER',
    'JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN', 'OUTER JOIN',
    'ON', 'AS', 'AND', 'OR', 'NOT', 'IN', 'LIKE', 'BETWEEN',
    'IS NULL', 'IS NOT NULL', 'DISTINCT', 'COUNT', 'SUM', 'AVG', 'MIN', 'MAX',
  ],
  'influxql': [
    'SELECT', 'FROM', 'WHERE', 'GROUP BY', 'ORDER BY', 'LIMIT', 'OFFSET',
    'SHOW', 'DATABASES', 'MEASUREMENTS', 'SERIES', 'TAG', 'KEYS', 'FIELD',
    'RETENTION', 'POLICIES', 'CREATE', 'DROP', 'DELETE',
    'AND', 'OR', 'NOT', 'IN', 'FILL',
    'COUNT', 'SUM', 'MEAN', 'MEDIAN', 'MIN', 'MAX', 'FIRST', 'LAST',
  ],
  'flux': [
    'from', 'range', 'filter', 'map', 'reduce', 'group', 'sort', 'limit',
    'yield', 'to', 'aggregateWindow', 'window',
    'count', 'sum', 'mean', 'median', 'min', 'max',
  ],
  'iotdb-sql': [
    'SELECT', 'FROM', 'WHERE', 'GROUP BY', 'ORDER BY', 'LIMIT', 'OFFSET',
    'SHOW', 'TIMESERIES', 'DEVICES', 'STORAGE', 'GROUP',
    'CREATE', 'DROP', 'INSERT', 'DELETE',
    'AND', 'OR', 'NOT', 'IN', 'LIKE',
    'COUNT', 'SUM', 'AVG', 'MIN', 'MAX',
  ],
  'promql': [
    'sum', 'avg', 'min', 'max', 'count',
    'rate', 'irate', 'increase', 'delta',
    'by', 'without', 'on', 'ignoring',
    'and', 'or', 'unless',
  ],
};

/**
 * Schema cache for auto-completion
 */
interface SchemaCache {
  databases: string[];
  tables: Map<string, string[]>; // database -> tables
  fields: Map<string, string[]>; // database.table -> fields
  tags: Map<string, string[]>; // database.table -> tags
  lastUpdate: number;
}

/**
 * Schema completion provider
 */
export class SchemaCompletionProvider {
  private cache: SchemaCache = {
    databases: [],
    tables: new Map(),
    fields: new Map(),
    tags: new Map(),
    lastUpdate: 0,
  };

  private connectionId: string | null = null;
  private currentDatabase: string | null = null;
  private dialect: QueryDialect = 'sql';
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes

  /**
   * Set connection context
   */
  setContext(connectionId: string, database: string, dialect: QueryDialect) {
    const contextChanged = 
      this.connectionId !== connectionId || 
      this.currentDatabase !== database ||
      this.dialect !== dialect;

    this.connectionId = connectionId;
    this.currentDatabase = database;
    this.dialect = dialect;

    // Clear cache if context changed
    if (contextChanged) {
      this.clearCache();
    }
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache = {
      databases: [],
      tables: new Map(),
      fields: new Map(),
      tags: new Map(),
      lastUpdate: 0,
    };
  }

  /**
   * Check if cache is valid
   */
  private isCacheValid(): boolean {
    return Date.now() - this.cache.lastUpdate < this.cacheTimeout;
  }

  /**
   * Fetch databases
   */
  private async fetchDatabases(): Promise<string[]> {
    if (!this.connectionId) return [];

    try {
      const databases = await safeTauriInvoke<string[]>('get_databases', {
        connectionId: this.connectionId,
      });
      return databases || [];
    } catch (error) {
      logger.error('Failed to fetch databases:', error);
      return [];
    }
  }

  /**
   * Fetch tables/measurements
   */
  private async fetchTables(database: string): Promise<string[]> {
    if (!this.connectionId) return [];

    try {
      // Try multiple methods to get tables/measurements
      const methods = [
        { name: 'get_measurements', params: { connectionId: this.connectionId, database } },
        { name: 'get_tables', params: { connectionId: this.connectionId, database } },
        { name: 'get_query_suggestions', params: { connectionId: this.connectionId, database, partialQuery: '' } },
      ];

      for (const method of methods) {
        try {
          const tables = await safeTauriInvoke<string[]>(method.name, method.params);
          if (tables && tables.length > 0) {
            logger.debug(`${method.name} returned ${tables.length} tables/measurements`);
            return tables;
          }
        } catch (error) {
          logger.debug(`${method.name} failed, trying next method`);
        }
      }

      return [];
    } catch (error) {
      logger.error(`Failed to fetch tables for ${database}:`, error);
      return [];
    }
  }

  /**
   * Fetch fields
   */
  private async fetchFields(database: string, table: string): Promise<string[]> {
    if (!this.connectionId) return [];

    try {
      const result = await safeTauriInvoke<any>('get_field_keys', {
        connectionId: this.connectionId,
        database,
        measurement: table,
      });

      // Handle different response formats
      if (Array.isArray(result)) {
        // If it's an array of objects with 'name' or 'fieldKey' property
        if (result.length > 0 && typeof result[0] === 'object') {
          return result.map((item: any) => item.name || item.fieldKey || item.field_key || String(item)).filter(Boolean);
        }
        // If it's an array of strings
        return result.filter(Boolean);
      }

      return [];
    } catch (error) {
      logger.debug(`Failed to fetch fields for ${database}.${table}:`, error);
      return [];
    }
  }

  /**
   * Fetch tags
   */
  private async fetchTags(database: string, table: string): Promise<string[]> {
    if (!this.connectionId) return [];

    try {
      const result = await safeTauriInvoke<any>('get_tag_keys', {
        connectionId: this.connectionId,
        database,
        measurement: table,
      });

      // Handle different response formats
      if (Array.isArray(result)) {
        // If it's an array of objects with 'name' or 'tagKey' property
        if (result.length > 0 && typeof result[0] === 'object') {
          return result.map((item: any) => item.name || item.tagKey || item.tag_key || String(item)).filter(Boolean);
        }
        // If it's an array of strings
        return result.filter(Boolean);
      }

      return [];
    } catch (error) {
      logger.debug(`Failed to fetch tags for ${database}.${table}:`, error);
      return [];
    }
  }

  /**
   * Load schema for current database
   */
  async loadSchema(): Promise<void> {
    if (!this.connectionId || !this.currentDatabase) return;
    if (this.isCacheValid()) return;

    try {
      // Fetch tables for current database
      const tables = await this.fetchTables(this.currentDatabase);
      this.cache.tables.set(this.currentDatabase, tables);

      // Fetch fields and tags for each table (limit to first 10 for performance)
      const tablesToFetch = tables.slice(0, 10);
      await Promise.all(
        tablesToFetch.map(async (table) => {
          const key = `${this.currentDatabase}.${table}`;
          
          const [fields, tags] = await Promise.all([
            this.fetchFields(this.currentDatabase!, table),
            this.fetchTags(this.currentDatabase!, table),
          ]);

          this.cache.fields.set(key, fields);
          this.cache.tags.set(key, tags);
        })
      );

      this.cache.lastUpdate = Date.now();
      logger.debug('Schema loaded successfully');
    } catch (error) {
      logger.error('Failed to load schema:', error);
    }
  }

  /**
   * Get table completions
   */
  private getTableCompletions(): Completion[] {
    if (!this.currentDatabase) return [];

    const tables = this.cache.tables.get(this.currentDatabase) || [];
    return tables.map(table => ({
      label: table,
      type: 'type', // Use 'type' for tables/measurements - shows as a type icon
      boost: 10,
      detail: this.dialect === 'influxql' ? '📊 measurement' : '📊 table',
    }));
  }

  /**
   * Get field completions
   */
  private getFieldCompletions(table?: string): Completion[] {
    if (!this.currentDatabase) return [];

    if (table) {
      // Get fields for specific table
      const key = `${this.currentDatabase}.${table}`;
      const fields = this.cache.fields.get(key) || [];
      return fields.map(field => ({
        label: field,
        type: 'variable', // Use 'variable' for fields - shows as a variable icon
        boost: 8,
        detail: '📝 field',
      }));
    }

    // Get all fields from all tables
    const allFields = new Set<string>();
    this.cache.fields.forEach((fields) => {
      fields.forEach(field => allFields.add(field));
    });

    return Array.from(allFields).map(field => ({
      label: field,
      type: 'variable', // Use 'variable' for fields - shows as a variable icon
      boost: 5,
      detail: '📝 field',
    }));
  }

  /**
   * Get tag completions
   */
  private getTagCompletions(table?: string): Completion[] {
    if (!this.currentDatabase) return [];

    if (table) {
      // Get tags for specific table
      const key = `${this.currentDatabase}.${table}`;
      const tags = this.cache.tags.get(key) || [];
      return tags.map(tag => ({
        label: tag,
        type: 'constant', // Use 'constant' for tags - shows as a constant icon
        boost: 8,
        detail: '🏷️ tag',
      }));
    }

    // Get all tags from all tables
    const allTags = new Set<string>();
    this.cache.tags.forEach((tags) => {
      tags.forEach(tag => allTags.add(tag));
    });

    return Array.from(allTags).map(tag => ({
      label: tag,
      type: 'constant', // Use 'constant' for tags - shows as a constant icon
      boost: 5,
      detail: '🏷️ tag',
    }));
  }

  /**
   * Extract table name from query context
   */
  private extractTableFromContext(text: string): string | null {
    // Try to find FROM clause
    const fromMatch = text.match(/FROM\s+["']?([a-zA-Z0-9_.-]+)["']?/i);
    if (fromMatch) {
      return fromMatch[1];
    }

    // Try to find measurement in InfluxQL
    const measurementMatch = text.match(/measurement\s*=\s*["']([^"']+)["']/i);
    if (measurementMatch) {
      return measurementMatch[1];
    }

    return null;
  }

  /**
   * Get keyword completions
   */
  private getKeywordCompletions(): Completion[] {
    const keywords = SQL_KEYWORDS[this.dialect] || SQL_KEYWORDS['sql'];
    return keywords.map(keyword => ({
      label: keyword,
      type: 'keyword', // Use 'keyword' for SQL keywords - shows as a keyword icon
      boost: 15,
      apply: keyword,
      detail: '🔑 keyword',
    }));
  }

  /**
   * Provide schema-aware completions
   */
  async provideCompletions(context: CompletionContext): Promise<CompletionResult | null> {
    const word = context.matchBefore(/[\w.]*/);
    if (!word || (word.from === word.to && !context.explicit)) {
      return null;
    }

    // Load schema if needed
    await this.loadSchema();

    // Get text before cursor
    const textBefore = context.state.doc.sliceString(0, context.pos).toLowerCase();

    // Determine what to suggest based on context
    let completions: Completion[] = [];

    // Always include keywords
    const keywords = this.getKeywordCompletions();

    // After FROM keyword - suggest tables
    if (/\bfrom\s+\w*$/i.test(textBefore)) {
      completions = [...this.getTableCompletions(), ...keywords];
    }
    // After SELECT keyword - suggest fields
    else if (/\bselect\s+\w*$/i.test(textBefore)) {
      completions = [...this.getFieldCompletions(), ...keywords];
    }
    // After WHERE keyword - suggest fields and tags
    else if (/\bwhere\s+\w*$/i.test(textBefore)) {
      const table = this.extractTableFromContext(textBefore);
      completions = [
        ...this.getFieldCompletions(table || undefined),
        ...this.getTagCompletions(table || undefined),
        ...keywords,
      ];
    }
    // After GROUP BY - suggest tags
    else if (/\bgroup\s+by\s+\w*$/i.test(textBefore)) {
      const table = this.extractTableFromContext(textBefore);
      completions = [...this.getTagCompletions(table || undefined), ...keywords];
    }
    // Default - suggest everything including keywords
    else {
      completions = [
        ...keywords,
        ...this.getTableCompletions(),
        ...this.getFieldCompletions(),
        ...this.getTagCompletions(),
      ];
    }

    if (completions.length === 0) {
      return null;
    }

    return {
      from: word.from,
      options: completions,
      validFor: /^[\w.]*$/,
    };
  }
}

/**
 * Global schema completion provider instance
 */
export const schemaCompletionProvider = new SchemaCompletionProvider();

