import { create } from 'zustand';

interface OpenedDatabasesState {
  openedDatabases: Set<string>;
  openedDatabasesList: string[];

  // Actions
  openDatabase: (connectionId: string, database: string) => void;
  closeDatabase: (connectionId: string, database: string) => void;
  closeAllDatabasesForConnection: (connectionId: string) => void;
  isDatabaseOpened: (connectionId: string, database: string) => boolean;
  getOpenedDatabasesList: () => string[];

  // InfluxDB 2.x Organization/Bucket support
  openOrganization: (connectionId: string, organization: string) => void;
  closeOrganization: (connectionId: string, organization: string) => void;
  isOrganizationOpened: (connectionId: string, organization: string) => boolean;
  openBucket: (connectionId: string, organization: string, bucket: string) => void;
  closeBucket: (connectionId: string, organization: string, bucket: string) => void;
  isBucketOpened: (connectionId: string, organization: string, bucket: string) => boolean;
}

export const useOpenedDatabasesStore = create<OpenedDatabasesState>((set, get) => ({
  openedDatabases: new Set<string>(),
  openedDatabasesList: [],

  openDatabase: (connectionId: string, database: string) => {
    const key = `${connectionId}/${database}`;
    set((state) => {
      const newOpenedDatabases = new Set(state.openedDatabases);
      newOpenedDatabases.add(key);

      // 🔧 修复：openedDatabasesList 应该保存完整的 "connectionId/database" 格式
      // 而不是只保存数据库名称，这样才能在 MultiConnectionTreeView 中正确解析
      const newOpenedDatabasesList = Array.from(newOpenedDatabases);

      // 始终打印日志，方便调试
      console.log(`📂 [Store] 打开数据库: ${key}`, {
        before: Array.from(state.openedDatabases),
        after: Array.from(newOpenedDatabases),
        databasesList: newOpenedDatabasesList
      });

      return {
        openedDatabases: newOpenedDatabases,
        openedDatabasesList: newOpenedDatabasesList
      };
    });
  },

  closeDatabase: (connectionId: string, database: string) => {
    const key = `${connectionId}/${database}`;
    set((state) => {
      const newOpenedDatabases = new Set(state.openedDatabases);
      const wasDeleted = newOpenedDatabases.delete(key);

      // 🔧 修复：openedDatabasesList 应该保存完整的 "connectionId/database" 格式
      const newOpenedDatabasesList = Array.from(newOpenedDatabases);

      // 始终打印日志，方便调试
      console.log(`📁 [Store] 关闭数据库: ${key}`, {
        wasDeleted,
        before: Array.from(state.openedDatabases),
        after: Array.from(newOpenedDatabases),
        databasesList: newOpenedDatabasesList
      });

      return {
        openedDatabases: newOpenedDatabases,
        openedDatabasesList: newOpenedDatabasesList
      };
    });
  },

  closeAllDatabasesForConnection: (connectionId: string) => {
    set((state) => {
      const newOpenedDatabases = new Set(state.openedDatabases);
      const closedDatabases: string[] = [];

      for (const key of newOpenedDatabases) {
        if (key.startsWith(`${connectionId}/`)) {
          newOpenedDatabases.delete(key);
          closedDatabases.push(key);
        }
      }

      // 🔧 修复：openedDatabasesList 应该保存完整的 "connectionId/database" 格式
      const newOpenedDatabasesList = Array.from(newOpenedDatabases);

      if (import.meta.env.DEV && import.meta.env.VITE_DEBUG_RENDERS === 'true') {
        console.log(`📁 [Store] 关闭连接 ${connectionId} 的所有数据库:`, {
          closedDatabases,
          remaining: Array.from(newOpenedDatabases),
          databasesList: newOpenedDatabasesList
        });
      }

      return {
        openedDatabases: newOpenedDatabases,
        openedDatabasesList: newOpenedDatabasesList
      };
    });
  },

  isDatabaseOpened: (connectionId: string, database: string) => {
    const key = `${connectionId}/${database}`;
    return get().openedDatabases.has(key);
  },

  getOpenedDatabasesList: () => {
    return get().openedDatabasesList;
  },

  // InfluxDB 2.x Organization support
  openOrganization: (connectionId: string, organization: string) => {
    const key = `${connectionId}/org:${organization}`;
    set((state) => {
      const newOpenedDatabases = new Set(state.openedDatabases);
      newOpenedDatabases.add(key);
      const newOpenedDatabasesList = Array.from(newOpenedDatabases);

      console.log(`📂 [Store] 打开 Organization: ${key}`, {
        before: Array.from(state.openedDatabases),
        after: Array.from(newOpenedDatabases),
      });

      return {
        openedDatabases: newOpenedDatabases,
        openedDatabasesList: newOpenedDatabasesList
      };
    });
  },

  closeOrganization: (connectionId: string, organization: string) => {
    const key = `${connectionId}/org:${organization}`;
    set((state) => {
      const newOpenedDatabases = new Set(state.openedDatabases);
      const wasDeleted = newOpenedDatabases.delete(key);

      // 同时关闭该 organization 下的所有 bucket
      const bucketPrefix = `${connectionId}/bucket:${organization}/`;
      for (const dbKey of newOpenedDatabases) {
        if (dbKey.startsWith(bucketPrefix)) {
          newOpenedDatabases.delete(dbKey);
        }
      }

      const newOpenedDatabasesList = Array.from(newOpenedDatabases);

      console.log(`📁 [Store] 关闭 Organization: ${key}`, {
        wasDeleted,
        before: Array.from(state.openedDatabases),
        after: Array.from(newOpenedDatabases),
      });

      return {
        openedDatabases: newOpenedDatabases,
        openedDatabasesList: newOpenedDatabasesList
      };
    });
  },

  isOrganizationOpened: (connectionId: string, organization: string) => {
    const key = `${connectionId}/org:${organization}`;
    return get().openedDatabases.has(key);
  },

  // InfluxDB 2.x Bucket support
  openBucket: (connectionId: string, organization: string, bucket: string) => {
    const key = `${connectionId}/bucket:${organization}/${bucket}`;
    set((state) => {
      const newOpenedDatabases = new Set(state.openedDatabases);
      newOpenedDatabases.add(key);
      const newOpenedDatabasesList = Array.from(newOpenedDatabases);

      console.log(`📂 [Store] 打开 Bucket: ${key}`, {
        before: Array.from(state.openedDatabases),
        after: Array.from(newOpenedDatabases),
      });

      return {
        openedDatabases: newOpenedDatabases,
        openedDatabasesList: newOpenedDatabasesList
      };
    });
  },

  closeBucket: (connectionId: string, organization: string, bucket: string) => {
    const key = `${connectionId}/bucket:${organization}/${bucket}`;
    set((state) => {
      const newOpenedDatabases = new Set(state.openedDatabases);
      const wasDeleted = newOpenedDatabases.delete(key);
      const newOpenedDatabasesList = Array.from(newOpenedDatabases);

      console.log(`📁 [Store] 关闭 Bucket: ${key}`, {
        wasDeleted,
        before: Array.from(state.openedDatabases),
        after: Array.from(newOpenedDatabases),
      });

      return {
        openedDatabases: newOpenedDatabases,
        openedDatabasesList: newOpenedDatabasesList
      };
    });
  },

  isBucketOpened: (connectionId: string, organization: string, bucket: string) => {
    const key = `${connectionId}/bucket:${organization}/${bucket}`;
    return get().openedDatabases.has(key);
  },
}));
