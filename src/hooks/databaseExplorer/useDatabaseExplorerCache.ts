import { useCallback } from 'react';
import { safeTauriInvoke } from '@/utils/tauri';
import type { ConnectionConfig } from '@/types';

interface UseDatabaseExplorerCacheProps {
    treeNodeCache: Record<string, any[]>;
    setTreeNodeCache: React.Dispatch<React.SetStateAction<Record<string, any[]>>>;
    databasesCache: Map<string, string[]>;
    setDatabasesCache: React.Dispatch<React.SetStateAction<Map<string, string[]>>>;
    getConnection: (id: string) => ConnectionConfig | undefined;
    addConnection: (connection: ConnectionConfig) => void;
}

/**
 * Custom hook for managing database explorer cache
 */
export const useDatabaseExplorerCache = ({
    treeNodeCache,
    setTreeNodeCache,
    databasesCache,
    setDatabasesCache,
    getConnection,
    addConnection,
}: UseDatabaseExplorerCacheProps) => {
    // ============================================================================
    // Clear Databases Cache
    // ============================================================================
    const clearDatabasesCache = useCallback((connectionId?: string) => {
        if (connectionId) {
            setDatabasesCache(prev => {
                const newCache = new Map(prev);
                newCache.delete(connectionId);
                return newCache;
            });
            console.log(`🗑️ 已清除连接 ${connectionId} 的数据库缓存`);
        } else {
            setDatabasesCache(new Map());
            console.log(`🗑️ 已清除所有数据库缓存`);
        }
    }, [setDatabasesCache]);

    // ============================================================================
    // Get Tree Nodes With Cache
    // ============================================================================
    const getTreeNodesWithCache = useCallback(
        async (connection_id: string, forceRefresh: boolean = false): Promise<any[]> => {
            // 优先使用缓存，除非强制刷新
            if (!forceRefresh && treeNodeCache[connection_id]) {
                const cachedNodes = treeNodeCache[connection_id];
                console.log(`✅ 使用缓存的树节点数据，连接: ${connection_id}，节点数量: ${cachedNodes.length}`);
                return cachedNodes;
            }

            console.log(`🔍 开始加载连接 ${connection_id} 的树节点数据...`);
            try {
                // 首先验证连接是否在后端存在
                const backendConnections =
                    await safeTauriInvoke<Array<{ id: string; [key: string]: unknown }>>('get_connections');
                const backendConnection = backendConnections?.find(
                    (c) => c.id === connection_id
                );

                if (!backendConnection) {
                    console.warn(
                        `⚠️ 连接 ${connection_id} 在后端不存在，尝试重新创建...`
                    );

                    // 从前端获取连接配置
                    const connection = getConnection(connection_id);
                    if (connection) {
                        try {
                            // 重新创建连接到后端
                            const connectionWithTimestamp = {
                                ...connection,
                                created_at: new Date().toISOString(),
                                updated_at: new Date().toISOString(),
                            };
                            const newConnectionId = await safeTauriInvoke<string>(
                                'create_connection',
                                { config: connectionWithTimestamp }
                            );
                            console.log(`✨ 连接已重新创建，新ID: ${newConnectionId}`);

                            // 如果ID发生变化，需要同步到前端存储
                            if (newConnectionId !== connection_id) {
                                const newConnection = { ...connection, id: newConnectionId };
                                addConnection(newConnection);
                                console.log(`🔄 前端连接ID已更新: ${connection_id} -> ${newConnectionId}`);
                            }
                        } catch (createError) {
                            console.error('❌ 重新创建连接失败:', createError);
                            throw createError;
                        }
                    } else {
                        throw new Error(`连接 ${connection_id} 在前端也不存在`);
                    }
                }

                // 调用后端获取树节点
                const treeNodes = await safeTauriInvoke<any[]>('get_tree_nodes', {
                    connectionId: connection_id,
                });

                console.log(`✅ 成功加载树节点数据，节点数量: ${treeNodes?.length || 0}`);

                // 更新缓存
                setTreeNodeCache((prev) => ({
                    ...prev,
                    [connection_id]: treeNodes || [],
                }));

                return treeNodes || [];
            } catch (error) {
                console.error(`❌ 加载树节点数据失败:`, error);
                throw error;
            }
        },
        [treeNodeCache, setTreeNodeCache, getConnection, addConnection]
    );

    return {
        clearDatabasesCache,
        getTreeNodesWithCache,
    };
};

