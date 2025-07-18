/**
 * InfluxQL智能自动补全工具
 */

// SQL关键词
export const SQL_KEYWORDS = [
  'SELECT', 'FROM', 'WHERE', 'GROUP BY', 'ORDER BY', 'LIMIT', 'OFFSET',
  'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'DROP', 'ALTER',
  'SHOW', 'DESCRIBE', 'EXPLAIN', 'AND', 'OR', 'NOT', 'IN', 'LIKE', 'BETWEEN',
  'IS', 'NULL', 'TRUE', 'FALSE', 'AS', 'DISTINCT', 'INTO', 'VALUES'
];

// SQL函数
export const SQL_FUNCTIONS = [
  'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'FIRST', 'LAST', 'MEAN', 'MEDIAN',
  'MODE', 'STDDEV', 'SPREAD', 'PERCENTILE', 'DERIVATIVE', 'DIFFERENCE',
  'ELAPSED', 'MOVING_AVERAGE', 'CUMULATIVE_SUM', 'TIME', 'NOW', 'AGO',
  'DURATION', 'FILL', 'SLIMIT', 'SOFFSET'
];

// InfluxDB特有关键词
export const INFLUXDB_KEYWORDS = [
  'MEASUREMENTS', 'DATABASES', 'RETENTION', 'POLICIES', 'CONTINUOUS', 'QUERIES',
  'USERS', 'GRANTS', 'FIELD', 'KEYS', 'TAG', 'KEYS', 'TAG', 'VALUES'
];

/**
 * 设置Monaco编辑器的自动补全
 */
export function setupInfluxQLAutoComplete(monaco: any, editor: any, selectedDatabase?: string) {
  // 注册自动补全提供者
  const disposable = monaco.languages.registerCompletionItemProvider('sql', {
    provideCompletionItems: async (model: any, position: any) => {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn
      };

      const suggestions: any[] = [];

      // 获取当前行内容
      const lineContent = model.getLineContent(position.lineNumber);
      const beforeCursor = lineContent.substring(0, position.column - 1);

      // 检查上下文
      const isAfterFROM = /\bFROM\s+$/i.test(beforeCursor);
      const isAfterSELECT = /\bSELECT\s+$/i.test(beforeCursor) || /\bSELECT\s+.*,\s*$/i.test(beforeCursor);

      // 如果在FROM后面，提供表名建议
      if (isAfterFROM && selectedDatabase) {
        try {
          // 这里应该调用API获取表名，暂时使用示例数据
          const tables = await getMeasurements(selectedDatabase);
          tables.forEach((table: string) => {
            suggestions.push({
              label: table,
              kind: monaco.languages.CompletionItemKind.Class,
              insertText: `"${table}"`,
              detail: '测量值',
              documentation: `数据库 ${selectedDatabase} 中的测量值`,
              range
            });
          });
        } catch (error) {
          console.warn('Failed to fetch measurements:', error);
        }
      }

      // 如果在SELECT后面，提供字段名建议
      if (isAfterSELECT) {
        // 通用字段建议
        ['time', 'value', 'host', 'region', 'cpu', 'memory'].forEach(field => {
          suggestions.push({
            label: field,
            kind: monaco.languages.CompletionItemKind.Field,
            insertText: field,
            detail: '字段',
            range
          });
        });
      }

      // SQL关键词建议
      SQL_KEYWORDS.forEach(keyword => {
        if (keyword.toLowerCase().startsWith(word.word.toLowerCase())) {
          suggestions.push({
            label: keyword,
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: keyword,
            detail: 'SQL关键词',
            range
          });
        }
      });

      // SQL函数建议
      SQL_FUNCTIONS.forEach(func => {
        if (func.toLowerCase().startsWith(word.word.toLowerCase())) {
          suggestions.push({
            label: func,
            kind: monaco.languages.CompletionItemKind.Function,
            insertText: `${func}()`,
            detail: 'SQL函数',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range
          });
        }
      });

      // InfluxDB特有关键词
      INFLUXDB_KEYWORDS.forEach(keyword => {
        if (keyword.toLowerCase().startsWith(word.word.toLowerCase())) {
          suggestions.push({
            label: keyword,
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: keyword,
            detail: 'InfluxDB关键词',
            range
          });
        }
      });

      return { suggestions };
    }
  });

  return disposable;
}

/**
 * 获取数据库中的测量值（表名）
 */
async function getMeasurements(database: string): Promise<string[]> {
  try {
    // 这里应该调用实际的API
    // 暂时返回示例数据
    return [
      'cpu_usage',
      'memory_usage',
      'disk_usage',
      'network_traffic',
      'temperature',
      'pressure',
      'humidity'
    ];
  } catch (error) {
    console.error('Error fetching measurements:', error);
    return [];
  }
}

/**
 * 获取测量值的字段名
 */
async function getFieldKeys(database: string, measurement: string): Promise<string[]> {
  try {
    // 这里应该调用实际的API
    return [
      'time',
      'value',
      'host',
      'region',
      'cpu_percent',
      'memory_percent'
    ];
  } catch (error) {
    console.error('Error fetching field keys:', error);
    return [];
  }
}

/**
 * 获取测量值的标签键
 */
async function getTagKeys(database: string, measurement: string): Promise<string[]> {
  try {
    // 这里应该调用实际的API
    return [
      'host',
      'region',
      'datacenter',
      'environment'
    ];
  } catch (error) {
    console.error('Error fetching tag keys:', error);
    return [];
  }
}
