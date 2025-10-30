import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useConnectionStore } from '@/store/connection';
import { useSmartSql } from './useSmartSql';
import { toast } from 'sonner';
import { safeTauriInvoke } from '@/utils/tauri';

export interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  target: any;
}

export interface ContextMenuOptions {
  onSqlGenerated?: (sql: string, description: string) => void;
  onActionExecuted?: (action: string, result?: any) => void;
  onError?: (error: string) => void;
}

export function useContextMenu(options: ContextMenuOptions = {}) {
  const { onSqlGenerated, onActionExecuted, onError } = options;
  const navigate = useNavigate();
  const { activeConnectionId } = useConnectionStore();
  
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    target: null,
  });

  const {
    generateSelectQuery,
    generateCountQuery,
    generateShowQuery,
    generateFieldStatsQuery,
    generateTimeSeriesQuery,
    generateAggregationQuery,
    copySqlToClipboard,
  } = useSmartSql();

  /**
   * 显示上下文菜单
   */
  const showContextMenu = useCallback((
    event: React.MouseEvent,
    target: any
  ) => {
    event.preventDefault();
    event.stopPropagation();
    
    setContextMenu({
      visible: true,
      x: event.clientX,
      y: event.clientY,
      target,
    });
  }, []);

  /**
   * 隐藏上下文菜单
   */
  const hideContextMenu = useCallback(() => {
    setContextMenu({
      visible: false,
      x: 0,
      y: 0,
      target: null,
    });
  }, []);

  /**
   * 处理上下文菜单操作
   */
  const handleContextMenuAction = useCallback(async (
    action: string,
    params?: any
  ) => {
    hideContextMenu();

    try {
      switch (action) {
        case 'generateSQL':
          await handleSqlGeneration(params);
          break;
          
        case 'copyToClipboard':
          await handleCopyToClipboard(params);
          break;
          
        case 'previewData':
          await handlePreviewData(params);
          break;
          
        case 'showFields':
          await handleShowFields(params);
          break;
          
        case 'showTagKeys':
          await handleShowTagKeys(params);
          break;
          
        case 'showTagValues':
          await handleShowTagValues(params);
          break;
          
        case 'showSeries':
          await handleShowSeries(params);
          break;
          
        case 'exportData':
          await handleExportData(params);
          break;
          
        case 'createChart':
          await handleCreateChart(params);
          break;
          
        case 'createFieldChart':
          await handleCreateFieldChart(params);
          break;
          
        case 'createTagChart':
          await handleCreateTagChart(params);
          break;
          
        case 'deleteMeasurement':
          await handleDeleteMeasurement(params);
          break;
          
        case 'deleteDatabase':
          await handleDeleteDatabase(params);
          break;
          
        case 'showDatabaseInfo':
          await handleShowDatabaseInfo(params);
          break;
          
        case 'showDatabaseStats':
          await handleShowDatabaseStats(params);
          break;
          
        case 'exportDatabaseStructure':
          await handleExportDatabaseStructure(params);
          break;
          
        case 'executeQuery':
          await handleExecuteQuery(params);
          break;
          
        case 'formatQuery':
          await handleFormatQuery(params);
          break;
          
        case 'insertTemplate':
          await handleInsertTemplate(params);
          break;
          
        case 'explainQuery':
          await handleExplainQuery(params);
          break;
          
        case 'saveQuery':
          await handleSaveQuery(params);
          break;
          
        case 'toggleComment':
          await handleToggleComment(params);
          break;
          
        case 'generateFilterQuery':
          await handleGenerateFilterQuery(params);
          break;
          
        case 'generateAggregateQuery':
          await handleGenerateAggregateQuery(params);
          break;
          
        case 'createColumnChart':
          await handleCreateColumnChart(params);
          break;
          
        case 'exportColumn':
          await handleExportColumn(params);
          break;
          
        default:
          console.warn('未处理的上下文菜单操作:', action);
          toast.info(`功能 "${action}" 开发中...`);
      }
      
      onActionExecuted?.(action, params);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '操作失败';
      onError?.(errorMessage);
      toast.error(errorMessage);
    }
  }, [hideContextMenu, onActionExecuted, onError]);

  /**
   * 处理 SQL 生成
   */
  const handleSqlGeneration = useCallback(async (params: any) => {
    let result;
    
    switch (params.sqlType) {
      case 'select_all':
        result = await generateSelectQuery(params.database, params.measurement);
        break;
      case 'select_fields':
        result = await generateSelectQuery(params.database, params.measurement, params.fields);
        break;
      case 'count_records':
        result = await generateCountQuery(params.database, params.measurement);
        break;
      case 'time_series':
        result = await generateTimeSeriesQuery(params.database, params.measurement, params.time_range);
        break;
      case 'aggregation':
        if (params.fields && params.fields.length > 0) {
          result = await generateAggregationQuery(params.database, params.measurement, params.fields, params.group_by);
        } else {
          result = await generateFieldStatsQuery('value', 'count', params.database, params.measurement);
        }
        break;
      case 'show_measurements':
        result = await generateShowQuery('measurements', params.database);
        break;
      case 'show_tag_keys':
        result = await generateShowQuery('tag_keys', params.database, params.measurement);
        break;
      case 'show_field_keys':
        result = await generateShowQuery('field_keys', params.database, params.measurement);
        break;
      case 'show_tag_values':
        result = await generateShowQuery('tag_values', params.database, params.measurement, params.tag);
        break;
      default:
        throw new Error(`不支持的 SQL 类型: ${params.sqlType}`);
    }
    
    // 回调或导航到查询页面
    if (onSqlGenerated) {
      onSqlGenerated(result.sql, result.description);
    } else {
      navigate('/query', {
        state: {
          query: result.sql,
          database: params.database,
          description: result.description,
        },
      });
    }
    
    toast.success(`SQL 已生成: ${result.description}`);
  }, [generateSelectQuery, generateCountQuery, generateTimeSeriesQuery, generateAggregationQuery, generateFieldStatsQuery, generateShowQuery, onSqlGenerated, navigate]);

  /**
   * 处理复制到剪贴板
   */
  const handleCopyToClipboard = useCallback(async (params: any) => {
    await copySqlToClipboard(params.text);
  }, [copySqlToClipboard]);

  /**
   * 处理预览数据
   */
  const handlePreviewData = useCallback(async (params: any) => {
    if (!activeConnectionId) throw new Error('请先建立连接');
    
    let query = `SELECT * FROM "${params.measurement}"`;
    
    if (params.timeRange) {
      query += ` WHERE time >= now() - ${params.timeRange}`;
    }
    
    if (params.limit) {
      query += ` LIMIT ${params.limit}`;
    }
    
    if (params.orderBy) {
      query += ` ORDER BY ${params.orderBy}`;
    }
    
    const result = await safeTauriInvoke<any>('execute_query', {
      connection_id: activeConnectionId,
      query,
    });
    
    // 可以在这里显示预览对话框或导航到结果页面
    navigate('/query', {
      state: {
        query,
        database: params.database,
        result,
      },
    });
  }, [activeConnectionId, navigate]);

  /**
   * 处理显示字段
   */
  const handleShowFields = useCallback(async (params: any) => {
    if (!activeConnectionId) throw new Error('请先建立连接');
    
    const fields = await safeTauriInvoke('get_field_keys', {
      connection_id: activeConnectionId,
      database: params.database,
      measurement: params.measurement,
    });
    
    // 显示字段信息对话框
    toast.success(`获取到 ${Array.isArray(fields) ? fields.length : 0} 个字段`);
    
    return fields;
  }, [activeConnectionId]);

  /**
   * 处理显示标签键
   */
  const handleShowTagKeys = useCallback(async (params: any) => {
    if (!activeConnectionId) throw new Error('请先建立连接');
    
    const tagKeys = await safeTauriInvoke('get_tag_keys', {
      connectionId: activeConnectionId,
      database: params.database,
      measurement: params.measurement,
    });
    
    toast.success(`获取到 ${Array.isArray(tagKeys) ? tagKeys.length : 0} 个标签键`);
    
    return tagKeys;
  }, [activeConnectionId]);

  /**
   * 处理显示标签值
   */
  const handleShowTagValues = useCallback(async (params: any) => {
    if (!activeConnectionId) throw new Error('请先建立连接');
    
    const tagValues = await safeTauriInvoke('get_tag_values', {
      connection_id: activeConnectionId,
      database: params.database,
      measurement: params.measurement,
      tagKey: params.tagKey,
    });
    
    toast.success(`获取到 ${Array.isArray(tagValues) ? tagValues.length : 0} 个标签值`);
    
    return tagValues;
  }, [activeConnectionId]);

  /**
   * 处理显示序列
   */
  const handleShowSeries = useCallback(async (params: any) => {
    if (!activeConnectionId) throw new Error('请先建立连接');
    
    const query = `SHOW SERIES FROM "${params.measurement}"`;
    const result = await safeTauriInvoke<any>('execute_query', {
      connection_id: activeConnectionId,
      query,
    });
    
    toast.success('序列信息已获取');
    
    return result;
  }, [activeConnectionId]);

  /**
   * 处理导出数据
   */
  const handleExportData = useCallback(async (params: any) => {
    if (!activeConnectionId) throw new Error('请先建立连接');
    
    const filePath = `${params.measurement}_${Date.now()}.${params.format}`;
    const result = await safeTauriInvoke('export_table_data', {
      connection_id: activeConnectionId,
      database: params.database,
      table: params.measurement,
      format: params.format,
      limit: 10000,
      filePath,
    });
    
    toast.success(`数据已导出: ${result}`);
    
    return result;
  }, [activeConnectionId]);

  /**
   * 处理创建图表
   */
  const handleCreateChart = useCallback(async (params: any) => {
    const query = `SELECT * FROM "${params.measurement}" WHERE time >= now() - 1h ORDER BY time DESC LIMIT 1000`;
    
    navigate('/visualization', {
      state: {
        presetQuery: query,
        database: params.database,
        measurement: params.measurement,
        chartType: params.chartType || 'timeSeries',
      },
    });
    
    toast.success('正在跳转到可视化页面...');
  }, [navigate]);

  /**
   * 处理创建字段图表
   */
  const handleCreateFieldChart = useCallback(async (params: any) => {
    const query = `SELECT time, "${params.field}" FROM "${params.measurement}" WHERE time >= now() - 1h ORDER BY time DESC`;
    
    navigate('/visualization', {
      state: {
        presetQuery: query,
        database: params.database,
        measurement: params.measurement,
        field: params.field,
        chartType: params.chartType || 'timeSeries',
      },
    });
    
    toast.success('正在跳转到可视化页面...');
  }, [navigate]);

  /**
   * 处理创建标签图表
   */
  const handleCreateTagChart = useCallback(async (params: any) => {
    const query = `SELECT COUNT(*) FROM "${params.measurement}" WHERE time >= now() - 24h GROUP BY "${params.tagKey}"`;
    
    navigate('/visualization', {
      state: {
        presetQuery: query,
        database: params.database,
        measurement: params.measurement,
        tagKey: params.tagKey,
        chartType: 'distribution',
      },
    });
    
    toast.success('正在跳转到可视化页面...');
  }, [navigate]);

  /**
   * 处理删除测量
   */
  const handleDeleteMeasurement = useCallback(async (params: any) => {
    if (!activeConnectionId) throw new Error('请先建立连接');
    
    const confirmed = window.confirm(`确定要删除测量 "${params.measurement}" 吗？此操作不可撤销！`);
    if (!confirmed) return;
    
    await safeTauriInvoke('drop_measurement', {
      connection_id: activeConnectionId,
      database: params.database,
      measurement: params.measurement,
    });
    
    toast.success(`测量 "${params.measurement}" 已删除`);
  }, [activeConnectionId]);

  /**
   * 处理删除数据库
   */
  const handleDeleteDatabase = useCallback(async (params: any) => {
    if (!activeConnectionId) throw new Error('请先建立连接');
    
    const confirmed = window.confirm(`确定要删除数据库 "${params.database}" 吗？此操作将删除所有数据且不可撤销！`);
    if (!confirmed) return;
    
    await safeTauriInvoke('drop_database', {
      connection_id: activeConnectionId,
      database: params.database,
    });
    
    toast.success(`数据库 "${params.database}" 已删除`);
  }, [activeConnectionId]);

  /**
   * 处理显示数据库信息
   */
  const handleShowDatabaseInfo = useCallback(async (params: any) => {
    if (!activeConnectionId) throw new Error('请先建立连接');
    
    const info = await safeTauriInvoke('get_database_info', {
      connectionId: activeConnectionId,
      database: params.database,
    });

    toast.dismiss(); // 清除所有现有消息，避免位置叠加
    toast.success(`数据库 "${params.database}" 信息已获取`);

    return info;
  }, [activeConnectionId]);

  /**
   * 处理显示数据库统计
   */
  const handleShowDatabaseStats = useCallback(async (params: any) => {
    if (!activeConnectionId) throw new Error('请先建立连接');
    
    const stats = await safeTauriInvoke('get_database_stats', {
      connection_id: activeConnectionId,
      database: params.database,
    });
    
    toast.success(`数据库 "${params.database}" 统计信息已获取`);
    
    return stats;
  }, [activeConnectionId]);

  /**
   * 处理导出数据库结构
   */
  const handleExportDatabaseStructure = useCallback(async (params: any) => {
    if (!activeConnectionId) throw new Error('请先建立连接');
    
    // 这里可以实现导出数据库结构的逻辑
    toast.success(`数据库 "${params.database}" 结构导出功能开发中...`);
  }, [activeConnectionId]);

  /**
   * 处理执行查询
   */
  const handleExecuteQuery = useCallback(async (params: any) => {
    // 触发查询执行事件
    window.dispatchEvent(new CustomEvent('execute-query', { detail: params }));
    toast.success('正在执行查询...');
  }, []);

  /**
   * 处理格式化查询
   */
  const handleFormatQuery = useCallback(async (params: any) => {
    // 触发格式化查询事件
    window.dispatchEvent(new CustomEvent('format-query', { detail: params }));
    toast.success('正在格式化查询...');
  }, []);

  /**
   * 处理插入模板
   */
  const handleInsertTemplate = useCallback(async (params: any) => {
    // 触发插入模板事件
    window.dispatchEvent(new CustomEvent('insert-template', { detail: params }));
    toast.success('模板已插入');
  }, []);

  /**
   * 处理解释查询
   */
  const handleExplainQuery = useCallback(async (params: any) => {
    // 触发解释查询事件
    window.dispatchEvent(new CustomEvent('explain-query', { detail: params }));
    toast.info('查询解释功能开发中...');
  }, []);

  /**
   * 处理保存查询
   */
  const handleSaveQuery = useCallback(async (params: any) => {
    // 触发保存查询事件
    window.dispatchEvent(new CustomEvent('save-query', { detail: params }));
    toast.success('正在保存查询...');
  }, []);

  /**
   * 处理切换注释
   */
  const handleToggleComment = useCallback(async (params: any) => {
    // 触发切换注释事件
    window.dispatchEvent(new CustomEvent('toggle-comment', { detail: params }));
    toast.success('已切换注释');
  }, []);

  /**
   * 处理生成筛选查询
   */
  const handleGenerateFilterQuery = useCallback(async (params: any) => {
    const { column, value, operator } = params;
    let sqlValue = value;
    
    // 根据值类型格式化SQL
    if (typeof value === 'string') {
      sqlValue = `'${value}'`;
    } else if (value === null || value === undefined) {
      sqlValue = 'NULL';
    }
    
    const sql = `SELECT * FROM measurement_name WHERE "${column}" ${operator} ${sqlValue}`;
    const description = `筛选 ${column} ${operator} ${value}`;
    
    if (onSqlGenerated) {
      onSqlGenerated(sql, description);
    } else {
      // 如果没有回调，创建一个新的查询标签页
      window.dispatchEvent(new CustomEvent('sql-generated', {
        detail: { sql, description }
      }));
    }
    
    toast.success('筛选查询已生成');
  }, [onSqlGenerated]);

  /**
   * 处理生成聚合查询
   */
  const handleGenerateAggregateQuery = useCallback(async (params: any) => {
    const { column, func } = params;
    const sql = `SELECT ${func}("${column}") FROM measurement_name WHERE time >= now() - 1h`;
    const description = `${func} 聚合查询: ${column}`;
    
    if (onSqlGenerated) {
      onSqlGenerated(sql, description);
    } else {
      window.dispatchEvent(new CustomEvent('sql-generated', {
        detail: { sql, description }
      }));
    }
    
    toast.success('聚合查询已生成');
  }, [onSqlGenerated]);

  /**
   * 处理创建列图表
   */
  const handleCreateColumnChart = useCallback(async (params: any) => {
    const { column } = params;
    
    // 导航到可视化页面
    window.dispatchEvent(new CustomEvent('navigate-to-visualization', {
      detail: { 
        column,
        chartType: 'column'
      }
    }));
    
    toast.success('正在创建列图表...');
  }, []);

  /**
   * 处理导出列数据
   */
  const handleExportColumn = useCallback(async (params: any) => {
    const { column } = params;
    
    // 触发导出列数据事件
    window.dispatchEvent(new CustomEvent('export-column-data', {
      detail: { column }
    }));
    
    toast.success('正在导出列数据...');
  }, []);

  // 监听点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = () => {
      if (contextMenu.visible) {
        hideContextMenu();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && contextMenu.visible) {
        hideContextMenu();
      }
    };

    if (contextMenu.visible) {
      document.addEventListener('click', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [contextMenu.visible, hideContextMenu]);

  return {
    contextMenu,
    showContextMenu,
    hideContextMenu,
    handleContextMenuAction,
  };
}