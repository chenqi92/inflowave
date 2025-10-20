import { useCallback } from 'react';
import { useConnectionStore } from '@/store/connection';
import { useFavoritesStore } from '@/store/favorites';
import { useOpenedDatabasesStore } from '@/stores/openedDatabasesStore';

/**
 * Custom hook for managing database explorer store integrations
 * 
 * CRITICAL: This hook uses the getState() pattern to avoid unnecessary re-renders
 * when store data changes. Only subscribe to data that should trigger re-renders.
 */
export const useDatabaseExplorerStores = () => {
    // ============================================================================
    // Connection Store - Subscribe to data only
    // ============================================================================
    const connections = useConnectionStore(state => state.connections);
    const activeConnectionId = useConnectionStore(state => state.activeConnectionId);
    const connectedConnectionIds = useConnectionStore(state => state.connectedConnectionIds);
    const connectionStatuses = useConnectionStore(state => state.connectionStatuses);

    // Get functions from store (these are stable references)
    const getConnection = useConnectionStore.getState().getConnection;
    const addConnection = useConnectionStore.getState().addConnection;
    const removeConnection = useConnectionStore.getState().removeConnection;
    const connectToDatabase = useConnectionStore.getState().connectToDatabase;
    const disconnectFromDatabase = useConnectionStore.getState().disconnectFromDatabase;
    const getConnectionStatus = useConnectionStore.getState().getConnectionStatus;
    const isConnectionConnected = useConnectionStore.getState().isConnectionConnected;

    // ============================================================================
    // Favorites Store - Subscribe to data only
    // ============================================================================
    const favorites = useFavoritesStore(state => state.favorites);

    // Get functions from store (these are stable references)
    const addFavorite = useFavoritesStore.getState().addFavorite;
    const removeFavorite = useFavoritesStore.getState().removeFavorite;
    const getFavorite = useFavoritesStore.getState().getFavorite;
    const getFavoritesByType = useFavoritesStore.getState().getFavoritesByType;
    const markAsAccessed = useFavoritesStore.getState().markAsAccessed;

    // 🔧 性能优化：Create stable isFavorite function using getState()
    // CRITICAL: Use getState() to access latest data without subscribing
    const isFavorite = useCallback((path: string) => {
        const currentFavorites = useFavoritesStore.getState().favorites;
        return currentFavorites.some(fav => fav.path === path);
    }, []); // Empty deps - function reference never changes

    // ============================================================================
    // Opened Databases Store
    // ============================================================================
    // CRITICAL: Only subscribe to openedDatabasesList, NOT openedDatabasesSet
    // This prevents re-renders when databases are opened/closed
    const openedDatabasesList = useOpenedDatabasesStore(state => state.openedDatabasesList);

    // Get functions from store (these are stable references)
    const openDatabase = useOpenedDatabasesStore.getState().openDatabase;
    const closeDatabase = useOpenedDatabasesStore.getState().closeDatabase;
    const closeAllDatabasesForConnection = useOpenedDatabasesStore.getState().closeAllDatabasesForConnection;

    // Create stable isDatabaseOpened function
    // CRITICAL: Use getState() to access latest data without subscribing
    const isDatabaseOpened = useCallback((connectionId: string, database: string) => {
        const key = `${connectionId}/${database}`;
        const openedDatabases = useOpenedDatabasesStore.getState().openedDatabases;
        const result = openedDatabases.has(key);
        return result;
    }, []); // Empty deps - function reference never changes

    // ============================================================================
    // Computed Values
    // ============================================================================
    const activeConnection = activeConnectionId
        ? getConnection(activeConnectionId)
        : null;
    
    const activeConnectionStatus = activeConnectionId
        ? connectionStatuses[activeConnectionId]
        : null;

    return {
        // Connection Store
        connections,
        activeConnectionId,
        connectedConnectionIds,
        connectionStatuses,
        getConnection,
        addConnection,
        removeConnection,
        connectToDatabase,
        disconnectFromDatabase,
        getConnectionStatus,
        isConnectionConnected,
        activeConnection,
        activeConnectionStatus,

        // Favorites Store
        favorites,
        addFavorite,
        removeFavorite,
        getFavorite,
        getFavoritesByType,
        markAsAccessed,
        isFavorite,

        // Opened Databases Store
        openedDatabasesList,
        openDatabase,
        closeDatabase,
        closeAllDatabasesForConnection,
        isDatabaseOpened,
    };
};

