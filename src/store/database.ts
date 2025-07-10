import { create } from 'zustand';
import type { DatabaseInfo, MeasurementInfo, FieldInfo, TagInfo } from '@/types';
import { DatabaseAPI } from '@/services/api';

interface DatabaseState {
  // 数据库列表
  databases: Record<string, DatabaseInfo[]>; // connectionId -> databases
  
  // 测量列表
  measurements: Record<string, MeasurementInfo[]>; // connectionId:database -> measurements
  
  // 字段信息
  fields: Record<string, FieldInfo[]>; // connectionId:database:measurement -> fields
  
  // 标签信息
  tags: Record<string, TagInfo[]>; // connectionId:database:measurement -> tags
  
  // 系列信息
  series: Record<string, string[]>; // connectionId:database:measurement -> series
  
  // 当前选中的数据库
  selectedDatabase: Record<string, string>; // connectionId -> database
  
  // 加载状态
  loadingDatabases: boolean;
  loadingMeasurements: boolean;
  loadingFields: boolean;
  loadingTags: boolean;
  
  // 错误状态
  error: string | null;

  // 数据库操作
  loadDatabases: (connectionId: string) => Promise<DatabaseInfo[]>;
  createDatabase: (connectionId: string, name: string) => Promise<void>;
  dropDatabase: (connectionId: string, name: string) => Promise<void>;
  setSelectedDatabase: (connectionId: string, database: string) => void;
  getSelectedDatabase: (connectionId: string) => string | undefined;

  // 测量操作
  loadMeasurements: (connectionId: string, database: string) => Promise<MeasurementInfo[]>;
  getMeasurements: (connectionId: string, database: string) => MeasurementInfo[];

  // 字段操作
  loadFields: (connectionId: string, database: string, measurement: string) => Promise<FieldInfo[]>;
  getFields: (connectionId: string, database: string, measurement: string) => FieldInfo[];

  // 标签操作
  loadTags: (connectionId: string, database: string, measurement: string) => Promise<TagInfo[]>;
  getTags: (connectionId: string, database: string, measurement: string) => TagInfo[];

  // 系列操作
  loadSeries: (connectionId: string, database: string, measurement?: string, limit?: number) => Promise<string[]>;
  getSeries: (connectionId: string, database: string, measurement?: string) => string[];

  // 统计信息
  getDatabaseStats: (connectionId: string, database: string) => Promise<any>;

  // 缓存管理
  clearCache: (connectionId?: string) => void;
  clearDatabaseCache: (connectionId: string, database?: string) => void;
  
  // 错误处理
  setError: (error: string | null) => void;
  clearError: () => void;
}

export const useDatabaseStore = create<DatabaseState>((set, get) => ({
  // 初始状态
  databases: {},
  measurements: {},
  fields: {},
  tags: {},
  series: {},
  selectedDatabase: {},
  loadingDatabases: false,
  loadingMeasurements: false,
  loadingFields: false,
  loadingTags: false,
  error: null,

  // 数据库操作
  loadDatabases: async (connectionId) => {
    set({ loadingDatabases: true, error: null });
    
    try {
      const databases = await DatabaseAPI.getDatabases(connectionId);
      
      set(state => ({
        databases: {
          ...state.databases,
          [connectionId]: databases,
        },
        loadingDatabases: false,
      }));

      return databases;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      set({ 
        loadingDatabases: false, 
        error: `加载数据库列表失败: ${errorMessage}` 
      });
      throw error;
    }
  },

  createDatabase: async (connectionId, name) => {
    try {
      await DatabaseAPI.createDatabase(connectionId, name);
      
      // 重新加载数据库列表
      await get().loadDatabases(connectionId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      set({ error: `创建数据库失败: ${errorMessage}` });
      throw error;
    }
  },

  dropDatabase: async (connectionId, name) => {
    try {
      await DatabaseAPI.dropDatabase(connectionId, name);
      
      // 清除相关缓存
      get().clearDatabaseCache(connectionId, name);
      
      // 重新加载数据库列表
      await get().loadDatabases(connectionId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      set({ error: `删除数据库失败: ${errorMessage}` });
      throw error;
    }
  },

  setSelectedDatabase: (connectionId, database) => {
    set(state => ({
      selectedDatabase: {
        ...state.selectedDatabase,
        [connectionId]: database,
      },
    }));
  },

  getSelectedDatabase: (connectionId) => {
    return get().selectedDatabase[connectionId];
  },

  // 测量操作
  loadMeasurements: async (connectionId, database) => {
    const key = `${connectionId}:${database}`;
    set({ loadingMeasurements: true, error: null });
    
    try {
      const measurements = await DatabaseAPI.getMeasurements(connectionId, database);
      
      set(state => ({
        measurements: {
          ...state.measurements,
          [key]: measurements,
        },
        loadingMeasurements: false,
      }));

      return measurements;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      set({ 
        loadingMeasurements: false, 
        error: `加载测量列表失败: ${errorMessage}` 
      });
      throw error;
    }
  },

  getMeasurements: (connectionId, database) => {
    const key = `${connectionId}:${database}`;
    return get().measurements[key] || [];
  },

  // 字段操作
  loadFields: async (connectionId, database, measurement) => {
    const key = `${connectionId}:${database}:${measurement}`;
    set({ loadingFields: true, error: null });
    
    try {
      const fields = await DatabaseAPI.getFieldKeys(connectionId, database, measurement);
      
      set(state => ({
        fields: {
          ...state.fields,
          [key]: fields,
        },
        loadingFields: false,
      }));

      return fields;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      set({ 
        loadingFields: false, 
        error: `加载字段信息失败: ${errorMessage}` 
      });
      throw error;
    }
  },

  getFields: (connectionId, database, measurement) => {
    const key = `${connectionId}:${database}:${measurement}`;
    return get().fields[key] || [];
  },

  // 标签操作
  loadTags: async (connectionId, database, measurement) => {
    const key = `${connectionId}:${database}:${measurement}`;
    set({ loadingTags: true, error: null });
    
    try {
      const tags = await DatabaseAPI.getTagKeys(connectionId, database, measurement);
      
      set(state => ({
        tags: {
          ...state.tags,
          [key]: tags,
        },
        loadingTags: false,
      }));

      return tags;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      set({ 
        loadingTags: false, 
        error: `加载标签信息失败: ${errorMessage}` 
      });
      throw error;
    }
  },

  getTags: (connectionId, database, measurement) => {
    const key = `${connectionId}:${database}:${measurement}`;
    return get().tags[key] || [];
  },

  // 系列操作
  loadSeries: async (connectionId, database, measurement, limit) => {
    const key = measurement 
      ? `${connectionId}:${database}:${measurement}`
      : `${connectionId}:${database}`;
    
    try {
      const series = await DatabaseAPI.getSeries(connectionId, database, measurement, limit);
      
      set(state => ({
        series: {
          ...state.series,
          [key]: series,
        },
      }));

      return series;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      set({ error: `加载系列信息失败: ${errorMessage}` });
      throw error;
    }
  },

  getSeries: (connectionId, database, measurement) => {
    const key = measurement 
      ? `${connectionId}:${database}:${measurement}`
      : `${connectionId}:${database}`;
    return get().series[key] || [];
  },

  // 统计信息
  getDatabaseStats: async (connectionId, database) => {
    try {
      return await DatabaseAPI.getDatabaseStats(connectionId, database);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      set({ error: `获取数据库统计信息失败: ${errorMessage}` });
      throw error;
    }
  },

  // 缓存管理
  clearCache: (connectionId) => {
    if (connectionId) {
      set(state => {
        const newDatabases = { ...state.databases };
        const newMeasurements = { ...state.measurements };
        const newFields = { ...state.fields };
        const newTags = { ...state.tags };
        const newSeries = { ...state.series };
        const newSelectedDatabase = { ...state.selectedDatabase };

        // 删除指定连接的所有缓存
        delete newDatabases[connectionId];
        delete newSelectedDatabase[connectionId];

        Object.keys(newMeasurements).forEach(key => {
          if (key.startsWith(`${connectionId}:`)) {
            delete newMeasurements[key];
          }
        });

        Object.keys(newFields).forEach(key => {
          if (key.startsWith(`${connectionId}:`)) {
            delete newFields[key];
          }
        });

        Object.keys(newTags).forEach(key => {
          if (key.startsWith(`${connectionId}:`)) {
            delete newTags[key];
          }
        });

        Object.keys(newSeries).forEach(key => {
          if (key.startsWith(`${connectionId}:`)) {
            delete newSeries[key];
          }
        });

        return {
          databases: newDatabases,
          measurements: newMeasurements,
          fields: newFields,
          tags: newTags,
          series: newSeries,
          selectedDatabase: newSelectedDatabase,
        };
      });
    } else {
      // 清除所有缓存
      set({
        databases: {},
        measurements: {},
        fields: {},
        tags: {},
        series: {},
        selectedDatabase: {},
      });
    }
  },

  clearDatabaseCache: (connectionId, database) => {
    if (database) {
      set(state => {
        const newMeasurements = { ...state.measurements };
        const newFields = { ...state.fields };
        const newTags = { ...state.tags };
        const newSeries = { ...state.series };

        const prefix = `${connectionId}:${database}`;

        Object.keys(newMeasurements).forEach(key => {
          if (key.startsWith(prefix)) {
            delete newMeasurements[key];
          }
        });

        Object.keys(newFields).forEach(key => {
          if (key.startsWith(prefix)) {
            delete newFields[key];
          }
        });

        Object.keys(newTags).forEach(key => {
          if (key.startsWith(prefix)) {
            delete newTags[key];
          }
        });

        Object.keys(newSeries).forEach(key => {
          if (key.startsWith(prefix)) {
            delete newSeries[key];
          }
        });

        return {
          measurements: newMeasurements,
          fields: newFields,
          tags: newTags,
          series: newSeries,
        };
      });
    } else {
      get().clearCache(connectionId);
    }
  },

  // 错误处理
  setError: (error) => {
    set({ error });
  },

  clearError: () => {
    set({ error: null });
  },
}));