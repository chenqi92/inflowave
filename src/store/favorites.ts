import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface FavoriteItem {
  id: string;
  type: 'connection' | 'database' | 'table' | 'field' | 'tag';
  name: string;
  path: string; // 完整路径，如 "connection1/database1/table1/field1"
  connectionId: string;
  database?: string;
  table?: string;
  description?: string;
  icon?: string;
  createdAt: Date;
  lastAccessed?: Date;
  accessCount: number;
}

interface FavoritesState {
  favorites: FavoriteItem[];
  
  // 操作方法
  addFavorite: (item: Omit<FavoriteItem, 'id' | 'createdAt' | 'accessCount'>) => void;
  removeFavorite: (id: string) => void;
  updateFavorite: (id: string, updates: Partial<FavoriteItem>) => void;
  isFavorite: (path: string) => boolean;
  getFavorite: (path: string) => FavoriteItem | undefined;
  getFavoritesByType: (type: FavoriteItem['type']) => FavoriteItem[];
  getFavoritesByConnection: (connectionId: string) => FavoriteItem[];
  markAsAccessed: (id: string) => void;
  clearFavorites: () => void;
  exportFavorites: () => FavoriteItem[];
  importFavorites: (favorites: FavoriteItem[]) => void;
}

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      favorites: [],

      addFavorite: (item) => {
        const { favorites } = get();
        
        // 检查是否已存在相同路径的收藏
        if (favorites.some(fav => fav.path === item.path)) {
          console.warn('收藏项已存在:', item.path);
          return;
        }

        const newFavorite: FavoriteItem = {
          ...item,
          id: `fav_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          createdAt: new Date(),
          accessCount: 0
        };

        set({
          favorites: [...favorites, newFavorite]
        });
      },

      removeFavorite: (id) => {
        set({
          favorites: get().favorites.filter(fav => fav.id !== id)
        });
      },

      updateFavorite: (id, updates) => {
        set({
          favorites: get().favorites.map(fav =>
            fav.id === id ? { ...fav, ...updates } : fav
          )
        });
      },

      isFavorite: (path) => {
        return get().favorites.some(fav => fav.path === path);
      },

      getFavorite: (path) => {
        return get().favorites.find(fav => fav.path === path);
      },

      getFavoritesByType: (type) => {
        return get().favorites.filter(fav => fav.type === type)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      },

      getFavoritesByConnection: (connectionId) => {
        return get().favorites.filter(fav => fav.connectionId === connectionId)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      },

      markAsAccessed: (id) => {
        const favorite = get().favorites.find(fav => fav.id === id);
        if (favorite) {
          set({
            favorites: get().favorites.map(fav =>
              fav.id === id
                ? {
                    ...fav,
                    lastAccessed: new Date(),
                    accessCount: fav.accessCount + 1
                  }
                : fav
            )
          });
        }
      },

      clearFavorites: () => {
        set({ favorites: [] });
      },

      exportFavorites: () => {
        return get().favorites;
      },

      importFavorites: (favorites) => {
        set({ favorites });
      }
    }),
    {
      name: 'inflowave-favorites-store',
      partialize: (state) => ({
        favorites: state.favorites
      })
    }
  )
);

// 工具函数
export const favoritesUtils = {
  // 根据路径生成收藏项
  createFavoriteFromPath: (path: string, connectionId: string, connections: any[]): Omit<FavoriteItem, 'id' | 'createdAt' | 'accessCount'> | null => {
    const parts = path.split('/');
    const connection = connections.find(c => c.id === connectionId);
    
    if (!connection) return null;

    if (parts.length === 1) {
      // 连接级别
      return {
        type: 'connection',
        name: connection.name,
        path,
        connectionId,
        description: `${connection.host}:${connection.port}`
      };
    } else if (parts.length === 2) {
      // 数据库级别
      return {
        type: 'database',
        name: parts[1],
        path,
        connectionId,
        database: parts[1],
        description: `数据库 - ${connection.name}`
      };
    } else if (parts.length === 3) {
      // 表级别
      return {
        type: 'table',
        name: parts[2],
        path,
        connectionId,
        database: parts[1],
        table: parts[2],
        description: `表 - ${parts[1]}.${parts[2]}`
      };
    } else if (parts.length === 4) {
      // 字段或标签级别
      const isTag = path.includes('/tags/');
      return {
        type: isTag ? 'tag' : 'field',
        name: parts[3],
        path,
        connectionId,
        database: parts[1],
        table: parts[2],
        description: `${isTag ? '标签' : '字段'} - ${parts[1]}.${parts[2]}.${parts[3]}`
      };
    }

    return null;
  },

  // 生成收藏项的显示图标
  getFavoriteIcon: (type: FavoriteItem['type']) => {
    switch (type) {
      case 'connection': return 'Link';
      case 'database': return 'Database';
      case 'table': return 'Table';
      case 'field': return 'Hash';
      case 'tag': return 'Tags';
      default: return 'Star';
    }
  },

  // 生成收藏项的颜色
  getFavoriteColor: (type: FavoriteItem['type']) => {
    switch (type) {
      case 'connection': return 'text-blue-600';
      case 'database': return 'text-purple-600';
      case 'table': return 'text-green-600';
      case 'field': return 'text-orange-600';
      case 'tag': return 'text-pink-600';
      default: return 'text-gray-600';
    }
  }
};