import { useCallback } from 'react';
import type { TreeNode } from '@/types/tree';

interface UseDataLoadingProps {
    getTreeNodesWithCache: (connectionId: string, forceRefresh: boolean) => Promise<TreeNode[]>;
    databasesCache: Map<string, string[]>;
    setDatabasesCache: React.Dispatch<React.SetStateAction<Map<string, string[]>>>;
}

export const useDataLoading = ({
    getTreeNodesWithCache,
    databasesCache,
    setDatabasesCache,
}: UseDataLoadingProps) => {
    /**
     * 加载指定连接的数据库列表
     */
    const loadDatabases = useCallback(
        async (connection_id: string, forceRefresh: boolean = false): Promise<string[]> => {
            console.log(`📂 加载数据库列表: ${connection_id}, 强制刷新: ${forceRefresh}`);

            // 检查缓存
            if (!forceRefresh && databasesCache.has(connection_id)) {
                const cached = databasesCache.get(connection_id)!;
                console.log(`✅ 使用缓存的数据库列表: ${cached.length} 个数据库`);
                return cached;
            }

            try {
                // 使用统一的缓存方法获取树节点信息
                const treeNodes = await getTreeNodesWithCache(connection_id, forceRefresh);
                console.log(`🎯 获取树节点信息，节点数量: ${treeNodes.length}`);

                // 过滤出数据库节点
                const databases = treeNodes
                    .filter(node => {
                        const nodeType = node.nodeType;
                        return nodeType === 'storage_group' || nodeType === 'database';
                    })
                    .map(node => node.name || node.id);

                console.log(`📁 数据库列表: ${databases.join(', ')}`);

                // 更新缓存
                setDatabasesCache(prev => new Map(prev).set(connection_id, databases));

                return databases;
            } catch (error) {
                console.error(`❌ 加载数据库列表失败:`, error);
                throw error;
            }
        },
        [getTreeNodesWithCache, databasesCache, setDatabasesCache]
    );

    /**
     * 加载指定数据库的表列表
     */
    const loadTables = useCallback(
        async (connection_id: string, database: string): Promise<string[]> => {
            console.log(`📊 加载表列表: ${connection_id}/${database}`);
            try {
                // 这里应该调用后端API获取表列表
                // 暂时返回空数组
                return [];
            } catch (error) {
                console.error(`❌ 加载表列表失败:`, error);
                throw error;
            }
        },
        []
    );

    /**
     * 加载指定表的字段和标签信息
     */
    const loadFieldsAndTags = useCallback(
        async (
            connection_id: string,
            database: string,
            table: string
        ): Promise<{
            tags: string[];
            fields: Array<{ name: string; type: string }>;
        }> => {
            console.log(`🏷️ 加载字段和标签: ${connection_id}/${database}/${table}`);
            try {
                // 这里应该调用后端API获取字段和标签信息
                // 暂时返回空对象
                return {
                    tags: [],
                    fields: [],
                };
            } catch (error) {
                console.error(`❌ 加载字段和标签失败:`, error);
                throw error;
            }
        },
        []
    );

    return {
        loadDatabases,
        loadTables,
        loadFieldsAndTags,
    };
};

