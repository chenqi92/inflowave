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
}

export const useOpenedDatabasesStore = create<OpenedDatabasesState>((set, get) => ({
  openedDatabases: new Set<string>(),
  openedDatabasesList: [],

  openDatabase: (connectionId: string, database: string) => {
    const key = `${connectionId}/${database}`;
    set((state) => {
      const newOpenedDatabases = new Set(state.openedDatabases);
      newOpenedDatabases.add(key);
      
      // 提取数据库名称列表
      const newOpenedDatabasesList = Array.from(newOpenedDatabases)
        .map(k => {
          const parts = k.split('/');
          return parts.length >= 2 ? parts.slice(1).join('/') : '';
        })
        .filter(db => db !== '');

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
      
      // 提取数据库名称列表
      const newOpenedDatabasesList = Array.from(newOpenedDatabases)
        .map(k => {
          const parts = k.split('/');
          return parts.length >= 2 ? parts.slice(1).join('/') : '';
        })
        .filter(db => db !== '');

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
      
      // 提取数据库名称列表
      const newOpenedDatabasesList = Array.from(newOpenedDatabases)
        .map(k => {
          const parts = k.split('/');
          return parts.length >= 2 ? parts.slice(1).join('/') : '';
        })
        .filter(db => db !== '');

      console.log(`📁 [Store] 关闭连接 ${connectionId} 的所有数据库:`, {
        closedDatabases,
        remaining: Array.from(newOpenedDatabases),
        databasesList: newOpenedDatabasesList
      });

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
  }
}));
