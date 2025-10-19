import React from 'react';
import type { ItemInstance } from '@headless-tree/core';
import { ChevronRight, ChevronDown, Loader2, Shield } from 'lucide-react';
import { DatabaseIcon } from '@/components/common/DatabaseIcon';
import { TreeNodeType, normalizeNodeType, getIoTDBNodeBehavior } from '@/types/tree';
import { cn } from '@/lib/utils';
import { useConnectionStore } from '@/store/connection';
import {
  useTreeStatusStore,
  selectConnectionStatus,
  selectConnectionError,
  selectDatabaseLoadingState,
  selectDatabaseError,
} from '@/stores/treeStatusStore';
import {
  getNodeTextColor,
  getNodeIconColor,
  getNodeFontStyle,
  isSystemManagementNode,
  getNodeOpacity,
  getNodeBackgroundStyle,
} from '@/utils/treeNodeStyles';
import {
  SystemNodeIndicator,
  FavoriteIndicator,
  ErrorIndicator,
} from './NodeStatusIndicator';
import { log, logger } from '@/utils/logger';

export interface TreeNodeData {
  id: string;
  name: string;
  nodeType: TreeNodeType;
  isSystem?: boolean;
  isLoading?: boolean;
  isActivated?: boolean;
  metadata?: Record<string, any>;
  dbType?: string;
  isConnected?: boolean;
  children?: TreeNodeData[];
  // 错误状态
  error?: string;
  errorType?: 'connection' | 'database' | 'loading';
  // 收藏状态
  isFavorite?: boolean;
}

interface TreeNodeRendererProps {
  item: ItemInstance<TreeNodeData>;
  onNodeDoubleClick?: (nodeData: TreeNodeData, item: ItemInstance<TreeNodeData>) => void;
  isDatabaseOpened?: (connectionId: string, database: string) => boolean;
  nodeRefsMap?: React.MutableRefObject<Map<string, HTMLElement>>;
}

// ✅ 使用 React.memo 优化性能，Headless Tree 支持 memo
// 性能优化通过 Zustand 的细粒度订阅实现
// forwardRef 用于支持 ContextMenuTrigger 的 asChild 属性
export const TreeNodeRenderer = React.forwardRef<HTMLDivElement, TreeNodeRendererProps>(({
  item,
  onNodeDoubleClick,
  isDatabaseOpened,
  nodeRefsMap,
}, forwardedRef) => {
  const data = item.getItemData();
  const isSelected = item.isSelected();
  const level = item.getItemMeta().level;

  // ✅ 细粒度订阅：只订阅当前节点的状态
  const connectionId = data.metadata?.connectionId || '';
  const database = data.metadata?.database || data.metadata?.databaseName || data.name || '';

  // 连接节点：订阅连接状态和错误
  // 使用 useMemo 稳定选择器函数引用
  const connectionStatusSelector = React.useMemo(
    () => data.nodeType === 'connection' && connectionId
      ? selectConnectionStatus(connectionId)
      : () => undefined,
    [data.nodeType, connectionId]
  );
  const connectionStatus = useTreeStatusStore(connectionStatusSelector);

  const connectionErrorSelector = React.useMemo(
    () => data.nodeType === 'connection' && connectionId
      ? selectConnectionError(connectionId)
      : () => undefined,
    [data.nodeType, connectionId]
  );
  const connectionError = useTreeStatusStore(connectionErrorSelector);

  // 数据库节点：订阅数据库加载状态和错误
  const databaseLoadingSelector = React.useMemo(
    () => (data.nodeType === 'database' || data.nodeType === 'system_database') && connectionId && database
      ? selectDatabaseLoadingState(connectionId, database)
      : () => undefined,
    [data.nodeType, connectionId, database]
  );
  const databaseLoading = useTreeStatusStore(databaseLoadingSelector);

  const databaseErrorSelector = React.useMemo(
    () => (data.nodeType === 'database' || data.nodeType === 'system_database') && connectionId && database
      ? selectDatabaseError(connectionId, database)
      : () => undefined,
    [data.nodeType, connectionId, database]
  );
  const databaseError = useTreeStatusStore(databaseErrorSelector);

  // 注册节点元素到 nodeRefsMap（用于错误提示定位）
  const registerNodeRef = React.useCallback((el: HTMLDivElement | null) => {
    if (!nodeRefsMap || !el) return;

    const nodeType = data.nodeType;
    const connectionId = data.metadata?.connectionId;

    // 为连接节点注册
    if (nodeType === 'connection' && connectionId) {
      nodeRefsMap.current.set(`connection-${connectionId}`, el);
    }
    // 为数据库节点注册
    else if ((nodeType === 'database' || nodeType === 'system_database') && connectionId) {
      const dbKey = `database|${connectionId}|${data.name}`;
      nodeRefsMap.current.set(dbKey, el);
    }
  }, [nodeRefsMap, data.nodeType, data.metadata?.connectionId, data.name]);

  // 开发环境下添加渲染日志（INFO 级别，用于诊断）
  if (process.env.NODE_ENV === 'development') {
    const renderInfo = {
      nodeType: data.nodeType,
      name: data.name,
      id: data.id,
      isSelected,
      isOpen: item.isExpanded(),
      connectionStatus,
      connectionError,
      databaseLoading,
      databaseError,
    };
    log.info(`[TreeNodeRenderer] [RENDER] ${data.nodeType}: ${data.name}`, renderInfo);
  }

  // 动态计算 isActivated 状态，避免 openedDatabasesList 变化时触发整个树重新渲染
  let isActivated = data.isActivated ?? false;
  if ((data.nodeType === 'database' || data.nodeType === 'system_database') && isDatabaseOpened) {
    const connectionId = data.metadata?.connectionId || '';
    const database = data.name;
    isActivated = isDatabaseOpened(connectionId, database);
  }

  // ✅ 使用订阅的状态计算 isConnected
  let isConnected = data.isConnected ?? false;
  if (data.nodeType === 'connection') {
    isConnected = connectionStatus === 'connected';
  }

  // ✅ 使用订阅的状态计算 isLoading 和 error
  let isLoading = data.isLoading ?? false;
  let error = data.error;

  if (data.nodeType === 'connection') {
    isLoading = connectionStatus === 'connecting';
    error = connectionError;
  } else if (data.nodeType === 'database' || data.nodeType === 'system_database') {
    isLoading = databaseLoading ?? false;
    error = databaseError;
  }

  const isFavorite = data.isFavorite ?? false;
  const isSystem = data.isSystem ?? false;

  // 获取节点元数据
  const isContainer = data.metadata?.is_container === true;
  const normalizedNodeType = normalizeNodeType(data.nodeType) as TreeNodeType;
  const behaviorConfig = getIoTDBNodeBehavior(normalizedNodeType, isContainer);

  // 调试日志：数据库节点的状态（仅在开发环境且状态变化时输出）
  // 注释掉以减少日志输出，需要时可以取消注释
  // if (normalizedNodeType === 'database' || normalizedNodeType === 'system_database') {
  //   console.log(`🎨 [TreeNodeRenderer] 渲染数据库节点: ${data.name}`, {
  //     nodeType: normalizedNodeType,
  //     isActivated,
  //     isOpen: item.isExpanded(),
  //     willPassToIcon: normalizedNodeType.includes('database') ? isActivated : (isActivated || item.isExpanded())
  //   });
  // }

  // 判断是否显示展开箭头
  // children === undefined: 未加载，可能有子节点
  // children.length > 0: 已加载且有子节点，显示箭头
  // children.length === 0: 已加载但为空，不显示箭头
  let hasChildren = false;
  if (normalizedNodeType === 'connection') {
    // 连接节点：只有已连接才显示箭头
    hasChildren = isConnected && (data.children === undefined || (data.children && data.children.length > 0));
  } else if (normalizedNodeType === 'database' || normalizedNodeType === 'system_database') {
    // 数据库节点：只有当 children 是非空数组时才显示箭头（未打开时不显示箭头）
    hasChildren = !!(data.children && data.children.length > 0);
  } else {
    // 其他节点：未加载(undefined)或有子节点时显示箭头
    hasChildren = data.children === undefined || !!(data.children && data.children.length > 0);
  }

  // 计算节点层级深度（用于视觉层级优化）
  const nodeDepth = level;

  // 判断是否为系统管理节点
  const isSystemNode = isSystemManagementNode(normalizedNodeType, isSystem);

  // 获取节点样式
  const nodeOpacity = getNodeOpacity(nodeDepth, isSystem);
  const nodeFontStyle = getNodeFontStyle(normalizedNodeType, isSystem);
  const nodeTextColor = getNodeTextColor(normalizedNodeType, isConnected, isActivated);
  const nodeIconColor = getNodeIconColor(normalizedNodeType, isSystem, isConnected, isActivated);
  const nodeBackground = getNodeBackgroundStyle(
    normalizedNodeType,
    isSystem,
    isSelected,
    !!error  // ✅ 使用订阅的 error 状态
  );

  // 计算缩进样式
  const indentStyle = { paddingLeft: `${level * 20}px` };

  // 获取 Headless Tree 的 props
  const treeProps = item.getProps();

  return (
    <div
      {...treeProps}
      ref={(el) => {
        // 合并所有 ref：forwardedRef、nodeRefsMap、treeProps.ref
        if (typeof forwardedRef === 'function') {
          forwardedRef(el);
        } else if (forwardedRef && 'current' in forwardedRef) {
          (forwardedRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
        }
        registerNodeRef(el);
        // 调用 treeProps 的 ref
        if (treeProps.ref) {
          if (typeof treeProps.ref === 'function') {
            treeProps.ref(el);
          } else if ('current' in treeProps.ref) {
            (treeProps.ref as React.MutableRefObject<HTMLDivElement | null>).current = el;
          }
        }
      }}
      style={indentStyle}
      className={cn(
        'flex items-center py-1.5 px-2 cursor-pointer rounded transition-colors select-none',
        'hover:bg-accent hover:text-accent-foreground',
        nodeOpacity,
        nodeBackground
      )}
      onClick={(e) => {
        // 先调用 treeProps 的 onClick（处理选中状态）
        treeProps.onClick?.(e);
      }}
      onDoubleClick={(e) => {
        // 先调用 treeProps 的 onDoubleClick
        treeProps.onDoubleClick?.(e);
        // 然后调用自定义回调
        onNodeDoubleClick?.(data, item);
      }}
    >
      {/* 展开/折叠图标 */}
      <div className="w-5 h-5 flex items-center justify-center mr-0.5">
        {hasChildren && (
          <div
            className="w-4 h-4 hover:bg-muted rounded cursor-pointer flex items-center justify-center transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              if (item.isExpanded()) {
                item.collapse();
              } else {
                item.expand();
              }
            }}
          >
            {isLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
            ) : item.isExpanded() ? (
              <ChevronDown className="w-3.5 h-3.5 text-foreground" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-foreground" />
            )}
          </div>
        )}
      </div>

      {/* 节点图标 */}
      <div className={cn(
        "mr-2.5 flex items-center justify-center w-5 h-5 relative",
        nodeIconColor
      )}>
        <DatabaseIcon
          nodeType={normalizedNodeType}
          isOpen={
            // 对于数据库节点，只使用 isActivated（数据库是否被打开）
            // 对于其他容器节点，使用 item.isExpanded()（节点是否展开）
            normalizedNodeType.includes('database')
              ? isActivated
              : (isActivated || item.isExpanded())
          }
          isConnected={isConnected}
          dbType={data.dbType}
          size={18}
          className="flex-shrink-0"
          title={`${data.name} (${normalizedNodeType})`}
        />
        {/* 系统节点添加盾牌图标叠加 */}
        {isSystemNode && (
          <Shield className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 text-orange-500 dark:text-orange-400 bg-background rounded-full p-0.5 shadow-sm" />
        )}
      </div>

      {/* 节点名称 */}
      <span className={cn(
        "text-sm truncate flex-1",
        nodeFontStyle,
        nodeTextColor,
        error && "text-destructive",  // ✅ 使用订阅的 error 状态
        isSystemNode && "text-muted-foreground"
      )}>
        {data.name}
      </span>

      {/* 收藏图标 */}
      {isFavorite && <FavoriteIndicator />}

      {/* 错误图标 */}
      {error && <ErrorIndicator message={error} />}  {/* ✅ 使用订阅的 error 状态 */}

      {/* 系统节点标识 */}
      {isSystemNode && <SystemNodeIndicator />}
    </div>
  );
});

TreeNodeRenderer.displayName = 'TreeNodeRenderer';

export default TreeNodeRenderer;

