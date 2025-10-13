import { useCallback } from 'react';
import type { ConnectionConfig } from '@/types';
import type { DataNode } from '@/types/databaseExplorer';
import { showMessage } from '@/utils/message';

interface UseConnectionHandlersProps {
    getConnection: (id: string) => ConnectionConfig | undefined;
    connectToDatabase: (id: string) => Promise<void>;
    disconnectFromDatabase: (id: string) => Promise<void>;
    getConnectionStatus: (id: string) => any;
    isConnectionConnected: (id: string) => boolean;
    closeAllDatabasesForConnection: (connectionId: string) => void;
    clearDatabasesCache: (connectionId?: string) => void;
    setConnectionLoadingStates: React.Dispatch<React.SetStateAction<Map<string, boolean>>>;
    setConnectionErrors: React.Dispatch<React.SetStateAction<Map<string, string>>>;
    setExpandedKeys: React.Dispatch<React.SetStateAction<React.Key[]>>;
    treeData: DataNode[];
    buildCompleteTreeData: (forceRefresh?: boolean) => Promise<void>;
    updateConnectionNodeDisplay: (connectionId: string, isLoading: boolean) => void;
}

/**
 * Custom hook for handling connection-related operations
 */
export const useConnectionHandlers = ({
    getConnection,
    connectToDatabase,
    disconnectFromDatabase,
    getConnectionStatus,
    isConnectionConnected,
    closeAllDatabasesForConnection,
    clearDatabasesCache,
    setConnectionLoadingStates,
    setConnectionErrors,
    setExpandedKeys,
    treeData,
    buildCompleteTreeData,
    updateConnectionNodeDisplay,
}: UseConnectionHandlersProps) => {
    // ============================================================================
    // Connect and Load Databases
    // ============================================================================
    const handleConnectionAndLoadDatabases = useCallback(async (connectionId: string) => {
        const connection = getConnection(connectionId);
        if (!connection) return;

        console.log(`🚀 开始连接并加载数据库: ${connection.name}`);

        // 清除之前的错误状态
        setConnectionErrors(prev => {
            const newMap = new Map(prev);
            newMap.delete(connectionId);
            return newMap;
        });

        // 设置加载状态
        setConnectionLoadingStates(prev => new Map(prev).set(connectionId, true));

        try {
            // 1. 建立连接
            console.log(`🔗 建立连接: ${connection.name}`);
            await connectToDatabase(connectionId);

            // 2. 清理之前的数据库状态
            closeAllDatabasesForConnection(connectionId);
            clearDatabasesCache(connectionId);

            // 3. 连接成功，显示成功消息
            showMessage.success(`已连接: ${connection.name}`);
            console.log(`✅ 连接建立成功: ${connection.name}`);

            // 清除加载状态
            setConnectionLoadingStates(prev => {
                const newMap = new Map(prev);
                newMap.delete(connectionId);
                return newMap;
            });

        } catch (error) {
            console.error(`❌ 连接并加载数据库失败:`, error);
            const errorMessage = String(error);

            // 设置错误状态
            setConnectionErrors(prev => new Map(prev).set(connectionId, errorMessage));

            // 清除加载状态
            setConnectionLoadingStates(prev => {
                const newMap = new Map(prev);
                newMap.delete(connectionId);
                return newMap;
            });

            showMessage.error(`连接失败: ${errorMessage}`);
        } finally {
            // 确保加载状态被清除
            setConnectionLoadingStates(prev => {
                const newMap = new Map(prev);
                newMap.delete(connectionId);
                return newMap;
            });
        }
    }, [
        getConnection,
        connectToDatabase,
        closeAllDatabasesForConnection,
        clearDatabasesCache,
        setConnectionErrors,
        setConnectionLoadingStates,
    ]);

    // ============================================================================
    // Expand Connection
    // ============================================================================
    const handleExpandConnection = useCallback(async (connectionId: string) => {
        const connection = getConnection(connectionId);
        if (!connection) return;

        console.log(`📂 展开已连接的连接: ${connection.name}`);

        const connectionKey = `connection-${connectionId}`;

        // 检查是否已有数据库子节点
        const currentNode = treeData.find(node => node.key === connectionKey);
        const hasChildren = currentNode?.children && currentNode.children.length > 0;

        if (!hasChildren) {
            // 如果没有子节点，需要加载数据库列表
            setConnectionLoadingStates(prev => new Map(prev).set(connectionId, true));
            updateConnectionNodeDisplay(connectionId, true);

            try {
                console.log(`📊 加载数据库列表: ${connection.name}`);
                await buildCompleteTreeData(true);
                showMessage.success(`已加载数据库列表: ${connection.name}`);
            } catch (error) {
                console.error(`❌ 加载数据库列表失败:`, error);
                showMessage.error(`加载数据库列表失败: ${error}`);
                return;
            } finally {
                setConnectionLoadingStates(prev => {
                    const newMap = new Map(prev);
                    newMap.delete(connectionId);
                    return newMap;
                });
                updateConnectionNodeDisplay(connectionId, false);
            }
        }

        // 展开连接节点
        setExpandedKeys(prev => [...prev, connectionKey]);
        showMessage.info(`已展开连接 "${connection.name}"`);

    }, [getConnection, treeData, setConnectionLoadingStates, updateConnectionNodeDisplay, buildCompleteTreeData, setExpandedKeys]);

    // ============================================================================
    // Toggle Connection
    // ============================================================================
    const handleConnectionToggle = useCallback(async (connection_id: string) => {
        const isCurrentlyConnected = isConnectionConnected(connection_id);
        const connection = getConnection(connection_id);
        const currentStatus = getConnectionStatus(connection_id);

        if (!connection) {
            showMessage.error('连接配置不存在');
            return;
        }

        // 检查是否正在连接中
        if (currentStatus?.status === 'connecting') {
            console.log(`⏳ 连接 ${connection.name} 正在连接中，跳过操作`);
            showMessage.warning(`连接 ${connection.name} 正在连接中，请稍候...`);
            return;
        }

        console.log(
            `🔄 开始连接操作: ${connection.name}, 当前状态: ${isCurrentlyConnected ? '已连接' : '未连接'}`,
            { connectionId: connection_id, currentStatus: currentStatus?.status }
        );

        // 设置loading状态
        setConnectionLoadingStates(prev => new Map(prev).set(connection_id, true));
        updateConnectionNodeDisplay(connection_id, true);

        // 添加超时控制
        const timeoutMs = (connection.connectionTimeout || 30) * 1000;
        const abortController = new AbortController();

        const timeoutId = setTimeout(() => {
            abortController.abort();
            console.warn(`⏰ 连接操作超时: ${connection.name}`);
            showMessage.error(`连接操作超时: ${connection.name}`);
        }, timeoutMs);

        try {
            if (isCurrentlyConnected) {
                // 断开连接
                console.log(`🔌 断开连接: ${connection.name}`);
                await disconnectFromDatabase(connection_id);
                showMessage.success(`已断开连接: ${connection.name}`);
            } else {
                // 建立连接
                console.log(`🔗 建立连接: ${connection.name}`);
                await connectToDatabase(connection_id);
                showMessage.success(`已连接: ${connection.name}`);
            }

            clearTimeout(timeoutId);
            console.log(`✅ 连接操作完成: ${connection.name}`);
        } catch (error) {
            clearTimeout(timeoutId);
            console.error(`❌ 连接操作失败:`, error);

            let errorMessage = error instanceof Error ? error.message : String(error);

            // 检查是否是超时错误
            if (abortController.signal.aborted) {
                errorMessage = `连接超时 (${connection.connectionTimeout || 30}秒)`;
            }

            // 设置错误状态
            setConnectionErrors(prev => new Map(prev).set(connection_id, errorMessage));

            showMessage.error(`连接失败: ${errorMessage}`);
        } finally {
            // 清除loading状态
            setConnectionLoadingStates(prev => {
                const newMap = new Map(prev);
                newMap.delete(connection_id);
                return newMap;
            });
            updateConnectionNodeDisplay(connection_id, false);
        }
    }, [
        isConnectionConnected,
        getConnection,
        getConnectionStatus,
        connectToDatabase,
        disconnectFromDatabase,
        setConnectionLoadingStates,
        setConnectionErrors,
        updateConnectionNodeDisplay,
    ]);

    return {
        handleConnectionAndLoadDatabases,
        handleExpandConnection,
        handleConnectionToggle,
    };
};

