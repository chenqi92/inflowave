import React, {
  useState,
  useRef,
  useEffect,
  useImperativeHandle,
  forwardRef,
} from 'react';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  TooltipProvider,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Popconfirm,
} from '@/components/ui';
import {
  Save,
  PlayCircle,
  Database,
  Plus,
  X,
  Table,
  FolderOpen,
  MoreHorizontal,
  FileText,
  Download,
  Upload,
  ChevronDown,
  ChevronUp,
  Code,
} from 'lucide-react';
import Editor from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import { useConnectionStore, connectionUtils } from '@/store/connection';
import { safeTauriInvoke } from '@/utils/tauri';
import { showMessage } from '@/utils/message';
import { useTheme } from '@/components/providers/ThemeProvider';
import DataExportDialog from '@/components/common/DataExportDialog';
import TableDataBrowser from '@/components/query/TableDataBrowser';
import SimpleDragOverlay from '@/components/common/SimpleDragOverlay';
import useSimpleTabDrag from '@/hooks/useSimpleTabDrag';
import { SQLParser } from '@/utils/sqlParser';
import { setupInfluxQLAutoComplete } from '@/utils/influxqlAutoComplete';
import type { QueryResult, QueryRequest } from '@/types';

interface MenuProps {
  items?: Array<{
    key: string;
    label: React.ReactNode;
    icon?: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    type?: 'divider' | 'group';
  }>;
}

interface EditorTab {
  id: string;
  title: string;
  content: string;
  type: 'query' | 'table' | 'database' | 'data-browser';
  modified: boolean;
  filePath?: string;
  // 数据浏览相关属性
  connectionId?: string;
  database?: string;
  tableName?: string;
}

interface TabEditorProps {
  onQueryResult?: (result: QueryResult) => void;
  onBatchQueryResults?: (
    results: QueryResult[],
    queries: string[],
    executionTime: number
  ) => void;
  onActiveTabTypeChange?: (tabType: 'query' | 'table' | 'database' | 'data-browser') => void;
  expandedDatabases?: string[]; // 新增：已展开的数据库列表
  currentTimeRange?: {
    label: string;
    value: string;
    start: string;
    end: string;
  };
}

interface TabEditorRef {
  executeQueryWithContent: (query: string, database: string) => void;
  createDataBrowserTab: (connectionId: string, database: string, tableName: string) => void;
  createNewTab: (type?: 'query' | 'table' | 'database') => void;
  createQueryTabWithDatabase: (database: string, query?: string) => void;
  setSelectedDatabase: (database: string) => void;
}

const TabEditor = forwardRef<TabEditorRef, TabEditorProps>(
  ({ onQueryResult, onBatchQueryResults, onActiveTabTypeChange, expandedDatabases = [], currentTimeRange }, ref) => {
    const { activeConnectionId, connections } = useConnectionStore();
    const hasAnyConnectedInfluxDB = connectionUtils.hasAnyConnectedInfluxDB();
    const { resolvedTheme } = useTheme();
    const [activeKey, setActiveKey] = useState<string>('1');
    const [selectedDatabase, setSelectedDatabase] = useState<string>('');
    const [databases, setDatabases] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [tabs, setTabs] = useState<EditorTab[]>([
      {
        id: '1',
        title: '查询-1',
        content:
          '-- 在此输入 InfluxQL 查询语句\nSELECT * FROM "measurement_name" LIMIT 10',
        type: 'query',
        modified: false,
      },
    ]);
    const [closingTab, setClosingTab] = useState<EditorTab | null>(null);
    const [showExportDialog, setShowExportDialog] = useState(false);
    const [showImportDialog, setShowImportDialog] = useState(false);
    const [actualExecutedQueries, setActualExecutedQueries] = useState<string[]>([]); // 实际执行的查询
    const [showExecutedQueries, setShowExecutedQueries] = useState(false); // 是否显示实际执行的查询
    const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

    // 拖拽功能
    const {
      isDragging,
      draggedTab,
      dropZoneActive,
      handleTabDragStart,
      handleTabDrag,
      handleTabDragEnd,
      handleTabDrop,
      handleTabDragOver,
      handleTabMove,
      showTabInPopup,
    } = useSimpleTabDrag();

    // 前端查询处理函数
    const processQueryForExecution = (
      rawQuery: string,
      timeRange?: { start: string; end: string; value: string }
    ) => {
      // 1. 使用SQLParser解析和清理查询
      const parsedStatements = SQLParser.parseMultipleSQL(rawQuery);

      // 2. 过滤出有效的SQL语句
      const cleanedQueries = parsedStatements
        .filter(parsed => !parsed.isEmpty)
        .map(parsed => parsed.cleaned);

      // 3. 为每个查询注入时间范围（如果需要）
      const processedQueries = cleanedQueries.map(query =>
        injectTimeRangeToQuery(query.trim(), timeRange)
      );

      return {
        originalQuery: rawQuery,
        cleanedQueries,
        processedQueries,
        statementCount: processedQueries.length
      };
    };

    // 处理时间范围的SQL注入
    const injectTimeRangeToQuery = (
      query: string,
      timeRange?: { start: string; end: string; value: string }
    ) => {
      if (
        !timeRange ||
        timeRange.value === 'none' ||
        !timeRange.start ||
        !timeRange.end
      ) {
        return query; // 如果没有时间范围或选择不限制时间，直接返回原查询
      }

      // 检查查询是否已经包含时间范围条件
      const hasTimeCondition = /WHERE\s+.*time\s*[><=]/i.test(query);

      if (hasTimeCondition) {
        // 如果已经有时间条件，不自动添加
        return query;
      }

      // 检查是否是 SELECT 查询
      const isSelectQuery = /^\s*SELECT\s+/i.test(query.trim());

      if (!isSelectQuery) {
        return query; // 非 SELECT 查询不添加时间范围
      }

      // 构建时间范围条件
      const timeCondition = `time >= ${timeRange.start} AND time <= ${timeRange.end}`;

      // 检查查询是否已经有 WHERE 子句
      const hasWhereClause = /\s+WHERE\s+/i.test(query);

      if (hasWhereClause) {
        // 如果已经有 WHERE 子句，添加 AND 条件
        return query.replace(/(\s+WHERE\s+)/i, `$1${timeCondition} AND `);
      } else {
        // 如果没有 WHERE 子句，添加 WHERE 条件
        // 找到 FROM 子句之后的位置
        const fromMatch = query.match(/(\s+FROM\s+[^\s]+)/i);
        if (fromMatch) {
          const fromClause = fromMatch[1];
          return query.replace(
            fromClause,
            `${fromClause} WHERE ${timeCondition}`
          );
        }
      }

      return query;
    };

    // 加载数据库列表
    const loadDatabases = async () => {
      console.log('🔄 开始加载数据库列表:', { activeConnectionId });

      if (!activeConnectionId) {
        console.warn('⚠️ 没有活跃连接ID，跳过加载数据库列表');
        return;
      }

      try {
        console.log('🔍 验证后端连接是否存在...');
        // 首先验证连接是否在后端存在
        const backendConnections =
          await safeTauriInvoke<any[]>('get_connections');
        console.log(
          '🔗 后端连接列表:',
          backendConnections?.length || 0,
          '个连接'
        );

        const backendConnection = backendConnections?.find(
          (c: any) => c.id === activeConnectionId
        );

        if (!backendConnection) {
          console.error(`⚠️ 连接 ${activeConnectionId} 在后端不存在`);
          showMessage.warning('连接不存在，请重新选择连接');
          setDatabases([]);
          setSelectedDatabase('');
          return;
        }

        console.log('✅ 连接存在，开始获取数据库列表...');
        const dbList = await safeTauriInvoke<string[]>('get_databases', {
          connectionId: activeConnectionId,
        });

        console.log('✅ 成功获取数据库列表:', {
          dbList,
          count: dbList?.length || 0,
          currentSelectedDatabase: selectedDatabase,
        });

        const validDbList = dbList || [];
        setDatabases(validDbList);

        if (validDbList.length > 0 && !selectedDatabase) {
          console.log('🔄 自动选择第一个数据库:', validDbList[0]);
          setSelectedDatabase(validDbList[0]);
        } else if (validDbList.length === 0) {
          console.warn('⚠️ 数据库列表为空');
          setSelectedDatabase('');
        } else {
          console.log('ℹ️ 已有选中的数据库:', selectedDatabase);
        }
      } catch (error) {
        console.error('⚠️ 加载数据库列表失败:', error);

        // 重置状态
        setDatabases([]);
        setSelectedDatabase('');

        // 如果是连接不存在的错误，显示更友好的消息
        const errorStr = String(error);
        if (errorStr.includes('连接') && errorStr.includes('不存在')) {
          showMessage.error(`连接不存在: ${activeConnectionId}`);
        } else {
          showMessage.error(`加载数据库列表失败: ${error}`);
        }
      }
    };

    // 测试智能提示功能
    const testIntelliSense = async () => {
      console.log('🧪 开始测试智能提示功能...');

      if (!activeConnectionId || !selectedDatabase) {
        console.error('⚠️ 缺少必要参数:', {
          activeConnectionId,
          selectedDatabase,
        });
        showMessage.error('请先选择数据库连接和数据库');
        return;
      }

      try {
        console.log('🔍 直接调用后端获取建议...');
        const suggestions = await safeTauriInvoke<string[]>(
          'get_query_suggestions',
          {
            connectionId: activeConnectionId,
            database: selectedDatabase,
            partialQuery: '', // 空字符串获取所有表
          }
        );

        console.log('✅ 后端返回的建议:', suggestions);

        if (suggestions && suggestions.length > 0) {
          showMessage.success(
            `获取到 ${suggestions.length} 个建议: ${suggestions.slice(0, 3).join(', ')}${suggestions.length > 3 ? '...' : ''}`
          );

          // 在编辑器中触发智能提示
          if (editorRef.current) {
            editorRef.current.trigger(
              'test',
              'editor.action.triggerSuggest',
              {}
            );
          }
        } else {
          showMessage.warning('没有获取到任何建议，请检查数据库中是否有表数据');
        }
      } catch (error) {
        console.error('⚠️ 测试智能提示失败:', error);
        showMessage.error(`测试失败: ${error}`);
      }
    };

    // 执行指定内容和数据库的查询
    const executeQueryWithContent = async (query: string, database: string) => {
      if (!activeConnectionId) {
        showMessage.warning('请先选择数据库连接');
        return;
      }

      // 创建新标签或更新当前标签
      const newTab: EditorTab = {
        id: Date.now().toString(),
        title: `表查询-${tabs.length + 1}`,
        content: query,
        type: 'query',
        modified: false,
      };

      setTabs(prevTabs => [...prevTabs, newTab]);
      setActiveKey(newTab.id);
      setSelectedDatabase(database);

      // 执行查询
      setLoading(true);
      try {
        console.log('🚀 执行表双击查询:', {
          connection_id: activeConnectionId,
          database,
          query: query.trim(),
        });

        // 确保数据库名称不为空
        if (!database || database.trim() === '') {
          console.log('❌ 数据库名称为空:', { database });
          showMessage.error('数据库名称为空，无法执行查询');
          return;
        }

        // 使用前端查询处理
        const queryProcessResult = processQueryForExecution(query, currentTimeRange);
        const processedQuery = queryProcessResult.processedQueries[0] || query;

        // 保存实际执行的查询
        setActualExecutedQueries([processedQuery]);

        const request: QueryRequest = {
          connectionId: activeConnectionId,
          database,
          query: processedQuery,
        };

        const result = await safeTauriInvoke<QueryResult>('execute_query', {
          request,
        });

        console.log('✅ 查询结果:', result);

        if (result) {
          onQueryResult?.(result);
          showMessage.success(
            `表查询执行成功，返回 ${result.data?.length || 0} 行数据`
          );
        }
      } catch (error) {
        console.error('查询执行失败:', error);
        const errorMessage = String(error).replace('Error: ', '');
        showMessage.error(`查询执行失败: ${errorMessage}`);
      } finally {
        setLoading(false);
      }
    };

    // 执行查询 - 自动检测选中内容
    const executeQuery = async () => {
      console.log('🎯 执行查询 - 开始检查条件');
      console.log('activeConnectionId:', activeConnectionId);
      console.log('selectedDatabase:', selectedDatabase);
      console.log('activeKey:', activeKey);
      console.log('tabs:', tabs);

      if (!activeConnectionId) {
        console.log('❌ 没有活跃连接');
        showMessage.warning(
          '请先选择数据库连接。请在左侧连接列表中选择一个连接。'
        );
        return;
      }

      if (!selectedDatabase) {
        console.log('❌ 没有选择数据库');
        showMessage.warning('请选择数据库。如果下拉列表为空，请检查连接状态。');
        return;
      }

      const currentTab = tabs.find(tab => tab.id === activeKey);
      console.log('当前标签:', currentTab);

      if (!currentTab) {
        console.log('❌ 找不到当前标签');
        showMessage.warning('找不到当前查询标签，请重新创建查询');
        return;
      }

      let queryText = '';

      // 自动检测选中内容
      if (editorRef.current) {
        const selection = editorRef.current.getSelection();
        if (selection && !selection.isEmpty()) {
          // 如果有选中内容，则执行选中的内容
          queryText =
            editorRef.current.getModel()?.getValueInRange(selection) || '';
          console.log('✅ 检测到选中内容，将执行选中的SQL:', queryText);
        } else {
          // 如果没有选中内容，则执行全部内容
          queryText = currentTab.content.trim();
          console.log('✅ 没有选中内容，将执行全部SQL:', queryText);
        }
      } else {
        queryText = currentTab.content.trim();
      }

      if (!queryText.trim()) {
        console.log('❌ 查询内容为空');
        showMessage.warning('请输入查询语句');
        return;
      }

      console.log('✅ 所有条件满足，开始执行查询');
      setLoading(true);
      const startTime = Date.now();

      try {
        // 使用前端查询处理函数
        const queryProcessResult = processQueryForExecution(queryText, currentTimeRange);
        console.log('🔍 查询处理结果:', queryProcessResult);

        // 保存实际执行的查询，用于显示
        setActualExecutedQueries(queryProcessResult.processedQueries);

        const statements = queryProcessResult.processedQueries;
        console.log('🔍 检测到有效查询语句数量:', statements.length);

        if (statements.length > 1) {
          // 执行多条查询
          console.log('🚀 执行批量查询:', {
            connection_id: activeConnectionId,
            database: selectedDatabase,
            queries: statements,
          });

          // 确保数据库名称不为空
          if (!selectedDatabase || selectedDatabase.trim() === '') {
            console.log('❌ 数据库名称为空:', { selectedDatabase, databases });
            showMessage.error('数据库名称为空，请选择一个数据库');
            return;
          }

          const results = await safeTauriInvoke<QueryResult[]>(
            'execute_batch_queries',
            {
              request: {
                connectionId: activeConnectionId,
                database: selectedDatabase,
                queries: statements,
              },
            }
          );

          const executionTime = Date.now() - startTime;
          console.log('✅ 批量查询结果:', results);

          if (results && results.length > 0) {
            // 调用批量查询回调
            onBatchQueryResults?.(results, statements, executionTime);

            const totalRows = results.reduce(
              (sum, result) => sum + (result.data?.length || 0),
              0
            );
            showMessage.success(
              `批量查询执行成功，共执行 ${results.length} 条语句，返回 ${totalRows} 行数据`
            );
          } else {
            console.log('⚠️ 批量查询结果为空');
            showMessage.warning('批量查询执行完成，但没有返回数据');
          }
        } else {
          // 执行单条查询
          console.log('🚀 执行单条查询:', {
            connection_id: activeConnectionId,
            database: selectedDatabase,
            query: statements[0],
          });

          // 确保数据库名称不为空
          if (!selectedDatabase || selectedDatabase.trim() === '') {
            console.log('❌ 数据库名称为空:', { selectedDatabase, databases });
            showMessage.error('数据库名称为空，请选择一个数据库');
            return;
          }

          console.log('🔍 准备执行查询，参数检查:', {
            connection_id: activeConnectionId,
            database: selectedDatabase,
            query: statements[0],
            selectedDatabase_type: typeof selectedDatabase,
            selectedDatabase_length: selectedDatabase?.length,
          });

          // 注意：这里的statements[0]已经通过injectTimeRangeToQuery处理过了
          const request: QueryRequest = {
            connectionId: activeConnectionId,
            database: selectedDatabase,
            query: statements[0],
          };

          const result = await safeTauriInvoke<QueryResult>('execute_query', {
            request,
          });

          const executionTime = Date.now() - startTime;
          console.log('✅ 单条查询结果:', result);

          if (result) {
            onQueryResult?.(result);
            // 也调用批量查询回调，但只有一个结果
            onBatchQueryResults?.([result], statements, executionTime);
            showMessage.success(
              `查询执行成功，返回 ${result.data?.length || 0} 行数据`
            );
          } else {
            console.log('⚠️ 查询结果为空');
            showMessage.warning('查询执行完成，但没有返回数据');
          }
        }
      } catch (error) {
        console.error('查询执行失败:', error);
        const errorMessage = String(error).replace('Error: ', '');
        showMessage.error(`查询执行失败: ${errorMessage}`);
      } finally {
        setLoading(false);
      }
    };

    // 打开文件
    const openFile = async () => {
      try {
        console.log('🔍 TabEditor: 尝试打开文件对话框...');
        // 使用 Tauri 的文件对话框
        const result = await safeTauriInvoke<{ path?: string }>('open_file_dialog', {
          title: '打开查询文件',
          filters: [
            { name: 'SQL Files', extensions: ['sql'] },
            { name: 'Text Files', extensions: ['txt'] },
            { name: 'All Files', extensions: ['*'] },
          ],
          multiple: false,
        });

        console.log('📁 TabEditor: 文件对话框结果:', result);

        if (result?.path) {
          console.log('📖 TabEditor: 读取文件内容:', result.path);
          // 读取文件内容
          const content = await safeTauriInvoke<string>('read_file', {
            path: result.path,
          });

          if (content) {
            // 创建新标签
            const filename =
              result.path.split('/').pop() ||
              result.path.split('\\').pop() ||
              '未命名';
            const newTab: EditorTab = {
              id: Date.now().toString(),
              title: filename,
              content,
              type: 'query',
              modified: false,
              filePath: result.path,
            };

            setTabs([...tabs, newTab]);
            setActiveKey(newTab.id);
            showMessage.success(`文件 "${filename}" 已打开`);
          }
        } else {
          console.log('❌ TabEditor: 用户取消了文件选择或没有选择文件');
        }
      } catch (error) {
        console.error('❌ TabEditor: 打开文件失败:', error);
        showMessage.error(`打开文件失败: ${error}`);
      }
    };

    // 保存文件到指定路径
    const saveFileAs = async () => {
      const currentTab = tabs.find(tab => tab.id === activeKey);
      if (!currentTab || !editorRef.current) {
        showMessage.warning('没有要保存的内容');
        return;
      }

      try {
        const content = editorRef.current.getValue();
        const result = await safeTauriInvoke('save_file_dialog', {
          defaultPath: currentTab.filePath || `${currentTab.title}.sql`,
          filters: [
            { name: 'SQL Files', extensions: ['sql'] },
            { name: 'Text Files', extensions: ['txt'] },
            { name: 'All Files', extensions: ['*'] },
          ],
        });

        if (result?.path) {
          await safeTauriInvoke('write_file', {
            path: result.path,
            content,
          });

          const filename =
            result.path.split('/').pop() ||
            result.path.split('\\').pop() ||
            '未命名';
          updateTabContent(activeKey, content, false);

          // 更新标签标题和文件路径
          setTabs(
            tabs.map(tab =>
              tab.id === activeKey
                ? {
                    ...tab,
                    title: filename,
                    filePath: result.path,
                    modified: false,
                  }
                : tab
            )
          );

          showMessage.success(`文件已保存到 "${result.path}"`);
        }
      } catch (error) {
        console.error('保存文件失败:', error);
        showMessage.error(`保存文件失败: ${error}`);
      }
    };

    // 导入数据
    const importData = async () => {
      try {
        const result = await safeTauriInvoke('open_file_dialog', {
          filters: [
            { name: 'CSV Files', extensions: ['csv'] },
            { name: 'JSON Files', extensions: ['json'] },
            { name: 'SQL Files', extensions: ['sql'] },
            { name: 'All Files', extensions: ['*'] },
          ],
        });

        if (result?.path) {
          setShowImportDialog(true);
          showMessage.info('导入数据功能正在开发中...');
        }
      } catch (error) {
        console.error('选择导入文件失败:', error);
        showMessage.error(`选择导入文件失败: ${error}`);
      }
    };

    // 导出数据
    const exportData = () => {
      if (!hasAnyConnectedInfluxDB || !selectedDatabase) {
        showMessage.warning('请先连接InfluxDB并选择数据库');
        return;
      }
      setShowExportDialog(true);
    };

    // 创建新标签
    const createNewTab = (type: 'query' | 'table' | 'database' = 'query') => {
      const newTab: EditorTab = {
        id: Date.now().toString(),
        title: `${type === 'query' ? '查询' : type === 'table' ? '表' : '数据库'}-${tabs.length + 1}`,
        content: type === 'query' ? 'SELECT * FROM ' : '',
        type,
        modified: false,
      };

      setTabs([...tabs, newTab]);
      setActiveKey(newTab.id);
    };

    // 创建数据浏览标签
    const createDataBrowserTab = (connectionId: string, database: string, tableName: string) => {
      const newTab: EditorTab = {
        id: Date.now().toString(),
        title: `${tableName}`,
        content: '', // 数据浏览不需要content
        type: 'data-browser',
        modified: false,
        connectionId,
        database,
        tableName,
      };

      setTabs([...tabs, newTab]);
      setActiveKey(newTab.id);
    };

    // 创建带数据库选择的查询标签页
    const createQueryTabWithDatabase = (database: string, query?: string) => {
      const newTab: EditorTab = {
        id: Date.now().toString(),
        title: `查询-${tabs.length + 1}`,
        content: query || 'SELECT * FROM ',
        type: 'query',
        modified: false,
      };

      setTabs([...tabs, newTab]);
      setActiveKey(newTab.id);

      // 立即设置数据库选择
      setSelectedDatabase(database);

      console.log(`✅ 创建查询标签页并选中数据库: ${database}`);
    };

    // 暴露方法给父组件
    useImperativeHandle(
      ref,
      () => ({
        executeQueryWithContent,
        createDataBrowserTab,
        createNewTab,
        createQueryTabWithDatabase,
        setSelectedDatabase,
      }),
      [executeQueryWithContent, createDataBrowserTab, createNewTab, createQueryTabWithDatabase, setSelectedDatabase]
    );

    // 组件加载时加载数据库列表
    useEffect(() => {
      if (activeConnectionId) {
        loadDatabases();
      } else {
        setDatabases([]);
        setSelectedDatabase('');
      }
    }, [activeConnectionId]);

    // 监听已展开数据库变化，自动选择合适的数据库
    useEffect(() => {
      if (expandedDatabases.length > 0) {
        // 如果当前选中的数据库不在已展开列表中，选择第一个已展开的数据库
        if (!selectedDatabase || !expandedDatabases.includes(selectedDatabase)) {
          setSelectedDatabase(expandedDatabases[0]);
          console.log('🔄 自动选择已展开的数据库:', expandedDatabases[0]);
        }
      } else {
        // 如果没有已展开的数据库，清空选择
        if (selectedDatabase) {
          setSelectedDatabase('');
          console.log('🔄 清空数据库选择，因为没有已展开的数据库');
        }
      }
    }, [expandedDatabases, selectedDatabase]);

    // 监听当前活动标签类型变化
    useEffect(() => {
      const currentTab = tabs.find(tab => tab.id === activeKey);
      if (currentTab && onActiveTabTypeChange) {
        onActiveTabTypeChange(currentTab.type);
      }
    }, [activeKey, tabs, onActiveTabTypeChange]);

    // 监听菜单事件
    useEffect(() => {
      const handleLoadFileContent = (event: Event) => {
        const customEvent = event as CustomEvent;
        const { content, filename } = customEvent.detail;

        // 创建新标签页
        const newTab: EditorTab = {
          id: Date.now().toString(),
          title: filename,
          content,
          type: 'query',
          modified: false,
        };

        setTabs(prevTabs => [...prevTabs, newTab]);
        setActiveKey(newTab.id);
      };

      const handleSaveCurrentQuery = () => {
        saveCurrentTab();
      };

      const handleSaveQueryAs = () => {
        saveFileAs();
      };

      const handleShowExportDialog = () => {
        exportData();
      };

      const handleShowImportDialog = () => {
        importData();
      };

      const handleExecuteQuery = (event: Event) => {
        const customEvent = event as CustomEvent;
        const { source } = customEvent.detail || {};
        console.log('📥 收到执行查询事件，来源:', source);
        executeQuery();
      };

      const handleRefreshDatabaseTree = () => {
        console.log('📥 收到刷新数据库树事件');
        loadDatabases();
      };

      // 添加事件监听
      document.addEventListener('load-file-content', handleLoadFileContent);
      document.addEventListener('save-current-query', handleSaveCurrentQuery);
      document.addEventListener('save-query-as', handleSaveQueryAs);
      document.addEventListener('show-export-dialog', handleShowExportDialog);
      document.addEventListener('show-import-dialog', handleShowImportDialog);
      document.addEventListener('execute-query', handleExecuteQuery);
      document.addEventListener('refresh-database-tree', handleRefreshDatabaseTree);

      // 清理事件监听
      return () => {
        document.removeEventListener('load-file-content', handleLoadFileContent);
        document.removeEventListener('save-current-query', handleSaveCurrentQuery);
        document.removeEventListener('save-query-as', handleSaveQueryAs);
        document.removeEventListener('show-export-dialog', handleShowExportDialog);
        document.removeEventListener('show-import-dialog', handleShowImportDialog);
        document.removeEventListener('execute-query', handleExecuteQuery);
        document.removeEventListener('refresh-database-tree', handleRefreshDatabaseTree);
      };
    }, [activeConnectionId, selectedDatabase, tabs, activeKey]);

    // 处理tab分离
    const handleTabDetach = (tabId: string) => {
      const tab = tabs.find(t => t.id === tabId);
      if (tab) {
        // 从tabs中移除
        setTabs(prev => prev.filter(t => t.id !== tabId));
        
        // 如果关闭的是当前活动tab，切换到其他tab
        if (activeKey === tabId) {
          const remainingTabs = tabs.filter(t => t.id !== tabId);
          if (remainingTabs.length > 0) {
            setActiveKey(remainingTabs[0].id);
          } else {
            // 如果没有剩余tab，创建一个新的
            createNewTab('query');
          }
        }
      }
    };

    // 处理tab重新附加
    const handleTabReattach = (detachedTab: any) => {
      const newTab: EditorTab = {
        id: detachedTab.id,
        title: detachedTab.title,
        content: detachedTab.content,
        type: detachedTab.type,
        modified: detachedTab.modified || false,
        connectionId: detachedTab.connectionId,
        database: detachedTab.database,
        tableName: detachedTab.tableName,
      };

      setTabs(prev => [...prev, newTab]);
      setActiveKey(newTab.id);
    };

    // 处理tab在tab栏内的移动
    const handleTabMoveInBar = (fromIndex: number, toIndex: number) => {
      setTabs(prev => {
        const newTabs = [...prev];
        const [movedTab] = newTabs.splice(fromIndex, 1);
        newTabs.splice(toIndex, 0, movedTab);
        return newTabs;
      });
    };

    // 关闭标签
    const closeTab = (targetKey: string, event?: React.MouseEvent) => {
      const tab = tabs.find(t => t.id === targetKey);

      if (tab?.modified) {
        setClosingTab(tab);
      } else {
        removeTab(targetKey);
      }
    };

    // 保存并关闭标签
    const saveAndCloseTab = async (tabId: string) => {
      const tab = tabs.find(t => t.id === tabId);
      if (!tab || !editorRef.current) {
        removeTab(tabId);
        setClosingTab(null);
        return;
      }

      const content = editorRef.current.getValue();

      // 如果已有文件路径，直接保存
      if (tab.filePath) {
        try {
          await safeTauriInvoke('write_file', {
            path: tab.filePath,
            content,
          });
          updateTabContent(tabId, content, false);
          showMessage.success(`文件已保存`);
        } catch (error) {
          console.error('保存文件失败:', error);
          showMessage.error(`保存文件失败: ${error}`);
        }
      } else {
        // 没有文件路径，需要另存为
        try {
          const result = await safeTauriInvoke('save_file_dialog', {
            defaultPath: `${tab.title}.sql`,
            filters: [
              { name: 'SQL Files', extensions: ['sql'] },
              { name: 'Text Files', extensions: ['txt'] },
              { name: 'All Files', extensions: ['*'] },
            ],
          });

          if (result?.path) {
            await safeTauriInvoke('write_file', {
              path: result.path,
              content,
            });

            const filename =
              result.path.split('/').pop() ||
              result.path.split('\\').pop() ||
              '未命名';

            // 更新标签信息
            setTabs(tabs.map(t =>
              t.id === tabId
                ? { ...t, title: filename, filePath: result.path, modified: false }
                : t
            ));

            showMessage.success(`文件已保存到 "${result.path}"`);
          } else {
            // 用户取消了保存，不关闭标签
            setClosingTab(null);
            return;
          }
        } catch (error) {
          console.error('保存文件失败:', error);
          showMessage.error(`保存文件失败: ${error}`);
          setClosingTab(null);
          return;
        }
      }

      // 保存成功后关闭标签
      removeTab(tabId);
      setClosingTab(null);
    };

    // 不保存直接关闭标签
    const closeTabWithoutSaving = () => {
      if (closingTab) {
        removeTab(closingTab.id);
        setClosingTab(null);
      }
    };

    const removeTab = (targetKey: string) => {
      const newTabs = tabs.filter(tab => tab.id !== targetKey);
      setTabs(newTabs);

      if (activeKey === targetKey) {
        const newActiveKey =
          newTabs.length > 0 ? newTabs[newTabs.length - 1].id : '';
        setActiveKey(newActiveKey);
      }
    };

    // 保存当前标签
    const saveCurrentTab = async () => {
      const currentTab = tabs.find(tab => tab.id === activeKey);
      if (!currentTab || !editorRef.current) {
        showMessage.warning('没有要保存的内容');
        return;
      }

      const content = editorRef.current.getValue();

      // 如果已有文件路径，直接保存
      if (currentTab.filePath) {
        try {
          await safeTauriInvoke('write_file', {
            path: currentTab.filePath,
            content,
          });
          updateTabContent(activeKey, content, false);
          showMessage.success(`文件已保存`);
        } catch (error) {
          console.error('保存文件失败:', error);
          showMessage.error(`保存文件失败: ${error}`);
        }
      } else {
        // 没有文件路径，调用另存为
        saveFileAs();
      }
    };

    // 更新标签内容
    const updateTabContent = (
      tabId: string,
      content: string,
      modified: boolean = true
    ) => {
      setTabs(
        tabs.map(tab =>
          tab.id === tabId ? { ...tab, content, modified } : tab
        )
      );
    };

    // 编辑器内容改变
    const handleEditorChange = (value: string | undefined) => {
      if (value !== undefined && activeKey) {
        updateTabContent(activeKey, value);
      }
    };

    // 注册InfluxQL语言支持
    const registerInfluxQLLanguage = () => {
      // 注册语言
      monaco.languages.register({ id: 'influxql' });

      // 使用SQL语言而不是自定义的influxql，确保语法高亮正确工作
      // SQL语言已经内置了完善的语法高亮规则
      console.log('🎨 使用SQL语言进行语法高亮');

      // 设置自动补全
      monaco.languages.registerCompletionItemProvider('influxql', {
        provideCompletionItems: async (model, position) => {
          const word = model.getWordUntilPosition(position);
          const range = {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: word.startColumn,
            endColumn: word.endColumn,
          };

          const suggestions: monaco.languages.CompletionItem[] = [];

          // InfluxQL关键字
          const keywords = [
            'SELECT',
            'FROM',
            'WHERE',
            'GROUP BY',
            'ORDER BY',
            'LIMIT',
            'OFFSET',
            'SHOW DATABASES',
            'SHOW MEASUREMENTS',
            'SHOW FIELD KEYS',
            'SHOW TAG KEYS',
            'SHOW SERIES',
            'SHOW RETENTION POLICIES',
            'SHOW STATS',
            'CREATE DATABASE',
            'DROP DATABASE',
            'CREATE RETENTION POLICY',
            'AND',
            'OR',
            'NOT',
            'IN',
            'LIKE',
            'BETWEEN',
            'IS',
            'NULL',
            'TIME',
            'NOW',
            'AGO',
            'FILL',
            'SLIMIT',
            'SOFFSET',
          ];

          keywords.forEach(keyword => {
            suggestions.push({
              label: keyword,
              kind: monaco.languages.CompletionItemKind.Keyword,
              insertText: keyword,
              range,
            });
          });

          // InfluxQL函数
          const functions = [
            { name: 'COUNT', desc: '计算非空值的数量' },
            { name: 'SUM', desc: '计算数值的总和' },
            { name: 'AVG', desc: '计算平均值' },
            { name: 'MIN', desc: '获取最小值' },
            { name: 'MAX', desc: '获取最大值' },
            { name: 'FIRST', desc: '获取第一个值' },
            { name: 'LAST', desc: '获取最后一个值' },
            { name: 'MEAN', desc: '计算算术平均值' },
            { name: 'MEDIAN', desc: '计算中位数' },
            { name: 'STDDEV', desc: '计算标准差' },
            { name: 'DERIVATIVE', desc: '计算导数' },
            { name: 'DIFFERENCE', desc: '计算差值' },
            { name: 'MOVING_AVERAGE', desc: '计算移动平均' },
          ];

          functions.forEach(func => {
            suggestions.push({
              label: func.name,
              kind: monaco.languages.CompletionItemKind.Function,
              insertText: `${func.name}(\${1})`,
              insertTextRules:
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: func.desc,
              range,
            });
          });

          // 如果有连接和数据库，获取测量名、字段名和标签名
          console.log('📊 智能提示检查:', {
            activeConnectionId,
            selectedDatabase,
            hasConnection: !!activeConnectionId,
            hasDatabase: !!selectedDatabase,
            wordLength: word.word?.length || 0,
          });

          if (activeConnectionId && selectedDatabase) {
            try {
              // 获取数据库建议
              console.log('📛 添加数据库建议:', databases.length, '个数据库');
              databases.forEach(db => {
                suggestions.push({
                  label: db,
                  kind: monaco.languages.CompletionItemKind.Module,
                  insertText: `"${db}"`,
                  documentation: `数据库: ${db}`,
                  range,
                });
              });

              // 获取测量建议 - 降低触发阀值，增加调试日志
              console.log('🔍 尝试获取测量建议，当前输入:', {
                word: word.word,
                length: word.word?.length || 0,
                activeConnectionId,
                selectedDatabase,
              });

              // 降低触发阀值，从1降低到0，让空字符串也能触发获取所有表
              if (word.word !== undefined && word.word.length >= 0) {
                try {
                  console.log('🔍 获取智能提示:', {
                    connection_id: activeConnectionId,
                    database: selectedDatabase,
                    partial_query: word.word || '',
                    triggerReason:
                      word.word?.length === 0
                        ? '空输入获取所有表'
                        : '按前缀过滤',
                  });

                  const measurementSuggestions = await safeTauriInvoke<
                    string[]
                  >('get_query_suggestions', {
                    connectionId: activeConnectionId,
                    database: selectedDatabase,
                    partialQuery: word.word || '',
                  });

                  console.log('✅ 智能提示结果:', measurementSuggestions);

                  measurementSuggestions?.forEach(suggestion => {
                    // 区分不同类型的建议
                    const isDatabase = databases.includes(suggestion);
                    const suggestionType = isDatabase ? '数据库' : '测量表';
                    const insertText = isDatabase
                      ? `"${suggestion}"`
                      : `"${suggestion}"`;

                    suggestions.push({
                      label: suggestion,
                      kind: isDatabase
                        ? monaco.languages.CompletionItemKind.Module
                        : monaco.languages.CompletionItemKind.Class,
                      insertText,
                      documentation: `${suggestionType}: ${suggestion}`,
                      detail: `来自数据库: ${selectedDatabase}`,
                      range,
                    });
                  });
                } catch (error) {
                  console.warn('⚠️ 获取智能提示失败:', error);
                  // 即使获取失败也不影响其他提示
                }
              }
            } catch (error) {
              console.warn('⚠️ 智能提示整体获取失败:', error);
            }
          }

          // 查询模板
          const templates = [
            {
              label: '基础查询模板',
              insertText:
                'SELECT * FROM "${1:measurement_name}" WHERE time >= now() - ${2:1h} LIMIT ${3:100}',
              documentation: '基础查询模板，包含时间范围和限制',
            },
            {
              label: '聚合查询模板',
              insertText:
                'SELECT MEAN("${1:field_name}") FROM "${2:measurement_name}" WHERE time >= now() - ${3:1h} GROUP BY time(${4:5m})',
              documentation: '聚合查询模板，按时间分组',
            },
            {
              label: '显示测量',
              insertText: 'SHOW MEASUREMENTS',
              documentation: '显示所有测量名',
            },
            {
              label: '显示字段键',
              insertText: 'SHOW FIELD KEYS FROM "${1:measurement_name}"',
              documentation: '显示指定测量的字段键',
            },
            {
              label: '显示标签键',
              insertText: 'SHOW TAG KEYS FROM "${1:measurement_name}"',
              documentation: '显示指定测量的标签键',
            },
          ];

          templates.forEach(template => {
            suggestions.push({
              label: template.label,
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: template.insertText,
              insertTextRules:
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: template.documentation,
              range,
            });
          });

          return { suggestions };
        },
      });

      // 设置悬停提示
      monaco.languages.registerHoverProvider('influxql', {
        provideHover: (model, position) => {
          const word = model.getWordAtPosition(position);
          if (!word) return null;

          const functionDocs: Record<string, string> = {
            COUNT: '计算非空值的数量。语法: COUNT(field_key)',
            SUM: '计算数值字段的总和。语法: SUM(field_key)',
            AVG: '计算数值字段的平均值。语法: AVG(field_key)',
            MEAN: '计算数值字段的算术平均值。语法: MEAN(field_key)',
            MIN: '获取字段的最小值。语法: MIN(field_key)',
            MAX: '获取字段的最大值。语法: MAX(field_key)',
            FIRST: '获取字段的第一个值。语法: FIRST(field_key)',
            LAST: '获取字段的最后一个值。语法: LAST(field_key)',
            STDDEV: '计算字段的标准差。语法: STDDEV(field_key)',
            DERIVATIVE: '计算字段的导数。语法: DERIVATIVE(field_key)',
            SELECT:
              '用于查询数据的关键字。语法: SELECT field_key FROM measurement_name',
            FROM: '指定要查询的测量名。语法: FROM measurement_name',
            WHERE: '添加查询条件。语法: WHERE condition',
            'GROUP BY': '按指定字段分组。语法: GROUP BY field_key',
            'ORDER BY': '按指定字段排序。语法: ORDER BY field_key [ASC|DESC]',
            LIMIT: '限制返回的行数。语法: LIMIT number',
            TIME: 'InfluxDB的时间列，自动索引。语法: WHERE time >= now() - 1h',
            NOW: '当前时间函数。语法: now()',
            AGO: '时间偏移函数。语法: now() - 1h',
          };

          const wordText = word.word.toUpperCase();
          if (functionDocs[wordText]) {
            return {
              range: new monaco.Range(
                position.lineNumber,
                word.startColumn,
                position.lineNumber,
                word.endColumn
              ),
              contents: [
                { value: `**${wordText}**` },
                { value: functionDocs[wordText] },
              ],
            };
          }

          return null;
        },
      });
    };

    // 获取当前主题颜色
    const getThemeColors = () => {
      const root = document.documentElement;
      const primaryColor = getComputedStyle(root).getPropertyValue('--primary').trim();

      // 将HSL转换为RGB
      const hslToRgb = (hsl: string) => {
        if (!hsl) return '#3B82F6'; // 默认蓝色

        const values = hsl.match(/\d+(\.\d+)?/g);
        if (!values || values.length < 3) return '#3B82F6';

        const h = parseInt(values[0]) / 360;
        const s = parseFloat(values[1]) / 100;
        const l = parseFloat(values[2]) / 100;

        const hue2rgb = (p: number, q: number, t: number) => {
          if (t < 0) t += 1;
          if (t > 1) t -= 1;
          if (t < 1/6) return p + (q - p) * 6 * t;
          if (t < 1/2) return q;
          if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
          return p;
        };

        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        const r = Math.round(hue2rgb(p, q, h + 1/3) * 255);
        const g = Math.round(hue2rgb(p, q, h) * 255);
        const b = Math.round(hue2rgb(p, q, h - 1/3) * 255);

        return `rgb(${r}, ${g}, ${b})`;
      };

      const primaryRgb = hslToRgb(primaryColor);

      // 生成配套的筛选条件颜色（稍微调整色相）
      const filterColor = primaryColor ?
        hslToRgb(primaryColor.replace(/hsl\((\d+)/, (match, hue) =>
          `hsl(${(parseInt(hue) + 30) % 360}`)) : '#10B981';

      return {
        primary: primaryRgb,
        filter: filterColor
      };
    };



    // 编辑器挂载
    const handleEditorDidMount = (
      editor: monaco.editor.IStandaloneCodeEditor
    ) => {
      editorRef.current = editor;

      // 设置智能自动补全
      setupInfluxQLAutoComplete(monaco, editor, selectedDatabase);

      console.log('🎨 Monaco编辑器已挂载，使用原生主题:', resolvedTheme === 'dark' ? 'vs-dark' : 'vs-light');

      // 注册InfluxQL语言支持（只注册一次）
      try {
        // 检查语言是否已经注册
        const languages = monaco.languages.getLanguages();
        const isInfluxQLRegistered = languages.some(
          lang => lang.id === 'influxql'
        );

        if (!isInfluxQLRegistered) {
          console.log('🔧 注册InfluxQL语言支持...');
          registerInfluxQLLanguage();
          console.log('✅ InfluxQL语言支持注册完成');
        } else {
          console.log('ℹ️ InfluxQL语言支持已存在');
        }
      } catch (error) {
        console.error('⚠️ 注册InfluxQL语言支持失败:', error);
      }

      // 设置编辑器选项
      editor.updateOptions({
        fontSize: 14,
        lineHeight: 20,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        wordWrap: 'on',
        automaticLayout: true,
        // 增强智能提示
        quickSuggestions: {
          other: true,
          comments: false,
          strings: true, // 在字符串中也显示提示（用于测量名）
        },
        suggestOnTriggerCharacters: true,
        acceptSuggestionOnEnter: 'on',
        tabCompletion: 'on',
        parameterHints: { enabled: true },
        hover: { enabled: true },
        // 增加更多提示配置
        quickSuggestionsDelay: 50, // 减少延迟到50ms
        suggestSelection: 'first', // 默认选择第一个建议
        wordBasedSuggestions: 'currentDocument', // 基于单词的建议
        // 自动触发提示的字符
        autoIndent: 'full',
        // 更敏感的提示设置
        wordSeparators: '`~!@#$%^&*()=+[{]}\\|;:\'",.<>/?',
      });

      // 添加快捷键
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
        // 执行查询
        executeQuery();
      });

      // 添加手动触发智能提示的快捷键
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Space, () => {
        editor.trigger('manual', 'editor.action.triggerSuggest', {});
      });

      // 添加焦点事件监听，确保智能提示正常工作
      editor.onDidFocusEditorText(() => {
        console.log('👁️ 编辑器获得焦点，智能提示已启用');
        console.log('📊 当前数据库状态:', {
          selectedDatabase,
          databases: databases.length,
          activeConnectionId,
        });
      });

      // 添加输入事件监听，增强智能提示
      editor.onDidChangeModelContent(e => {
        // 自动触发智能提示的条件
        const position = editor.getPosition();
        if (position) {
          const model = editor.getModel();
          if (model) {
            const lineText = model.getLineContent(position.lineNumber);
            const wordBeforeCursor = lineText.substring(0, position.column - 1);

            // 检查是否在关键位置触发提示
            if (
              wordBeforeCursor.match(/\b(FROM|from)\s*$/i) ||
              wordBeforeCursor.match(/\b(SELECT|select)\s*$/i) ||
              wordBeforeCursor.match(/\b(WHERE|where)\s*$/i) ||
              wordBeforeCursor.match(/\b(GROUP\s+BY|group\s+by)\s*$/i) ||
              wordBeforeCursor.match(/\b(ORDER\s+BY|order\s+by)\s*$/i) ||
              wordBeforeCursor.match(/"\s*$/) ||
              wordBeforeCursor.match(/'\s*$/)
            ) {
              // 延迟触发，避免过于频繁
              setTimeout(() => {
                if (editor.hasTextFocus()) {
                  editor.trigger('auto', 'editor.action.triggerSuggest', {});
                }
              }, 100);
            }
          }
        }
      });

      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
        saveCurrentTab();
      });

      // 添加执行查询快捷键 (Ctrl+Enter)
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
        executeQuery();
      });

      // 添加测试智能提示的快捷键 (Ctrl+K)
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyK, () => {
        console.log('🧪 测试智能提示功能...');
        console.log('📊 当前状态:', {
          activeConnectionId,
          selectedDatabase,
          databases: databases.length,
          cursorPosition: editor.getPosition(),
        });

        // 手动触发智能提示
        editor.trigger('test', 'editor.action.triggerSuggest', {});
        showMessage.info('已触发智能提示，请查看控制台日志');
        editor.getAction('editor.action.formatDocument')?.run();
      });

      // 监听主题变化
      const observer = new MutationObserver((mutations) => {
        const hasThemeChange = mutations.some(mutation =>
          mutation.type === 'attributes' &&
          (mutation.attributeName === 'data-theme' ||
           mutation.attributeName === 'class')
        );

        if (hasThemeChange) {
          // 获取当前主题
          const currentResolvedTheme = document.documentElement.getAttribute('data-theme') ||
            (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

          const newTheme = currentResolvedTheme === 'dark' ? 'vs-dark' : 'vs-light';

          // 立即更新Monaco编辑器主题
          setTimeout(() => {
            monaco.editor.setTheme(newTheme);
            console.log('🔄 主题已切换到:', newTheme);
          }, 50);
        }
      });

      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme', 'class']
      });

      // 清理函数
      return () => {
        observer.disconnect();
        console.log('🧹 Monaco编辑器清理完成');
      };
    };

    // 标签页右键菜单
    const getTabContextMenu = (tab: EditorTab): MenuProps['items'] => [
      {
        key: 'save',
        label: '保存',
        icon: <Save className='w-4 h-4' />,
      },
      {
        key: 'save-as',
        label: '另存为',
        icon: <Save className='w-4 h-4' />,
      },
      {
        key: 'divider-1',
        label: '',
        type: 'divider',
      },
      {
        key: 'close',
        label: '关闭',
        icon: <X className='w-4 h-4' />,
      },
      {
        key: 'close-others',
        label: '关闭其他',
      },
      {
        key: 'close-all',
        label: '关闭全部',
      },
    ];

    // 新建菜单
    const newTabMenuItems: MenuProps['items'] = [
      {
        key: 'new-query',
        label: 'SQL 查询',
        icon: <FileText className='w-4 h-4' />,
        onClick: () => createNewTab('query'),
      },
      {
        key: 'new-table',
        label: '表设计器',
        icon: <Table className='w-4 h-4' />,
        onClick: () => createNewTab('table'),
      },
      {
        key: 'new-database',
        label: '数据库设计器',
        icon: <Database className='w-4 h-4' />,
        onClick: () => createNewTab('database'),
      },
    ];

    const currentTab = tabs.find(tab => tab.id === activeKey);

    return (
      <TooltipProvider>
        <div className='h-full flex flex-col bg-background border-0 shadow-none'>
          {/* 优化后的标签页头部 - 防止被挤压 */}
          <div className='flex items-center justify-between border-b border min-h-[48px] p-0'>
            {/* 左侧标签区域 - 支持滚动 */}
            <div className='flex-1 flex items-center min-w-0'>
              <div 
                className='flex items-center border-b border flex-1 overflow-x-auto scrollbar-thin scrollbar-thumb-muted-foreground scrollbar-track-transparent'
                onDrop={(e) => handleTabDrop(e, handleTabReattach)}
                onDragOver={handleTabDragOver}
              >
                {tabs.map(tab => (
                  <div
                    key={tab.id}
                    draggable
                    className={`flex items-center gap-1 px-3 py-2 border-r border cursor-pointer hover:bg-muted/50 flex-shrink-0 min-w-[120px] max-w-[180px] transition-all duration-200 ${
                      activeKey === tab.id
                        ? 'bg-background border-b-2 border-primary'
                        : 'bg-muted/50'
                    } ${isDragging && draggedTab?.id === tab.id ? 'opacity-50' : ''}`}
                    onClick={() => setActiveKey(tab.id)}
                    onDragStart={(e) => handleTabDragStart(e, {
                      id: tab.id,
                      title: tab.title,
                      content: tab.content,
                      type: tab.type,
                      connectionId: tab.connectionId,
                      database: tab.database,
                      tableName: tab.tableName,
                    })}
                    onDrag={handleTabDrag}
                    onDragEnd={(e) => handleTabDragEnd(e, (tabId, action) => {
                      if (action === 'detach') {
                        // 在简化版中，不真正移除tab，只是演示
                        showMessage.info(`Tab "${tab.title}" 分离操作（演示）`);
                      }
                    })}
                  >
                    {tab.type === 'query' && (
                      <FileText className='w-4 h-4 flex-shrink-0' />
                    )}
                    {tab.type === 'table' && (
                      <Table className='w-4 h-4 flex-shrink-0' />
                    )}
                    {tab.type === 'database' && (
                      <Database className='w-4 h-4 flex-shrink-0' />
                    )}
                    {tab.type === 'data-browser' && (
                      <Table className='w-4 h-4 flex-shrink-0 text-blue-600' />
                    )}
                    <span className='text-sm truncate flex-1'>{tab.title}</span>
                    {tab.modified && (
                      <span className='text-orange-500 text-xs flex-shrink-0'>
                        *
                      </span>
                    )}
                    {tab.modified ? (
                      <Popconfirm
                        title='保存更改'
                        description={`"${tab.title}" 已修改，是否保存更改？`}
                        open={closingTab?.id === tab.id}
                        onConfirm={() => saveAndCloseTab(tab.id)}
                        onOpenChange={open => {
                          if (!open && closingTab?.id === tab.id) {
                            removeTab(tab.id);
                            setClosingTab(null);
                          }
                        }}
                        okText='保存'
                        cancelText='不保存'
                        placement='bottom'
                      >
                        <Button
                          variant='ghost'
                          size='sm'
                          onClick={e => {
                            e.stopPropagation();
                            closeTab(tab.id);
                          }}
                          className='ml-1 p-0 h-4 w-4 flex-shrink-0 opacity-60 hover:opacity-100'
                        >
                          <X className='w-3 h-3' />
                        </Button>
                      </Popconfirm>
                    ) : (
                      <Button
                        variant='ghost'
                        size='sm'
                        onClick={e => {
                          e.stopPropagation();
                          closeTab(tab.id);
                        }}
                        className='ml-1 p-0 h-4 w-4 flex-shrink-0 opacity-60 hover:opacity-100'
                      >
                        <X className='w-3 h-3' />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  variant='ghost'
                  size='sm'
                  className='ml-2 flex-shrink-0'
                  title='新建SQL查询'
                  onClick={() => createNewTab('query')}
                >
                  <Plus className='w-4 h-4' />
                </Button>
              </div>
            </div>

            {/* 右侧工具栏 - 统一尺寸，防止被挤压 */}
            <div className='flex items-center gap-2 px-3 flex-shrink-0'>
              <Select
                value={selectedDatabase}
                onValueChange={setSelectedDatabase}
                disabled={!hasAnyConnectedInfluxDB || expandedDatabases.length === 0}
              >
                <SelectTrigger className='w-[140px] h-10'>
                  <SelectValue placeholder='选择数据库' />
                </SelectTrigger>
                <SelectContent>
                  {expandedDatabases.map(db => (
                    <SelectItem key={db} value={db}>
                      {db}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                size='sm'
                onClick={() => executeQuery()}
                disabled={
                  loading || !hasAnyConnectedInfluxDB || !selectedDatabase
                }
                className='h-10 w-14 p-1 flex flex-col items-center justify-center gap-1'
                title={
                  hasAnyConnectedInfluxDB
                    ? '执行查询 (Ctrl+Enter)'
                    : '执行查询 (需要连接InfluxDB)'
                }
              >
                <PlayCircle className='w-4 h-4' />
                <span className='text-xs'>{loading ? '执行中' : '执行'}</span>
              </Button>

              <Button
                variant='outline'
                size='sm'
                onClick={saveCurrentTab}
                className='h-10 w-14 p-1 flex flex-col items-center justify-center gap-1'
                title='保存查询 (Ctrl+S)'
              >
                <Save className='w-4 h-4' />
                <span className='text-xs'>保存</span>
              </Button>

              <Button
                variant='outline'
                size='sm'
                onClick={openFile}
                className='h-10 w-14 p-1 flex flex-col items-center justify-center gap-1'
                title='打开文件'
              >
                <FolderOpen className='w-4 h-4' />
                <span className='text-xs'>打开</span>
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant='outline'
                    size='sm'
                    className='h-10 w-14 p-1 flex flex-col items-center justify-center gap-1'
                    title='更多操作'
                  >
                    <MoreHorizontal className='w-4 h-4' />
                    <span className='text-xs'>更多</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align='end'>
                  <DropdownMenuItem onClick={saveFileAs}>
                    <Save className='w-4 h-4 mr-2' />
                    另存为
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={importData}>
                    <Upload className='w-4 h-4 mr-2' />
                    导入数据
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={exportData}>
                    <Download className='w-4 h-4 mr-2' />
                    导出数据
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* 编辑器内容 */}
          <div className='flex-1 min-h-0 overflow-hidden'>
            {currentTab ? (
              currentTab.type === 'data-browser' ? (
                <TableDataBrowser
                  connectionId={currentTab.connectionId!}
                  database={currentTab.database!}
                  tableName={currentTab.tableName!}
                />
              ) : (
                <div className="h-full flex flex-col">
                  <div className="flex-1">
                    <Editor
                      height='100%'
                      language='sql'
                      theme={resolvedTheme === 'dark' ? 'vs-dark' : 'vs-light'}
                      value={currentTab.content}
                      onChange={handleEditorChange}
                      onMount={handleEditorDidMount}
                      key={`${currentTab.id}-${resolvedTheme}`} // 强制重新渲染以应用主题
                      options={{
                        minimap: { enabled: false },
                        scrollBeyondLastLine: false,
                        fontSize: 14,
                        lineNumbers: 'on',
                        roundedSelection: false,
                      scrollbar: {
                        vertical: 'auto',
                        horizontal: 'auto',
                      },
                      wordWrap: 'on',
                      automaticLayout: true,
                      suggestOnTriggerCharacters: true,
                      quickSuggestions: {
                        other: true,
                        comments: false,
                        strings: true, // 在字符串中也显示提示（用于测量名）
                      },
                      parameterHints: { enabled: true },
                      formatOnPaste: true,
                      formatOnType: true,
                      acceptSuggestionOnEnter: 'on',
                      tabCompletion: 'on',
                      hover: { enabled: true },
                      // 增加更多智能提示配置
                      quickSuggestionsDelay: 50,
                      suggestSelection: 'first',
                      wordBasedSuggestions: 'currentDocument',
                      // 桌面应用：启用Monaco编辑器的原生剪贴板功能
                      contextmenu: true,
                      copyWithSyntaxHighlighting: true,
                      }}
                    />
                  </div>

                  {/* 实际执行查询显示区域 */}
                  {actualExecutedQueries.length > 0 && (
                    <div className="border-t bg-muted/30">
                      <div
                        className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-muted/50"
                        onClick={() => setShowExecutedQueries(!showExecutedQueries)}
                      >
                        <div className="flex items-center gap-2">
                          <Code className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm font-medium">
                            实际执行的查询 ({actualExecutedQueries.length} 条)
                          </span>
                        </div>
                        {showExecutedQueries ? (
                          <ChevronUp className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>

                      {showExecutedQueries && (
                        <div className="px-3 pb-3 max-h-48 overflow-y-auto">
                          {actualExecutedQueries.map((query, index) => (
                            <div key={index} className="mb-2 last:mb-0">
                              <div className="text-xs text-muted-foreground mb-1">
                                查询 {index + 1}:
                              </div>
                              <div className="bg-background border rounded p-2 font-mono text-xs">
                                <pre className="whitespace-pre-wrap">{query}</pre>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            ) : (
              <div className='h-full flex items-center justify-center text-muted-foreground border-0 shadow-none'>
                <div className='text-center'>
                  <FileText className='w-12 h-12 mx-auto mb-4' />
                  <p>暂无打开的文件</p>
                  <Button
                    variant='default'
                    onClick={() => createNewTab()}
                    className='mt-2'
                  >
                    <Plus className='w-4 h-4 mr-2' />
                    新建查询
                  </Button>
                </div>
              </div>
            )}
          </div>



          {/* 数据导出对话框 */}
          <DataExportDialog
            open={showExportDialog}
            onClose={() => setShowExportDialog(false)}
            connections={connections}
            currentConnection={activeConnectionId || undefined}
            currentDatabase={selectedDatabase}
            query={currentTab?.content}
            onSuccess={result => {
              showMessage.success('数据导出成功');
              setShowExportDialog(false);
            }}
          />

          {/* 拖拽提示覆盖层 */}
          <SimpleDragOverlay active={dropZoneActive} />
        </div>
      </TooltipProvider>
    );
  }
);

TabEditor.displayName = 'TabEditor';

export default TabEditor;
