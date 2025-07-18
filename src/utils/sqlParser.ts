/**
 * SQL解析工具
 * 用于处理SQL语句的注释过滤、分割等功能
 */

export interface ParsedSQL {
  /** 原始SQL */
  original: string;
  /** 清理后的SQL（移除注释） */
  cleaned: string;
  /** 是否为空语句 */
  isEmpty: boolean;
  /** 语句类型 */
  type: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'CREATE' | 'DROP' | 'SHOW' | 'EXPLAIN' | 'UNKNOWN';
}

export class SQLParser {
  /**
   * 解析多条SQL语句
   * @param sqlText 包含多条SQL的文本
   * @returns 解析后的SQL语句数组
   */
  static parseMultipleSQL(sqlText: string): ParsedSQL[] {
    if (!sqlText?.trim()) {
      return [];
    }

    // 按分号分割，但要考虑字符串和注释中的分号
    const statements = this.splitSQLStatements(sqlText);
    
    return statements
      .map(stmt => this.parseStatement(stmt))
      .filter(parsed => !parsed.isEmpty);
  }

  /**
   * 智能分割SQL语句
   * 考虑字符串字面量、注释中的分号不作为分隔符
   */
  private static splitSQLStatements(sqlText: string): string[] {
    const statements: string[] = [];
    let currentStatement = '';
    let inSingleQuote = false;
    let inDoubleQuote = false;
    let inLineComment = false;
    let inBlockComment = false;
    let inHtmlComment = false;
    
    for (let i = 0; i < sqlText.length; i++) {
      const char = sqlText[i];
      const nextChar = sqlText[i + 1];
      const prevChar = sqlText[i - 1];

      // 处理换行符 - 结束行注释
      if (char === '\n') {
        inLineComment = false;
        currentStatement += char;
        continue;
      }

      // 检查注释开始
      if (!inSingleQuote && !inDoubleQuote && !inBlockComment && !inHtmlComment) {
        // -- 注释
        if (char === '-' && nextChar === '-') {
          inLineComment = true;
          currentStatement += char;
          continue;
        }
        // # 注释
        if (char === '#') {
          inLineComment = true;
          currentStatement += char;
          continue;
        }
        // /* 块注释
        if (char === '/' && nextChar === '*') {
          inBlockComment = true;
          currentStatement += char;
          continue;
        }
        // <!-- HTML注释
        if (char === '<' && sqlText.substr(i, 4) === '<!--') {
          inHtmlComment = true;
          currentStatement += char;
          continue;
        }
      }

      // 检查注释结束
      if (inBlockComment && char === '*' && nextChar === '/') {
        inBlockComment = false;
        currentStatement += char;
        continue;
      }
      
      if (inHtmlComment && char === '-' && sqlText.substr(i, 3) === '-->') {
        inHtmlComment = false;
        currentStatement += char;
        continue;
      }

      // 在注释中，直接添加字符
      if (inLineComment || inBlockComment || inHtmlComment) {
        currentStatement += char;
        continue;
      }

      // 处理字符串字面量
      if (char === "'" && !inDoubleQuote && prevChar !== '\\') {
        inSingleQuote = !inSingleQuote;
      } else if (char === '"' && !inSingleQuote && prevChar !== '\\') {
        inDoubleQuote = !inDoubleQuote;
      }

      // 在字符串中，直接添加字符
      if (inSingleQuote || inDoubleQuote) {
        currentStatement += char;
        continue;
      }

      // 检查分号分隔符
      if (char === ';') {
        currentStatement += char;
        statements.push(currentStatement.trim());
        currentStatement = '';
        continue;
      }

      currentStatement += char;
    }

    // 添加最后一个语句（如果有）
    if (currentStatement.trim()) {
      statements.push(currentStatement.trim());
    }

    return statements;
  }

  /**
   * 解析单个SQL语句
   */
  private static parseStatement(statement: string): ParsedSQL {
    const original = statement;
    const cleaned = this.removeComments(statement);
    const isEmpty = !cleaned.trim();
    const type = this.getStatementType(cleaned);

    return {
      original,
      cleaned,
      isEmpty,
      type
    };
  }

  /**
   * 移除SQL中的注释
   */
  static removeComments(sql: string): string {
    let result = '';
    let inSingleQuote = false;
    let inDoubleQuote = false;
    let inLineComment = false;
    let inBlockComment = false;
    let inHtmlComment = false;
    
    for (let i = 0; i < sql.length; i++) {
      const char = sql[i];
      const nextChar = sql[i + 1];
      const prevChar = sql[i - 1];

      // 处理换行符 - 结束行注释
      if (char === '\n') {
        if (inLineComment) {
          inLineComment = false;
          result += char; // 保留换行符
        } else if (!inBlockComment && !inHtmlComment) {
          result += char;
        }
        continue;
      }

      // 检查注释开始
      if (!inSingleQuote && !inDoubleQuote && !inBlockComment && !inHtmlComment && !inLineComment) {
        // -- 注释
        if (char === '-' && nextChar === '-') {
          inLineComment = true;
          continue;
        }
        // # 注释
        if (char === '#') {
          inLineComment = true;
          continue;
        }
        // /* 块注释
        if (char === '/' && nextChar === '*') {
          inBlockComment = true;
          i++; // 跳过下一个字符
          continue;
        }
        // <!-- HTML注释
        if (char === '<' && sql.substr(i, 4) === '<!--') {
          inHtmlComment = true;
          i += 3; // 跳过 <!--
          continue;
        }
      }

      // 检查注释结束
      if (inBlockComment && char === '*' && nextChar === '/') {
        inBlockComment = false;
        i++; // 跳过下一个字符
        continue;
      }
      
      if (inHtmlComment && char === '-' && sql.substr(i, 3) === '-->') {
        inHtmlComment = false;
        i += 2; // 跳过 -->
        continue;
      }

      // 在注释中，跳过字符
      if (inLineComment || inBlockComment || inHtmlComment) {
        continue;
      }

      // 处理字符串字面量
      if (char === "'" && !inDoubleQuote && prevChar !== '\\') {
        inSingleQuote = !inSingleQuote;
      } else if (char === '"' && !inSingleQuote && prevChar !== '\\') {
        inDoubleQuote = !inDoubleQuote;
      }

      result += char;
    }

    return result;
  }

  /**
   * 获取SQL语句类型
   */
  private static getStatementType(sql: string): ParsedSQL['type'] {
    const trimmed = sql.trim().toUpperCase();
    
    if (trimmed.startsWith('SELECT')) return 'SELECT';
    if (trimmed.startsWith('INSERT')) return 'INSERT';
    if (trimmed.startsWith('UPDATE')) return 'UPDATE';
    if (trimmed.startsWith('DELETE')) return 'DELETE';
    if (trimmed.startsWith('CREATE')) return 'CREATE';
    if (trimmed.startsWith('DROP')) return 'DROP';
    if (trimmed.startsWith('SHOW')) return 'SHOW';
    if (trimmed.startsWith('EXPLAIN')) return 'EXPLAIN';
    
    return 'UNKNOWN';
  }

  /**
   * 检查SQL是否包含注释
   */
  static hasComments(sql: string): boolean {
    return /--.*$|#.*$|\/\*[\s\S]*?\*\/|<!--[\s\S]*?-->/m.test(sql);
  }

  /**
   * 格式化SQL语句（移除多余空白）
   */
  static formatSQL(sql: string): string {
    return sql
      .replace(/\s+/g, ' ') // 多个空白字符替换为单个空格
      .replace(/\s*;\s*/g, ';') // 分号前后的空格
      .trim();
  }
}
