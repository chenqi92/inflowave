import React from 'react';
import { NodeRendererProps } from 'react-arborist';
import { ChevronRight, ChevronDown, Loader2, Shield } from 'lucide-react';
import { DatabaseIcon } from '@/components/common/DatabaseIcon';
import { TreeNodeType, normalizeNodeType, getIoTDBNodeBehavior } from '@/types/tree';
import { cn } from '@/lib/utils';
import { useConnectionStore } from '@/store/connection';
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

interface TreeNodeRendererProps extends NodeRendererProps<TreeNodeData> {
  onNodeDoubleClick?: (nodeData: TreeNodeData, node: any) => void;
  isDatabaseOpened?: (connectionId: string, database: string) => boolean;
  nodeRefsMap?: React.MutableRefObject<Map<string, HTMLElement>>;
}

// 🔧 优化：使用 React.memo 避免不必要的重新渲染
// 只有当 node.data、node.isSelected、node.isOpen 发生变化时才重新渲染
export const TreeNodeRenderer: React.FC<TreeNodeRendererProps> = React.memo(({
  node,
  style,
  dragHandle,
  onNodeDoubleClick,
  isDatabaseOpened,
  nodeRefsMap,
}) => {
  const data = node.data;
  const isSelected = node.isSelected;

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

  // 开发环境下添加渲染日志（简化输出）
  if (process.env.NODE_ENV === 'development') {
    console.log(`🎨 [TreeNodeRenderer] ${data.nodeType}: ${data.name} (id: ${data.id})`);
  }

  // 动态计算 isActivated 状态，避免 openedDatabasesList 变化时触发整个树重新渲染
  let isActivated = data.isActivated ?? false;
  if ((data.nodeType === 'database' || data.nodeType === 'system_database') && isDatabaseOpened) {
    const connectionId = data.metadata?.connectionId || '';
    const database = data.name;
    isActivated = isDatabaseOpened(connectionId, database);
  }

  // 动态计算 isConnected 状态，避免 connectionStatuses 变化时触发整个树重新渲染
  // 使用 getState() 访问最新数据，避免订阅 connectionStatuses
  let isConnected = data.isConnected ?? false;
  if (data.nodeType === 'connection') {
    const connectionId = data.metadata?.connectionId || '';
    const connectionStatuses = useConnectionStore.getState().connectionStatuses;
    const status = connectionStatuses[connectionId];
    isConnected = status?.status === 'connected';
  }

  const isLoading = data.isLoading ?? false;
  const isFavorite = data.isFavorite ?? false;
  const isSystem = data.isSystem ?? false;

  // 调试日志：打印 loading 状态
  if (data.nodeType === 'connection' && isLoading) {
    console.log(`🔄 [TreeNodeRenderer] 连接节点 ${data.name} 显示 loading:`, {
      isLoading,
      dataIsLoading: data.isLoading,
      nodeId: node.id
    });
  }

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
  //     isOpen: node.isOpen,
  //     willPassToIcon: normalizedNodeType.includes('database') ? isActivated : (isActivated || node.isOpen)
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
  const nodeDepth = node.level;

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
    !!data.error
  );

  return (
    <div
      ref={(el) => {
        // 同时设置 dragHandle 和 nodeRefsMap
        if (typeof dragHandle === 'function') {
          dragHandle(el);
        } else if (dragHandle && 'current' in dragHandle) {
          (dragHandle as React.MutableRefObject<HTMLDivElement | null>).current = el;
        }
        registerNodeRef(el);
      }}
      style={style}
      className={cn(
        'flex items-center py-1.5 px-2 cursor-pointer rounded transition-colors select-none',
        'hover:bg-accent hover:text-accent-foreground',
        nodeOpacity,
        nodeBackground
      )}
      onDoubleClick={(e) => {
        // 双击时调用回调
        e.stopPropagation();
        console.log('🖱️🖱️ TreeNodeRenderer 双击事件:', node.id);
        onNodeDoubleClick?.(data, node);
      }}
    >
      {/* 展开/折叠图标 */}
      <div className="w-5 h-5 flex items-center justify-center mr-0.5">
        {hasChildren && (
          <div
            className="w-4 h-4 hover:bg-muted rounded cursor-pointer flex items-center justify-center transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              node.toggle();
            }}
          >
            {isLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
            ) : node.isOpen ? (
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
            // 对于其他容器节点，使用 node.isOpen（节点是否展开）
            normalizedNodeType.includes('database')
              ? isActivated
              : (isActivated || node.isOpen)
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
        data.error && "text-destructive",
        isSystemNode && "text-muted-foreground"
      )}>
        {data.name}
      </span>

      {/* 收藏图标 */}
      {isFavorite && <FavoriteIndicator />}

      {/* 错误图标 */}
      {data.error && <ErrorIndicator message={data.error} />}

      {/* 系统节点标识 */}
      {isSystemNode && <SystemNodeIndicator />}
    </div>
  );
}, (prevProps, nextProps) => {
  // 🔧 优化：自定义比较函数，只有关键属性变化时才重新渲染
  // 这样可以避免父组件重新渲染时，所有子节点都重新渲染
  const prevData = prevProps.node.data;
  const nextData = nextProps.node.data;

  // 检查节点数据是否变化
  if (
    prevData.id !== nextData.id ||
    prevData.name !== nextData.name ||
    prevData.nodeType !== nextData.nodeType ||
    prevData.isLoading !== nextData.isLoading ||
    prevData.error !== nextData.error ||
    prevData.isFavorite !== nextData.isFavorite ||
    prevData.isConnected !== nextData.isConnected ||
    prevData.children !== nextData.children // 检查 children 引用是否变化
  ) {
    return false; // 需要重新渲染
  }

  // 检查节点状态是否变化
  if (
    prevProps.node.isSelected !== nextProps.node.isSelected ||
    prevProps.node.isOpen !== nextProps.node.isOpen
  ) {
    return false; // 需要重新渲染
  }

  // 🔧 修复4：检查 isDatabaseOpened 函数引用是否变化
  // 注意：我们不比较函数的返回值，因为那会导致每次都重新渲染
  // 我们只比较函数引用本身
  if (prevProps.isDatabaseOpened !== nextProps.isDatabaseOpened) {
    return false; // 需要重新渲染
  }

  // 检查其他 props 是否变化
  if (
    prevProps.style !== nextProps.style ||
    prevProps.dragHandle !== nextProps.dragHandle ||
    prevProps.onNodeDoubleClick !== nextProps.onNodeDoubleClick
  ) {
    return false; // 需要重新渲染
  }

  // 其他情况不需要重新渲染
  return true;
});

export default TreeNodeRenderer;

