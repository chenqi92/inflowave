import React from 'react';
import type { ItemInstance } from '@headless-tree/core';
import { ChevronRight, ChevronDown, Loader2, Shield } from 'lucide-react';
import { DatabaseIcon } from '@/components/common/DatabaseIcon';
import { TreeNodeType, normalizeNodeType, getIoTDBNodeBehavior, getNodeBehavior } from '@/types/tree';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
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
import { log } from '@/utils/logger';
import logger from '@/utils/logger';

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
  // 描述信息
  description?: string;
}

interface TreeNodeRendererProps {
  item: ItemInstance<TreeNodeData>;
  onNodeDoubleClick?: (nodeData: TreeNodeData, item: ItemInstance<TreeNodeData>) => void;
  onNodeToggle?: (nodeId: string) => void;
  onToggleExpand?: (nodeId: string, shouldExpand: boolean) => void;
  isDatabaseOpened?: (connectionId: string, database: string) => boolean;
  nodeRefsMap?: React.MutableRefObject<Map<string, HTMLElement>>;
  selectedItems: string[];
  nodeLoadingStates?: Map<string, boolean>;
  expandedNodeIds?: string[];
}

// ✅ 使用 React.memo 优化性能，Headless Tree 支持 memo
// 性能优化通过 Zustand 的细粒度订阅实现
// forwardRef 用于支持 ContextMenuTrigger 的 asChild 属性
const TreeNodeRendererInner = React.forwardRef<HTMLDivElement, TreeNodeRendererProps>(({
  item,
  onNodeDoubleClick,
  onNodeToggle,
  onToggleExpand,
  isDatabaseOpened,
  nodeRefsMap,
  selectedItems,
  nodeLoadingStates,
  expandedNodeIds = [],
}, forwardedRef) => {
  const data = item.getItemData();
  const level = item.getItemMeta().level;

  // 🔧 从 expandedNodeIds 数组中判断节点是否展开，而不是使用 item.isExpanded()
  // 这样可以确保当 expandedNodeIds 变化时，组件会重新渲染
  const isNodeExpanded = expandedNodeIds.includes(data.id);

  // 🔧 修复：从 props 读取选中状态，确保 React 重新渲染
  const isSelected = selectedItems.includes(data.id);

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

  // 动态计算 isActivated 状态，避免 openedDatabasesList 变化时触发整个树重新渲染
  let isActivated = data.isActivated ?? false;
  if ((data.nodeType === 'database' || data.nodeType === 'system_database') && isDatabaseOpened) {
    const connectionId = data.metadata?.connectionId || '';
    const database = data.name;
    isActivated = isDatabaseOpened(connectionId, database);
    log.debug(`[TreeNodeRenderer] 数据库节点 ${database} isActivated: ${isActivated}, connectionId: ${connectionId}`);
  } else if (data.nodeType === 'storage_group' && isDatabaseOpened) {
    // IoTDB 存储组节点 - 与 database 节点行为一致
    const connectionId = data.metadata?.connectionId || '';
    const storageGroup = data.name;
    isActivated = isDatabaseOpened(connectionId, storageGroup);
    log.debug(`[TreeNodeRenderer] 存储组节点 ${storageGroup} isActivated: ${isActivated}, connectionId: ${connectionId}`);
  } else if (data.nodeType === 'organization' && isDatabaseOpened) {
    // InfluxDB 2.x Organization 节点
    const connectionId = data.metadata?.connectionId || '';
    const organization = data.name;
    // 使用特殊格式检查 organization 是否打开
    isActivated = isDatabaseOpened(connectionId, `org:${organization}`);
    log.debug(`[TreeNodeRenderer] Organization 节点 ${organization} isActivated: ${isActivated}, connectionId: ${connectionId}`);
  } else if ((data.nodeType === 'bucket' || data.nodeType === 'system_bucket') && isDatabaseOpened) {
    // InfluxDB 2.x Bucket 节点
    const connectionId = data.metadata?.connectionId || '';
    const organization = data.metadata?.organization || '';
    const bucket = data.name;
    // 使用特殊格式检查 bucket 是否打开
    isActivated = isDatabaseOpened(connectionId, `bucket:${organization}/${bucket}`);
    log.debug(`[TreeNodeRenderer] Bucket 节点 ${bucket} isActivated: ${isActivated}, connectionId: ${connectionId}, organization: ${organization}`);
  }

  // 开发环境下添加渲染日志（INFO 级别，用于诊断）
  if (process.env.NODE_ENV === 'development') {
    // 🔧 对于数据库节点，isOpen 应该使用 isActivated（数据库是否被打开）
    // 对于其他节点，isOpen 使用 item.isExpanded()（节点是否展开）
    const isOpen = (data.nodeType === 'database' || data.nodeType === 'system_database')
      ? isActivated
      : item.isExpanded();

    const renderInfo = {
      nodeType: data.nodeType,
      name: data.name,
      id: data.id,
      isSelected,
      isOpen,
      connectionStatus,
      connectionError,
      databaseLoading,
      databaseError,
    };
    log.info(`[TreeNodeRenderer] [RENDER] ${data.nodeType}: ${data.name}`, renderInfo);
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
    // 🔧 连接节点的 loading 状态：需要同时考虑连接状态和子节点加载状态
    // 1. connectionStatus === 'connecting' 表示正在建立连接
    // 2. nodeLoadingStates?.get(data.id) 表示连接成功后正在加载子节点
    const loadingFromState = nodeLoadingStates?.get(data.id) ?? false;
    isLoading = connectionStatus === 'connecting' || loadingFromState;
    error = connectionError;

    // 添加调试日志
    if (isLoading) {
      log.debug(`[TreeNodeRenderer] 连接节点 ${data.id} (${data.name}) loading 状态: connectionStatus=${connectionStatus}, loadingFromState=${loadingFromState}`);
    }
  } else if (data.nodeType === 'database' || data.nodeType === 'system_database') {
    isLoading = databaseLoading ?? false;
    error = databaseError;

    // 添加调试日志
    if (isLoading) {
      log.debug(`[TreeNodeRenderer] 数据库节点 ${data.id} (${data.name}) 正在加载，databaseLoading=${databaseLoading}`);
    }
  } else {
    // 🔧 对于其他节点类型，使用 nodeLoadingStates
    const loadingFromState = nodeLoadingStates?.get(data.id) ?? false;
    isLoading = loadingFromState || data.isLoading || false;

    // 添加调试日志
    if (loadingFromState || isLoading) {
      log.debug(`[TreeNodeRenderer] 节点 ${data.id} (${data.name}) loading 状态: loadingFromState=${loadingFromState}, data.isLoading=${data.isLoading}, final isLoading=${isLoading}`);
    }
  }

  const isFavorite = data.isFavorite ?? false;
  const isSystem = data.isSystem ?? false;

  // 获取节点元数据
  const isContainer = data.metadata?.is_container === true;
  const normalizedNodeType = normalizeNodeType(data.nodeType) as TreeNodeType;

  // 使用通用的节点行为配置
  const behaviorConfig = React.useMemo(() => {
    return getNodeBehavior(normalizedNodeType, isContainer);
  }, [normalizedNodeType, isContainer]);

  // 调试日志：数据库节点的状态（仅在开发环境且状态变化时输出）
  // 注释掉以减少日志输出，需要时可以取消注释
  // if (normalizedNodeType === 'database' || normalizedNodeType === 'system_database') {
  //   logger.info(`🎨 [TreeNodeRenderer] 渲染数据库节点: ${data.name}`, {
  //     nodeType: normalizedNodeType,
  //     isActivated,
  //     isOpen: item.isExpanded(),
  //     willPassToIcon: normalizedNodeType.includes('database') ? isActivated : (isActivated || item.isExpanded())
  //   });
  // }

  // 判断是否显示展开箭头
  // 规则：
  // 1. 有打开/关闭状态的节点（连接、数据库）：关闭时不显示箭头，打开时才显示
  // 2. 其他节点：根据是否有子节点决定
  // 3. isLoading时总是显示箭头（用于显示loading图标）
  let hasChildren = false;

  if (behaviorConfig.hasActivationState) {
    // 有打开/关闭状态的节点（连接、数据库、organization、bucket）
    if (normalizedNodeType === 'connection') {
      // 连接节点：只有已连接时才显示箭头
      hasChildren = isLoading || (isConnected && (data.children === undefined || (data.children && data.children.length > 0)));
    } else {
      // 数据库/organization/bucket 节点：只有已激活时才显示箭头
      hasChildren = isLoading || (isActivated && (data.children === undefined || (data.children && data.children.length > 0)));
    }
  } else {
    // 没有打开/关闭状态的节点：根据是否有子节点决定
    // 如果节点配置为可展开，则显示箭头
    if (behaviorConfig.canExpand) {
      hasChildren = isLoading || data.children === undefined || !!(data.children && data.children.length > 0);
    } else {
      // 不可展开的节点不显示箭头
      hasChildren = false;
    }
  }

  // 添加调试日志：hasChildren 计算结果
  if (isLoading) {
    log.debug(`[TreeNodeRenderer] 节点 ${data.id} (${data.name}) hasChildren=${hasChildren}, isLoading=${isLoading}, children=${data.children === undefined ? 'undefined' : data.children?.length}`);
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

  // 从 treeProps 中提取 onClick，单独处理
  const { onClick: treeOnClick, ...restTreeProps } = treeProps;

  return (
    <div
      {...restTreeProps}
      data-node-id={data.id}
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
        // 只选中节点，不展开/收起
        log.debug(`[TreeNodeRenderer] 单击节点: ${data.name}, id: ${data.id}`);

        // 🔧 强制单选：先取消所有选中，再选中当前节点
        // 使用 item.getTree().setSelectedItems() 而不是 item.select()
        // 这样可以确保只有一个节点被选中
        const tree = item.getTree();
        tree.setSelectedItems([data.id]);

        log.debug(`[TreeNodeRenderer] 选中后 isSelected: ${item.isSelected()}`);
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

              // 🔧 直接更新 expandedNodeIds state，而不是调用 item.expand()/collapse()
              const shouldExpand = !isNodeExpanded;

              if (!shouldExpand) {
                // 收起节点
                log.debug(`[TreeNodeRenderer] 收起节点: ${data.id}`);
                onToggleExpand?.(data.id, false);
              } else {
                // 展开节点
                if (data.children === undefined && onNodeToggle) {
                  // 子节点未加载，先加载子节点
                  log.debug(`[TreeNodeRenderer] 加载并展开节点: ${data.id}`);
                  onNodeToggle(data.id);
                } else {
                  // 子节点已加载，直接展开
                  log.debug(`[TreeNodeRenderer] 展开节点: ${data.id}`);
                  onToggleExpand?.(data.id, true);
                }
              }
            }}
          >
            {isLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
            ) : isNodeExpanded ? (
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
            // 对于数据库节点和存储组节点，只使用 isActivated（是否被打开/激活）
            // 对于设备节点，不使用 isOpen 状态（始终使用同一个图标）
            // 对于其他容器节点，使用 isNodeExpanded（节点是否展开）
            normalizedNodeType.includes('database') || normalizedNodeType === 'storage_group'
              ? isActivated
              : normalizedNodeType === 'device'
              ? false  // 设备节点始终使用同一个图标
              : (isActivated || isNodeExpanded)
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
      {data.description ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className={cn(
              "text-sm flex-1 whitespace-nowrap overflow-hidden text-ellipsis",
              nodeFontStyle,
              nodeTextColor,
              error && "text-destructive",  // ✅ 使用订阅的 error 状态
              isSystemNode && "text-muted-foreground"
            )}>
              {data.name}
            </span>
          </TooltipTrigger>
          <TooltipContent side="right" align="start" className='max-w-sm'>
            <div className='space-y-1 p-1'>
              <div className='text-sm'>
                <span className='text-foreground'>{data.description}</span>
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      ) : (
        <span className={cn(
          "text-sm flex-1 whitespace-nowrap overflow-hidden text-ellipsis",
          nodeFontStyle,
          nodeTextColor,
          error && "text-destructive",  // ✅ 使用订阅的 error 状态
          isSystemNode && "text-muted-foreground"
        )}>
          {data.name}
        </span>
      )}

      {/* 收藏图标 */}
      {isFavorite && <FavoriteIndicator />}

      {/* 错误图标 */}
      {error && <ErrorIndicator message={error} />}  {/* ✅ 使用订阅的 error 状态 */}

      {/* 系统节点标识 */}
      {isSystemNode && <SystemNodeIndicator />}
    </div>
  );
});

TreeNodeRendererInner.displayName = 'TreeNodeRendererInner';

// 🔧 使用 React.memo 包装，自定义比较函数
export const TreeNodeRenderer = React.memo(TreeNodeRendererInner, (prevProps, nextProps) => {
  // 比较 selectedItems 数组
  const prevSelected = prevProps.selectedItems.includes(prevProps.item.getItemData().id);
  const nextSelected = nextProps.selectedItems.includes(nextProps.item.getItemData().id);

  // 如果选中状态改变，需要重新渲染
  if (prevSelected !== nextSelected) {
    return false;
  }

  // 比较 item 的数据
  const prevData = prevProps.item.getItemData();
  const nextData = nextProps.item.getItemData();

  // 如果节点 ID 不同，需要重新渲染
  if (prevData.id !== nextData.id) {
    return false;
  }

  // 🔧 比较展开状态 - 从 expandedNodeIds 数组中判断
  const prevExpanded = prevProps.expandedNodeIds?.includes(prevData.id) ?? false;
  const nextExpanded = nextProps.expandedNodeIds?.includes(nextData.id) ?? false;

  if (prevExpanded !== nextExpanded) {
    log.debug(`[TreeNodeRenderer] 节点 ${prevData.id} 展开状态改变: ${prevExpanded} -> ${nextExpanded}`);
    return false; // 展开状态改变，需要重新渲染
  }

  // 🔧 比较 expandedNodeIds 数组长度 - 如果长度变化，可能影响子节点的展开状态
  const prevExpandedLength = prevProps.expandedNodeIds?.length ?? 0;
  const nextExpandedLength = nextProps.expandedNodeIds?.length ?? 0;

  if (prevExpandedLength !== nextExpandedLength) {
    log.debug(`[TreeNodeRenderer] expandedNodeIds 长度改变: ${prevExpandedLength} -> ${nextExpandedLength}`);
    return false; // 数组长度改变，需要重新渲染
  }

  // 🔧 比较 nodeLoadingStates - 检查当前节点的 loading 状态是否改变
  const nodeId = prevData.id;
  const prevLoading = prevProps.nodeLoadingStates?.get(nodeId) ?? false;
  const nextLoading = nextProps.nodeLoadingStates?.get(nodeId) ?? false;

  if (prevLoading !== nextLoading) {
    log.debug(`[TreeNodeRenderer] 节点 ${nodeId} loading 状态改变: ${prevLoading} -> ${nextLoading}`);
    return false; // loading 状态改变，需要重新渲染
  }

  // 其他情况不重新渲染
  return true;
});

TreeNodeRenderer.displayName = 'TreeNodeRenderer';

export default TreeNodeRenderer;

