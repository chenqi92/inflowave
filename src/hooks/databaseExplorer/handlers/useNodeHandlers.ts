import { useCallback } from 'react';
import type { TreeNodeData } from '@/components/database/TreeNodeRenderer';
import type { ContextMenuPosition } from '@/types/databaseExplorer';
import logger from '@/utils/logger';

interface UseNodeHandlersProps {
    setContextMenuTarget: (target: TreeNodeData | null) => void;
    setContextMenuOpen: (open: boolean) => void;
    setContextMenuPosition: (position: ContextMenuPosition) => void;
    contextMenuOpenRef: React.MutableRefObject<boolean>;
    buildCompleteTreeData: (forceRefresh?: boolean) => Promise<void>;
}

/**
 * Custom hook for handling tree node interactions
 */
export const useNodeHandlers = ({
    setContextMenuTarget,
    setContextMenuOpen,
    setContextMenuPosition,
    contextMenuOpenRef,
    buildCompleteTreeData,
}: UseNodeHandlersProps) => {
    // ============================================================================
    // Node Selection Handler
    // ============================================================================
    const handleNodeSelect = useCallback((node: any) => {
        if (node) {
            logger.info('选中节点:', node);
        }
    }, []);

    // ============================================================================
    // Node Context Menu Handler
    // ============================================================================
    const handleNodeContextMenu = useCallback((node: any, event: React.MouseEvent) => {
        event.preventDefault();
        setContextMenuPosition({
            x: event.clientX,
            y: event.clientY,
        });
        setContextMenuTarget(node);
        setContextMenuOpen(true);
        contextMenuOpenRef.current = true;
    }, [setContextMenuPosition, setContextMenuTarget, setContextMenuOpen, contextMenuOpenRef]);

    // ============================================================================
    // Tree Refresh Handler
    // ============================================================================
    const handleTreeRefresh = useCallback(() => {
        buildCompleteTreeData(true);
    }, [buildCompleteTreeData]);

    return {
        handleNodeSelect,
        handleNodeContextMenu,
        handleTreeRefresh,
    };
};

