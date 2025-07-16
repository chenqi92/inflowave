import {useState, useCallback, useEffect} from 'react';
import {useDatabaseStore} from '@/store/database';
import type {DatabaseInfo, MeasurementInfo, FieldInfo, TagInfo} from '@/types';

/**
 * 数据库管理 Hook
 */
export const useDatabase = (connectionId?: string) => {
    const {
        databases,
        loadingDatabases,
        loadingMeasurements,
        loadingFields,
        loadingTags,
        error,
        loadDatabases,
        createDatabase,
        dropDatabase,
        setSelectedDatabase,
        getSelectedDatabase,
        loadMeasurements,
        getMeasurements,
        loadFields,
        getFields,
        loadTags,
        getTags,
        loadSeries,
        getSeries,
        getDatabaseStats,
        clearCache,
        clearDatabaseCache,
        clearError
    } = useDatabaseStore();

    const [localLoading, setLocalLoading] = useState(false);
    const [localError, setLocalError] = useState<string | null>(null);

    /**
     * 获取指定连接的数据库列表
     */
    const getDatabases = useCallback((connId?: string): DatabaseInfo[] => {
        const id = connId || connectionId;
        if (!id) return [];
        return databases[id] || [];
    }, [databases, connectionId]);

    /**
     * 加载数据库列表
     */
    const fetchDatabases = useCallback(async (connId?: string): Promise<DatabaseInfo[]> => {
        const id = connId || connectionId;
        if (!id) {
            throw new Error('连接ID不能为空');
        }

        setLocalLoading(true);
        setLocalError(null);

        try {
            const result = await loadDatabases(id);
            return result;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            setLocalError(errorMessage);
            throw err;
        } finally {
            setLocalLoading(false);
        }
    }, [loadDatabases, connectionId]);

    /**
     * 创建数据库
     */
    const addDatabase = useCallback(async (name: string, connId?: string): Promise<void> => {
        const id = connId || connectionId;
        if (!id) {
            throw new Error('连接ID不能为空');
        }

        setLocalLoading(true);
        setLocalError(null);

        try {
            await createDatabase(id, name);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            setLocalError(errorMessage);
            throw err;
        } finally {
            setLocalLoading(false);
        }
    }, [createDatabase, connectionId]);

    /**
     * 删除数据库
     */
    const deleteDatabase = useCallback(async (name: string, connId?: string): Promise<void> => {
        const id = connId || connectionId;
        if (!id) {
            throw new Error('连接ID不能为空');
        }

        setLocalLoading(true);
        setLocalError(null);

        try {
            await dropDatabase(id, name);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            setLocalError(errorMessage);
            throw err;
        } finally {
            setLocalLoading(false);
        }
    }, [dropDatabase, connectionId]);

    /**
     * 选择数据库
     */
    const selectDatabase = useCallback((database: string, connId?: string) => {
        const id = connId || connectionId;
        if (!id) return;
        setSelectedDatabase(id, database);
    }, [setSelectedDatabase, connectionId]);

    /**
     * 获取当前选中的数据库
     */
    const getCurrentDatabase = useCallback((connId?: string): string | undefined => {
        const id = connId || connectionId;
        if (!id) return undefined;
        return getSelectedDatabase(id);
    }, [getSelectedDatabase, connectionId]);

    /**
     * 获取测量列表
     */
    const getMeasurementList = useCallback((database: string, connId?: string): MeasurementInfo[] => {
        const id = connId || connectionId;
        if (!id) return [];
        return getMeasurements(id, database);
    }, [getMeasurements, connectionId]);

    /**
     * 加载测量列表
     */
    const fetchMeasurements = useCallback(async (
        database: string,
        connId?: string
    ): Promise<MeasurementInfo[]> => {
        const id = connId || connectionId;
        if (!id) {
            throw new Error('连接ID不能为空');
        }

        setLocalLoading(true);
        setLocalError(null);

        try {
            const result = await loadMeasurements(id, database);
            return result;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            setLocalError(errorMessage);
            throw err;
        } finally {
            setLocalLoading(false);
        }
    }, [loadMeasurements, connectionId]);

    /**
     * 获取字段列表
     */
    const getFieldList = useCallback((
        database: string,
        measurement: string,
        connId?: string
    ): FieldInfo[] => {
        const id = connId || connectionId;
        if (!id) return [];
        return getFields(id, database, measurement);
    }, [getFields, connectionId]);

    /**
     * 加载字段列表
     */
    const fetchFields = useCallback(async (
        database: string,
        measurement: string,
        connId?: string
    ): Promise<FieldInfo[]> => {
        const id = connId || connectionId;
        if (!id) {
            throw new Error('连接ID不能为空');
        }

        setLocalLoading(true);
        setLocalError(null);

        try {
            const result = await loadFields(id, database, measurement);
            return result;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            setLocalError(errorMessage);
            throw err;
        } finally {
            setLocalLoading(false);
        }
    }, [loadFields, connectionId]);

    /**
     * 获取标签列表
     */
    const getTagList = useCallback((
        database: string,
        measurement: string,
        connId?: string
    ): TagInfo[] => {
        const id = connId || connectionId;
        if (!id) return [];
        return getTags(id, database, measurement);
    }, [getTags, connectionId]);

    /**
     * 加载标签列表
     */
    const fetchTags = useCallback(async (
        database: string,
        measurement: string,
        connId?: string
    ): Promise<TagInfo[]> => {
        const id = connId || connectionId;
        if (!id) {
            throw new Error('连接ID不能为空');
        }

        setLocalLoading(true);
        setLocalError(null);

        try {
            const result = await loadTags(id, database, measurement);
            return result;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            setLocalError(errorMessage);
            throw err;
        } finally {
            setLocalLoading(false);
        }
    }, [loadTags, connectionId]);

    /**
     * 获取系列列表
     */
    const getSeriesList = useCallback((
        database: string,
        measurement?: string,
        connId?: string
    ): string[] => {
        const id = connId || connectionId;
        if (!id) return [];
        return getSeries(id, database, measurement);
    }, [getSeries, connectionId]);

    /**
     * 加载系列列表
     */
    const fetchSeries = useCallback(async (
        database: string,
        measurement?: string,
        limit?: number,
        connId?: string
    ): Promise<string[]> => {
        const id = connId || connectionId;
        if (!id) {
            throw new Error('连接ID不能为空');
        }

        setLocalLoading(true);
        setLocalError(null);

        try {
            const result = await loadSeries(id, database, measurement, limit);
            return result;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            setLocalError(errorMessage);
            throw err;
        } finally {
            setLocalLoading(false);
        }
    }, [loadSeries, connectionId]);

    /**
     * 获取数据库统计信息
     */
    const fetchDatabaseStats = useCallback(async (
        database: string,
        connId?: string
    ): Promise<any> => {
        const id = connId || connectionId;
        if (!id) {
            throw new Error('连接ID不能为空');
        }

        setLocalLoading(true);
        setLocalError(null);

        try {
            const result = await getDatabaseStats(id, database);
            return result;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            setLocalError(errorMessage);
            throw err;
        } finally {
            setLocalLoading(false);
        }
    }, [getDatabaseStats, connectionId]);

    /**
     * 刷新数据库结构
     */
    const refreshDatabaseStructure = useCallback(async (
        database?: string,
        connId?: string
    ): Promise<void> => {
        const id = connId || connectionId;
        if (!id) return;

        if (database) {
            clearDatabaseCache(id, database);
        } else {
            clearCache(id);
        }

        // 重新加载数据库列表
        await fetchDatabases(id);
    }, [clearCache, clearDatabaseCache, fetchDatabases, connectionId]);

    /**
     * 清除错误
     */
    const clearLocalError = useCallback(() => {
        setLocalError(null);
        clearError();
    }, [clearError]);

    /**
     * 组合加载状态
     */
    const isLoading = loadingDatabases || loadingMeasurements || loadingFields || loadingTags || localLoading;

    /**
     * 组合错误状态
     */
    const combinedError = error || localError;

    // 自动加载数据库列表
    useEffect(() => {
        if (connectionId && !databases[connectionId]) {
            fetchDatabases(connectionId).catch(console.error);
        }
    }, [connectionId, databases, fetchDatabases]);

    return {
        // 状态
        databases: getDatabases(),
        selectedDatabase: getCurrentDatabase(),
        isLoading,
        error: combinedError,

        // 方法
        fetchDatabases,
        addDatabase,
        deleteDatabase,
        selectDatabase,
        getMeasurementList,
        fetchMeasurements,
        getFieldList,
        fetchFields,
        getTagList,
        fetchTags,
        getSeriesList,
        fetchSeries,
        fetchDatabaseStats,
        refreshDatabaseStructure,
        clearLocalError
    };
};