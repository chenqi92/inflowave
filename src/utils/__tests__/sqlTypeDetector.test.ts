/**
 * SQL类型检测工具测试
 */

import {
  detectSQLStatementType,
  getSQLStatementCategory,
  getSQLStatementDisplayInfo,
  getSQLStatementTabs,
  getDefaultTab,
  isQueryStatement,
  isModificationStatement,
  getResultStatsLabels
} from '../sqlTypeDetector';

describe('SQL Type Detector', () => {
  describe('detectSQLStatementType', () => {
    test('should detect SELECT statements', () => {
      expect(detectSQLStatementType('SELECT * FROM measurement')).toBe('SELECT');
      expect(detectSQLStatementType('  select count(*) from test  ')).toBe('SELECT');
      expect(detectSQLStatementType('SELECT time, value FROM cpu')).toBe('SELECT');
    });

    test('should detect INSERT statements', () => {
      expect(detectSQLStatementType('INSERT cpu,host=server01 value=0.8')).toBe('INSERT');
      expect(detectSQLStatementType('  insert measurement,tag=value field=123  ')).toBe('INSERT');
    });

    test('should detect DELETE statements', () => {
      expect(detectSQLStatementType('DELETE FROM measurement WHERE time > now() - 1h')).toBe('DELETE');
      expect(detectSQLStatementType('  delete from test  ')).toBe('DELETE');
    });

    test('should detect CREATE statements', () => {
      expect(detectSQLStatementType('CREATE DATABASE mydb')).toBe('CREATE');
      expect(detectSQLStatementType('  create retention policy "1week" on "mydb"  ')).toBe('CREATE');
    });

    test('should detect DROP statements', () => {
      expect(detectSQLStatementType('DROP DATABASE mydb')).toBe('DROP');
      expect(detectSQLStatementType('  drop measurement cpu  ')).toBe('DROP');
    });

    test('should detect SHOW statements', () => {
      expect(detectSQLStatementType('SHOW DATABASES')).toBe('SHOW');
      expect(detectSQLStatementType('  show measurements  ')).toBe('SHOW');
    });

    test('should detect EXPLAIN statements', () => {
      expect(detectSQLStatementType('EXPLAIN SELECT * FROM cpu')).toBe('EXPLAIN');
      expect(detectSQLStatementType('  explain analyze select count(*) from test  ')).toBe('EXPLAIN');
    });

    test('should detect GRANT statements', () => {
      expect(detectSQLStatementType('GRANT ALL ON mydb TO user1')).toBe('GRANT');
      expect(detectSQLStatementType('  grant read on "database" to "user"  ')).toBe('GRANT');
    });

    test('should detect REVOKE statements', () => {
      expect(detectSQLStatementType('REVOKE ALL ON mydb FROM user1')).toBe('REVOKE');
      expect(detectSQLStatementType('  revoke read on "database" from "user"  ')).toBe('REVOKE');
    });

    test('should return UNKNOWN for unrecognized statements', () => {
      expect(detectSQLStatementType('UNKNOWN STATEMENT')).toBe('UNKNOWN');
      expect(detectSQLStatementType('')).toBe('UNKNOWN');
      expect(detectSQLStatementType(undefined)).toBe('UNKNOWN');
    });
  });

  describe('getSQLStatementCategory', () => {
    test('should categorize query statements', () => {
      expect(getSQLStatementCategory('SELECT')).toBe('query');
      expect(getSQLStatementCategory('SHOW')).toBe('query');
      expect(getSQLStatementCategory('EXPLAIN')).toBe('query');
    });

    test('should categorize write statements', () => {
      expect(getSQLStatementCategory('INSERT')).toBe('write');
    });

    test('should categorize delete statements', () => {
      expect(getSQLStatementCategory('DELETE')).toBe('delete');
    });

    test('should categorize DDL statements', () => {
      expect(getSQLStatementCategory('CREATE')).toBe('ddl');
      expect(getSQLStatementCategory('DROP')).toBe('ddl');
      expect(getSQLStatementCategory('ALTER')).toBe('ddl');
    });

    test('should categorize permission statements', () => {
      expect(getSQLStatementCategory('GRANT')).toBe('permission');
      expect(getSQLStatementCategory('REVOKE')).toBe('permission');
    });

    test('should categorize unknown statements', () => {
      expect(getSQLStatementCategory('UNKNOWN')).toBe('unknown');
      expect(getSQLStatementCategory('UPDATE')).toBe('unknown');
    });
  });

  describe('getSQLStatementDisplayInfo', () => {
    test('should return correct display info for query statements', () => {
      const info = getSQLStatementDisplayInfo('SELECT');
      expect(info.title).toBeDefined();
      expect(info.icon).toBe('Table');
      expect(info.color).toBe('blue');
      expect(info.description).toBeDefined();
    });

    test('should return correct display info for write statements', () => {
      const info = getSQLStatementDisplayInfo('INSERT');
      expect(info.title).toBeDefined();
      expect(info.icon).toBe('CheckCircle');
      expect(info.color).toBe('green');
      expect(info.description).toBeDefined();
    });

    test('should return correct display info for delete statements', () => {
      const info = getSQLStatementDisplayInfo('DELETE');
      expect(info.title).toBeDefined();
      expect(info.icon).toBe('Trash2');
      expect(info.color).toBe('orange');
      expect(info.description).toBeDefined();
    });
  });

  describe('getSQLStatementTabs', () => {
    test('should return correct tabs for query statements', () => {
      const tabs = getSQLStatementTabs('SELECT');
      expect(tabs).toHaveLength(3);
      expect(tabs[0].key).toBe('table');
      expect(tabs[1].key).toBe('json');
      expect(tabs[2].key).toBe('chart');
    });

    test('should return correct tabs for write statements', () => {
      const tabs = getSQLStatementTabs('INSERT');
      expect(tabs).toHaveLength(2);
      expect(tabs[0].key).toBe('status');
      expect(tabs[1].key).toBe('json');
    });

    test('should return correct tabs for unknown statements', () => {
      const tabs = getSQLStatementTabs('UNKNOWN');
      expect(tabs).toHaveLength(1);
      expect(tabs[0].key).toBe('json');
    });
  });

  describe('getDefaultTab', () => {
    test('should return table for query statements', () => {
      expect(getDefaultTab('SELECT')).toBe('table');
      expect(getDefaultTab('SHOW')).toBe('table');
    });

    test('should return status for modification statements', () => {
      expect(getDefaultTab('INSERT')).toBe('status');
      expect(getDefaultTab('DELETE')).toBe('status');
      expect(getDefaultTab('CREATE')).toBe('status');
    });

    test('should return json for unknown statements', () => {
      expect(getDefaultTab('UNKNOWN')).toBe('json');
    });
  });

  describe('isQueryStatement', () => {
    test('should return true for query statements', () => {
      expect(isQueryStatement('SELECT')).toBe(true);
      expect(isQueryStatement('SHOW')).toBe(true);
      expect(isQueryStatement('EXPLAIN')).toBe(true);
    });

    test('should return false for non-query statements', () => {
      expect(isQueryStatement('INSERT')).toBe(false);
      expect(isQueryStatement('DELETE')).toBe(false);
      expect(isQueryStatement('CREATE')).toBe(false);
    });
  });

  describe('isModificationStatement', () => {
    test('should return true for modification statements', () => {
      expect(isModificationStatement('INSERT')).toBe(true);
      expect(isModificationStatement('DELETE')).toBe(true);
      expect(isModificationStatement('CREATE')).toBe(true);
      expect(isModificationStatement('GRANT')).toBe(true);
    });

    test('should return false for query statements', () => {
      expect(isModificationStatement('SELECT')).toBe(false);
      expect(isModificationStatement('SHOW')).toBe(false);
    });
  });

  describe('getResultStatsLabels', () => {
    test('should return correct labels for query statements', () => {
      const labels = getResultStatsLabels('SELECT');
      expect(labels.rowCount).toBeDefined();
      expect(labels.executionTime).toBeDefined();
      expect(labels.columns).toBeDefined();
    });

    test('should return correct labels for write statements', () => {
      const labels = getResultStatsLabels('INSERT');
      expect(labels.rowCount).toBeDefined();
      expect(labels.executionTime).toBeDefined();
      expect(labels.columns).toBeDefined();
    });

    test('should return correct labels for delete statements', () => {
      const labels = getResultStatsLabels('DELETE');
      expect(labels.rowCount).toBeDefined();
      expect(labels.executionTime).toBeDefined();
      expect(labels.columns).toBeDefined();
    });
  });
});
