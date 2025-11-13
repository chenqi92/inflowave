/**
 * UnifiedContextMenu - 统一的数据库浏览器右键菜单组件
 *
 * 基于 shadcn/ui ContextMenu 实现，支持所有节点类型的右键菜单
 * 完全替代 DatabaseExplorerContextMenu、TreeContextMenu、DatabaseContextMenu、TableContextMenu
 */

import React, { useState, useRef, useEffect } from 'react';
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuTrigger,
    ContextMenuLabel,
    ContextMenuSub,
    ContextMenuSubContent,
    ContextMenuSubTrigger,
    ContextMenuShortcut,
} from '@/components/ui/context-menu';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import {
    Copy,
    RefreshCw,
    Settings,
    Trash2,
    Plus,
    Info,
    Clock,
    Star,
    StarOff,
    Edit,
    BarChart,
    Tags,
    FileText,
    Table,
    Eye,
    Activity,
    FolderOpen,
    FolderClosed,
    FolderX,
    Search,
    Code,
    Filter,
    TrendingUp,
    Download,
    Upload,
    Link,
    Unlink,
    FileStack,
    Database,
} from 'lucide-react';
import {TreeNodeData} from './TreeNodeRenderer';
import {useMenuTranslation} from '@/hooks/useTranslation';
import {useConnectionStore} from '@/store/connection';

export interface UnifiedContextMenuProps {
    children: React.ReactNode;
    node: TreeNodeData;
    onAction: (action: string, node: TreeNodeData) => void;
    isDatabaseOpened?: (connectionId: string, database: string) => boolean;
    isFavorite?: (path: string) => boolean;
    disabled?: boolean;
}

/**
 * 统一的上下文菜单组件
 * 🔧 使用 React.memo 优化，避免不必要的重新渲染
 */
export const UnifiedContextMenu = React.memo<UnifiedContextMenuProps>(({
                                                                           children,
                                                                           node,
                                                                           onAction,
                                                                           isDatabaseOpened,
                                                                           isFavorite,
                                                                           disabled = false,
                                                                       }) => {
    const {t} = useMenuTranslation();

    // 🔧 从 store 实时获取连接状态
    const connectionStatuses = useConnectionStore(state => state.connectionStatuses);

    // 状态管理：用于控制确认对话框的显示
    const [confirmDialog, setConfirmDialog] = useState<{
        action: string;
        position: { x: number; y: number };
    } | null>(null);
    const [loading, setLoading] = useState(false);
    const confirmDialogRef = useRef<HTMLDivElement>(null);

    // 记录鼠标位置
    useEffect(() => {
        const handleMouseDown = (e: MouseEvent) => {
            (window as any).__lastMousePosition = { x: e.clientX, y: e.clientY };
        };
        window.addEventListener('mousedown', handleMouseDown);
        return () => window.removeEventListener('mousedown', handleMouseDown);
    }, []);

    // 点击外部关闭确认框
    useEffect(() => {
        if (!confirmDialog) return;

        const handleClickOutside = (event: MouseEvent) => {
            if (confirmDialogRef.current && !confirmDialogRef.current.contains(event.target as Node)) {
                handleCancel();
            }
        };

        // 延迟添加监听器，避免立即触发
        const timer = setTimeout(() => {
            document.addEventListener('mousedown', handleClickOutside);
        }, 100);

        return () => {
            clearTimeout(timer);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [confirmDialog]);

    const handleAction = (action: string) => {
        // 对于需要确认的操作，显示确认对话框
        const needsConfirmation = ['disconnect', 'delete_connection'].includes(action);

        if (needsConfirmation) {
            // 获取最后的鼠标位置
            const lastPos = (window as any).__lastMousePosition || { x: window.innerWidth / 2, y: window.innerHeight / 2 };

            // 延迟显示确认框，等待菜单关闭动画完成
            setTimeout(() => {
                setConfirmDialog({
                    action,
                    position: lastPos
                });
            }, 150);
        } else {
            onAction(action, node);
        }
    };

    // 确认操作
    const handleConfirm = async () => {
        if (confirmDialog) {
            setLoading(true);
            try {
                onAction(confirmDialog.action, node);
            } finally {
                setLoading(false);
                setConfirmDialog(null);
            }
        }
    };

    // 取消操作
    const handleCancel = () => {
        setConfirmDialog(null);
    };

    // 根据节点类型渲染菜单项
    const renderMenuItems = () => {
        const nodeType = node.nodeType;
        const metadata = node.metadata || {};

        switch (nodeType) {
            case 'connection':
                return renderConnectionMenu();

            case 'database':
            case 'system_database':
                return renderDatabaseMenu(metadata);

            case 'bucket':
            case 'system_bucket':
                return renderBucketMenu(metadata);

            case 'storage_group':
                return renderStorageGroupMenu(metadata);

            case 'measurement':
            case 'table':
                return renderTableMenu(metadata);

            case 'field':
                return renderFieldMenu();

            case 'tag':
                return renderTagMenu();

            case 'field_group':
                return renderFieldGroupMenu();

            case 'tag_group':
                return renderTagGroupMenu();

            case 'device':
                return renderDeviceMenu(metadata);

            case 'timeseries':
            case 'aligned_timeseries':
                return renderTimeseriesMenu(metadata);

            case 'template':
            case 'schema_template':
                return renderTemplateMenu(metadata);

            case 'retention_policy':
                return renderRetentionPolicyMenu(metadata);

            case 'organization':
                return renderOrganizationMenu(metadata);

            default:
                return renderDefaultMenu();
        }
    };

    // ============================================================================
    // 连接节点菜单
    // ============================================================================
    const renderConnectionMenu = () => {
        const metadata = node.metadata || {};
        const dbType = metadata.dbType?.toLowerCase();
        const isIoTDB = dbType === 'iotdb';
        const isInfluxDB2x = dbType === 'influxdb2' || metadata.version === '2.x';

        // 🔧 修复：从 store 实时获取连接状态，而不是依赖 node.isConnected
        const connectionId = metadata.connectionId || node.id;
        const connectionStatus = connectionStatuses[connectionId];
        const isConnected = connectionStatus?.status === 'connected';

        return (
            <>
                <ContextMenuLabel>{t('context_menu.connection_operations')}</ContextMenuLabel>
                <ContextMenuItem onSelect={() => handleAction('test_connection')}>
                    <Activity className="w-4 h-4 mr-2"/>
                    {t('context_menu.test_connection')}
                </ContextMenuItem>
                <ContextMenuItem onSelect={() => handleAction('refresh_connection')}>
                    <RefreshCw className="w-4 h-4 mr-2"/>
                    {t('context_menu.refresh_connection')}
                    <ContextMenuShortcut>⌘R</ContextMenuShortcut>
                </ContextMenuItem>
                <ContextMenuSeparator/>

                {/* InfluxDB 2.x 不显示"创建数据库"选项，因为它使用 Organization → Bucket 结构 */}
                {!isInfluxDB2x && (
                    <>
                        <ContextMenuLabel>{t('context_menu.database_management')}</ContextMenuLabel>
                        <ContextMenuItem onSelect={() => handleAction('create_database')}>
                            <Plus className="w-4 h-4 mr-2"/>
                            {t('context_menu.create_database')}
                        </ContextMenuItem>
                        {isIoTDB && (
                            <ContextMenuItem onSelect={() => handleAction('manage_templates')}>
                                <FileStack className="w-4 h-4 mr-2"/>
                                {t('context_menu.manage_templates')}
                            </ContextMenuItem>
                        )}
                        <ContextMenuSeparator/>
                    </>
                )}

                <ContextMenuLabel>{t('context_menu.connection_management')}</ContextMenuLabel>
                <ContextMenuItem onSelect={() => handleAction('connection_info')}>
                    <Info className="w-4 h-4 mr-2"/>
                    {t('context_menu.connection_info')}
                </ContextMenuItem>
                <ContextMenuItem onSelect={() => handleAction('connection_properties')}>
                    <Settings className="w-4 h-4 mr-2"/>
                    {t('context_menu.connection_properties')}
                </ContextMenuItem>
                <ContextMenuItem onSelect={() => handleAction('copy_connection_name')}>
                    <Copy className="w-4 h-4 mr-2"/>
                    {t('context_menu.copy_connection_name')}
                </ContextMenuItem>
                <ContextMenuSeparator/>

                {/* 根据连接状态动态显示"打开连接"或"断开连接" */}
                {isConnected ? (
                    <ContextMenuItem
                        onSelect={() => handleAction('disconnect')}
                    >
                        <Unlink className="w-4 h-4 mr-2"/>
                        {t('context_menu.disconnect')}
                    </ContextMenuItem>
                ) : (
                    <ContextMenuItem
                        onSelect={() => handleAction('connect')}
                    >
                        <Database className="w-4 h-4 mr-2"/>
                        {t('context_menu.connect')}
                    </ContextMenuItem>
                )}
                <ContextMenuItem
                    onSelect={() => handleAction('delete_connection')}
                    className="text-destructive focus:text-destructive"
                    disabled={isConnected}
                >
                    <Trash2 className="w-4 h-4 mr-2"/>
                    {t('context_menu.delete_connection')}
                </ContextMenuItem>
            </>
        );
    };

    // ============================================================================
    // 数据库节点菜单
    // ============================================================================
    const renderDatabaseMenu = (metadata: Record<string, any>) => {
        const connectionId = metadata.connectionId || '';
        const database = node.name;
        const isOpened = isDatabaseOpened?.(connectionId, database) || false;

        // 获取数据源类型
        const dataSourceType = metadata.dataSourceType || 'influxdb';

        return (
            <>
                <ContextMenuLabel>{t('context_menu.database_operations')}</ContextMenuLabel>
                {!isOpened && (
                    <ContextMenuItem onSelect={() => handleAction('open_database')}>
                        <FolderOpen className="w-4 h-4 mr-2"/>
                        {t('context_menu.open_database')}
                    </ContextMenuItem>
                )}
                {isOpened && (
                    <ContextMenuItem onSelect={() => handleAction('close_database')}>
                        <FolderX className="w-4 h-4 mr-2"/>
                        {t('context_menu.close_database')}
                    </ContextMenuItem>
                )}
                <ContextMenuItem onSelect={() => handleAction('refresh_database')}>
                    <RefreshCw className="w-4 h-4 mr-2"/>
                    {t('context_menu.refresh_database')}
                    <ContextMenuShortcut>⌘R</ContextMenuShortcut>
                </ContextMenuItem>
                <ContextMenuSeparator/>

                <ContextMenuLabel>{t('context_menu.query_operations')}</ContextMenuLabel>
                <ContextMenuItem onSelect={() => handleAction('show_tables')}>
                    <Table className="w-4 h-4 mr-2"/>
                    {t('context_menu.show_tables')}
                </ContextMenuItem>
                <ContextMenuSeparator/>

                <ContextMenuLabel>{t('context_menu.data_management')}</ContextMenuLabel>
                <ContextMenuItem onSelect={() => handleAction('database_info')}>
                    <Info className="w-4 h-4 mr-2"/>
                    {t('context_menu.database_info')}
                </ContextMenuItem>
                {/* 只有 InfluxDB 1.x 支持保留策略 */}
                {dataSourceType === 'influxdb' && (
                    <ContextMenuItem onSelect={() => handleAction('manage_retention_policies')}>
                        <Clock className="w-4 h-4 mr-2"/>
                        {t('context_menu.manage_retention_policies')}
                    </ContextMenuItem>
                )}
                <ContextMenuItem onSelect={() => handleAction('export_metadata')}>
                    <Download className="w-4 h-4 mr-2"/>
                    {t('context_menu.export_metadata')}
                </ContextMenuItem>
                <ContextMenuSeparator/>

                <ContextMenuLabel>{t('context_menu.copy_operations')}</ContextMenuLabel>
                <ContextMenuItem onSelect={() => handleAction('copy_database_name')}>
                    <Copy className="w-4 h-4 mr-2"/>
                    {t('context_menu.copy_database_name')}
                    <ContextMenuShortcut>⌘C</ContextMenuShortcut>
                </ContextMenuItem>
                <ContextMenuItem onSelect={() => handleAction('copy_use_statement')}>
                    <FileText className="w-4 h-4 mr-2"/>
                    {t('context_menu.copy_use_statement')}
                </ContextMenuItem>
                <ContextMenuSeparator/>

                <ContextMenuItem
                    onSelect={() => handleAction('delete_database')}
                    className="text-destructive focus:text-destructive"
                >
                    <Trash2 className="w-4 h-4 mr-2"/>
                    {t('context_menu.delete_database')}
                </ContextMenuItem>
            </>
        );
    };

    // ============================================================================
    // Bucket 节点菜单 (InfluxDB 2.x)
    // ============================================================================
    const renderBucketMenu = (metadata: Record<string, any>) => {
        const connectionId = metadata.connectionId || '';
        const organization = metadata.organization || '';
        const bucket = node.name;
        const isOpened = isDatabaseOpened?.(connectionId, `bucket:${organization}/${bucket}`) || false;

        return (
            <>
                <ContextMenuLabel>{t('context_menu.bucket_operations')}</ContextMenuLabel>
                {!isOpened && (
                    <ContextMenuItem onSelect={() => handleAction('open_bucket')}>
                        <FolderOpen className="w-4 h-4 mr-2"/>
                        {t('context_menu.open_bucket')}
                    </ContextMenuItem>
                )}
                {isOpened && (
                    <ContextMenuItem onSelect={() => handleAction('close_bucket')}>
                        <FolderX className="w-4 h-4 mr-2"/>
                        {t('context_menu.close_bucket')}
                    </ContextMenuItem>
                )}
                <ContextMenuItem onSelect={() => handleAction('refresh_bucket')}>
                    <RefreshCw className="w-4 h-4 mr-2"/>
                    {t('context_menu.refresh_bucket')}
                </ContextMenuItem>
                <ContextMenuSeparator/>

                <ContextMenuLabel>{t('context_menu.data_management')}</ContextMenuLabel>
                <ContextMenuItem onSelect={() => handleAction('bucket_info')}>
                    <Info className="w-4 h-4 mr-2"/>
                    {t('context_menu.bucket_info')}
                </ContextMenuItem>
                <ContextMenuItem onSelect={() => handleAction('update_bucket_retention')}>
                    <Clock className="w-4 h-4 mr-2"/>
                    {t('context_menu.update_bucket_retention')}
                </ContextMenuItem>
                <ContextMenuItem onSelect={() => handleAction('export_metadata')}>
                    <Download className="w-4 h-4 mr-2"/>
                    {t('context_menu.export_metadata')}
                </ContextMenuItem>
                <ContextMenuSeparator/>

                <ContextMenuItem onSelect={() => handleAction('copy_bucket_name')}>
                    <Copy className="w-4 h-4 mr-2"/>
                    {t('context_menu.copy_bucket_name')}
                </ContextMenuItem>
                <ContextMenuSeparator/>

                <ContextMenuItem
                    onSelect={() => handleAction('delete_bucket')}
                    className="text-destructive focus:text-destructive"
                >
                    <Trash2 className="w-4 h-4 mr-2"/>
                    {t('context_menu.delete_bucket')}
                </ContextMenuItem>
            </>
        );
    };

    // ============================================================================
    // 存储组节点菜单 (IoTDB)
    // ============================================================================
    const renderStorageGroupMenu = (metadata: Record<string, any>) => {
        const connectionId = metadata.connectionId || '';
        const storageGroup = metadata.database || metadata.databaseName || node?.name || '';
        const isOpened = isDatabaseOpened?.(connectionId, storageGroup) || false;

        return (
            <>
                <ContextMenuLabel>{t('context_menu.storage_group_operations')}</ContextMenuLabel>
                {!isOpened ? (
                    <ContextMenuItem onSelect={() => handleAction('open_database')}>
                        <FolderOpen className="w-4 h-4 mr-2"/>
                        {t('context_menu.open_storage_group')}
                    </ContextMenuItem>
                ) : (
                    <ContextMenuItem onSelect={() => handleAction('close_database')}>
                        <FolderClosed className="w-4 h-4 mr-2"/>
                        {t('context_menu.close_storage_group')}
                    </ContextMenuItem>
                )}
                <ContextMenuItem onSelect={() => handleAction('refresh_database')}>
                    <RefreshCw className="w-4 h-4 mr-2"/>
                    {t('context_menu.refresh_storage_group')}
                </ContextMenuItem>
                <ContextMenuSeparator/>

            <ContextMenuLabel>{t('context_menu.device_management')}</ContextMenuLabel>
            <ContextMenuItem onSelect={() => handleAction('create_device')}>
                <Plus className="w-4 h-4 mr-2"/>
                {t('context_menu.create_device')}
            </ContextMenuItem>
            <ContextMenuItem onSelect={() => handleAction('show_devices')}>
                <Table className="w-4 h-4 mr-2"/>
                {t('context_menu.show_devices')}
            </ContextMenuItem>
            <ContextMenuSeparator/>

            <ContextMenuLabel>{t('context_menu.data_management')}</ContextMenuLabel>
            <ContextMenuItem onSelect={() => handleAction('database_info')}>
                <Info className="w-4 h-4 mr-2"/>
                {t('context_menu.storage_group_info')}
            </ContextMenuItem>
            <ContextMenuItem onSelect={() => handleAction('export_metadata')}>
                <Download className="w-4 h-4 mr-2"/>
                {t('context_menu.export_metadata')}
            </ContextMenuItem>
            <ContextMenuSeparator/>

            <ContextMenuItem onSelect={() => handleAction('copy_database_name')}>
                <Copy className="w-4 h-4 mr-2"/>
                {t('context_menu.copy_storage_group_name')}
            </ContextMenuItem>
            <ContextMenuSeparator/>

            <ContextMenuItem
                onSelect={() => handleAction('delete_database')}
                className="text-destructive focus:text-destructive"
            >
                <Trash2 className="w-4 h-4 mr-2"/>
                {t('context_menu.delete_storage_group')}
            </ContextMenuItem>
        </>
        );
    };

    // ============================================================================
    // 表/测量节点菜单
    // ============================================================================
    const renderTableMenu = (metadata: Record<string, any>) => {
        const tablePath = `${metadata.connectionId}/${metadata.database || metadata.databaseName}/${node.name}`;
        const isFav = isFavorite?.(tablePath) || false;

        return (
            <>
                <ContextMenuLabel>{t('context_menu.table_operations')}</ContextMenuLabel>
                <ContextMenuItem onSelect={() => handleAction('view_table_data')}>
                    <Eye className="w-4 h-4 mr-2"/>
                    {t('context_menu.view_table_data')}
                </ContextMenuItem>
                <ContextMenuItem onSelect={() => handleAction('query_table')}>
                    <Search className="w-4 h-4 mr-2"/>
                    {t('context_menu.query_table')}
                </ContextMenuItem>
                <ContextMenuItem onSelect={() => handleAction('query_builder')}>
                    <Code className="w-4 h-4 mr-2"/>
                    {t('context_menu.query_builder')}
                </ContextMenuItem>
                <ContextMenuItem onSelect={() => handleAction('refresh_table')}>
                    <RefreshCw className="w-4 h-4 mr-2"/>
                    {t('context_menu.refresh_table')}
                </ContextMenuItem>
                <ContextMenuSeparator/>

                <ContextMenuLabel>{t('context_menu.query_generation')}</ContextMenuLabel>
                <ContextMenuSub>
                    <ContextMenuSubTrigger>
                        <Code className="w-4 h-4 mr-2"/>
                        {t('context_menu.sample_queries')}
                    </ContextMenuSubTrigger>
                    <ContextMenuSubContent>
                        <ContextMenuItem onSelect={() => handleAction('generate_select_query')}>
                            {t('context_menu.generate_select_all')}
                        </ContextMenuItem>
                        <ContextMenuItem onSelect={() => handleAction('generate_count_query')}>
                            {t('context_menu.generate_count')}
                        </ContextMenuItem>
                        <ContextMenuItem onSelect={() => handleAction('generate_recent_query')}>
                            {t('context_menu.generate_recent')}
                        </ContextMenuItem>
                        <ContextMenuItem onSelect={() => handleAction('generate_aggregate_query')}>
                            {t('context_menu.generate_aggregate')}
                        </ContextMenuItem>
                    </ContextMenuSubContent>
                </ContextMenuSub>
                <ContextMenuSeparator/>

                <ContextMenuLabel>{t('context_menu.data_analysis')}</ContextMenuLabel>
                <ContextMenuItem onSelect={() => handleAction('table_statistics')}>
                    <BarChart className="w-4 h-4 mr-2"/>
                    {t('context_menu.table_statistics')}
                </ContextMenuItem>
                <ContextMenuItem onSelect={() => handleAction('data_preview')}>
                    <FileText className="w-4 h-4 mr-2"/>
                    {t('context_menu.data_preview')}
                </ContextMenuItem>
                <ContextMenuSeparator/>

                <ContextMenuLabel>{t('context_menu.table_management')}</ContextMenuLabel>
                <ContextMenuItem onSelect={() => handleAction('table_info')}>
                    <Info className="w-4 h-4 mr-2"/>
                    {t('context_menu.table_info')}
                </ContextMenuItem>
                <ContextMenuItem onSelect={() => handleAction('edit_table')}>
                    <Edit className="w-4 h-4 mr-2"/>
                    {t('context_menu.edit_table')}
                </ContextMenuItem>
                <ContextMenuItem onSelect={() => handleAction('table_designer')}>
                    <Settings className="w-4 h-4 mr-2"/>
                    {t('context_menu.table_designer')}
                </ContextMenuItem>
                <ContextMenuSeparator/>

                <ContextMenuLabel>{t('context_menu.data_operations')}</ContextMenuLabel>
                <ContextMenuItem onSelect={() => handleAction('export_table_data')}>
                    <Download className="w-4 h-4 mr-2"/>
                    {t('context_menu.export_table_data')}
                </ContextMenuItem>
                <ContextMenuItem onSelect={() => handleAction('import_table_data')}>
                    <Upload className="w-4 h-4 mr-2"/>
                    {t('context_menu.import_table_data')}
                </ContextMenuItem>
                <ContextMenuSeparator/>

                <ContextMenuLabel>{t('context_menu.favorite_operations')}</ContextMenuLabel>
                <ContextMenuItem onSelect={() => handleAction(isFav ? 'remove_favorite' : 'add_favorite')}>
                    {isFav ? <StarOff className="w-4 h-4 mr-2"/> : <Star className="w-4 h-4 mr-2"/>}
                    {isFav ? t('context_menu.remove_favorite') : t('context_menu.add_favorite')}
                </ContextMenuItem>
                <ContextMenuSeparator/>

                <ContextMenuLabel>{t('context_menu.copy_operations')}</ContextMenuLabel>
                <ContextMenuItem onSelect={() => handleAction('copy_table_name')}>
                    <Copy className="w-4 h-4 mr-2"/>
                    {t('context_menu.copy_table_name')}
                    <ContextMenuShortcut>⌘C</ContextMenuShortcut>
                </ContextMenuItem>
                <ContextMenuItem onSelect={() => handleAction('copy_select_statement')}>
                    <FileText className="w-4 h-4 mr-2"/>
                    {t('context_menu.copy_select_statement')}
                </ContextMenuItem>
                <ContextMenuSeparator/>

                <ContextMenuItem
                    onSelect={() => handleAction('delete_table')}
                    className="text-destructive focus:text-destructive"
                >
                    <Trash2 className="w-4 h-4 mr-2"/>
                    {t('context_menu.delete_table')}
                </ContextMenuItem>
            </>
        );
    };

    // ============================================================================
    // 字段节点菜单
    // ============================================================================
    const renderFieldMenu = () => (
        <>
            <ContextMenuLabel>{t('context_menu.field_operations')}</ContextMenuLabel>
            <ContextMenuItem onSelect={() => handleAction('query_field')}>
                <Search className="w-4 h-4 mr-2"/>
                {t('context_menu.query_field_data')}
            </ContextMenuItem>
            <ContextMenuSeparator/>

            <ContextMenuLabel>{t('context_menu.aggregate_operations')}</ContextMenuLabel>
            <ContextMenuSub>
                <ContextMenuSubTrigger>
                    <BarChart className="w-4 h-4 mr-2"/>
                    {t('context_menu.aggregate_operations')}
                </ContextMenuSubTrigger>
                <ContextMenuSubContent>
                    <ContextMenuItem onSelect={() => handleAction('field_max')}>
                        {t('context_menu.maximum')}
                    </ContextMenuItem>
                    <ContextMenuItem onSelect={() => handleAction('field_min')}>
                        {t('context_menu.minimum')}
                    </ContextMenuItem>
                    <ContextMenuItem onSelect={() => handleAction('field_avg')}>
                        {t('context_menu.average')}
                    </ContextMenuItem>
                    <ContextMenuItem onSelect={() => handleAction('field_sum')}>
                        {t('context_menu.sum')}
                    </ContextMenuItem>
                    <ContextMenuItem onSelect={() => handleAction('field_count')}>
                        {t('context_menu.count')}
                    </ContextMenuItem>
                </ContextMenuSubContent>
            </ContextMenuSub>
            <ContextMenuSeparator/>

            <ContextMenuLabel>{t('context_menu.copy_operations')}</ContextMenuLabel>
            <ContextMenuItem onSelect={() => handleAction('copy_field_name')}>
                <Copy className="w-4 h-4 mr-2"/>
                {t('context_menu.copy_field_name_value')}
                <ContextMenuShortcut>⌘C</ContextMenuShortcut>
            </ContextMenuItem>
        </>
    );

    // ============================================================================
    // 标签节点菜单
    // ============================================================================
    const renderTagMenu = () => (
        <>
            <ContextMenuLabel>{t('context_menu.tag_operations')}</ContextMenuLabel>
            <ContextMenuItem onSelect={() => handleAction('query_tag')}>
                <Search className="w-4 h-4 mr-2"/>
                {t('context_menu.query_data')}
            </ContextMenuItem>
            <ContextMenuItem onSelect={() => handleAction('tag_values')}>
                <Tags className="w-4 h-4 mr-2"/>
                {t('context_menu.show_tag_values')}
            </ContextMenuItem>
            <ContextMenuItem onSelect={() => handleAction('tag_cardinality')}>
                <BarChart className="w-4 h-4 mr-2"/>
                {t('context_menu.tag_cardinality')}
            </ContextMenuItem>
            <ContextMenuSeparator/>

            <ContextMenuLabel>{t('context_menu.query_generation')}</ContextMenuLabel>
            <ContextMenuItem onSelect={() => handleAction('generate_filter_query')}>
                <Filter className="w-4 h-4 mr-2"/>
                {t('context_menu.generate_filter_query')}
            </ContextMenuItem>
            <ContextMenuSeparator/>

            <ContextMenuLabel>{t('context_menu.copy_operations')}</ContextMenuLabel>
            <ContextMenuItem onSelect={() => handleAction('copy_tag_name')}>
                <Copy className="w-4 h-4 mr-2"/>
                {t('context_menu.copy_tag_name')}
                <ContextMenuShortcut>⌘C</ContextMenuShortcut>
            </ContextMenuItem>
        </>
    );

    // ============================================================================
    // 字段组节点菜单
    // ============================================================================
    const renderFieldGroupMenu = () => (
        <>
            <ContextMenuLabel>{t('context_menu.field_group_operations')}</ContextMenuLabel>
            <ContextMenuItem onSelect={() => handleAction('refresh_fields')}>
                <RefreshCw className="w-4 h-4 mr-2"/>
                {t('context_menu.refresh')}
            </ContextMenuItem>
            <ContextMenuItem onSelect={() => handleAction('show_all_fields')}>
                <Table className="w-4 h-4 mr-2"/>
                {t('context_menu.show_all_fields')}
            </ContextMenuItem>
        </>
    );

    // ============================================================================
    // 标签组节点菜单
    // ============================================================================
    const renderTagGroupMenu = () => (
        <>
            <ContextMenuLabel>{t('context_menu.tag_group_operations')}</ContextMenuLabel>
            <ContextMenuItem onSelect={() => handleAction('refresh_tags')}>
                <RefreshCw className="w-4 h-4 mr-2"/>
                {t('context_menu.refresh')}
            </ContextMenuItem>
            <ContextMenuItem onSelect={() => handleAction('show_all_tags')}>
                <Tags className="w-4 h-4 mr-2"/>
                {t('context_menu.show_all_tags')}
            </ContextMenuItem>
        </>
    );

    // ============================================================================
    // 设备节点菜单 (IoTDB)
    // ============================================================================
    const renderDeviceMenu = (metadata: Record<string, any>) => (
        <>
            <ContextMenuLabel>{t('context_menu.device_operations')}</ContextMenuLabel>
            <ContextMenuItem onSelect={() => handleAction('view_device_data')}>
                <Eye className="w-4 h-4 mr-2"/>
                {t('context_menu.query_device_data')}
            </ContextMenuItem>
            <ContextMenuItem onSelect={() => handleAction('refresh_device')}>
                <RefreshCw className="w-4 h-4 mr-2"/>
                {t('context_menu.refresh')}
            </ContextMenuItem>
            <ContextMenuSeparator/>

            <ContextMenuLabel>{t('context_menu.timeseries_operations')}</ContextMenuLabel>
            <ContextMenuItem onSelect={() => handleAction('create_timeseries')}>
                <Plus className="w-4 h-4 mr-2"/>
                {t('context_menu.query_timeseries')}
            </ContextMenuItem>
            <ContextMenuItem onSelect={() => handleAction('show_timeseries')}>
                <Table className="w-4 h-4 mr-2"/>
                {t('context_menu.query_timeseries')}
            </ContextMenuItem>
            <ContextMenuSeparator/>

            <ContextMenuLabel>{t('context_menu.device_management')}</ContextMenuLabel>
            <ContextMenuItem onSelect={() => handleAction('device_info')}>
                <Info className="w-4 h-4 mr-2"/>
                {t('context_menu.device_info')}
            </ContextMenuItem>
            <ContextMenuItem onSelect={() => handleAction('mount_template_to_device')}>
                <Upload className="w-4 h-4 mr-2"/>
                {t('context_menu.apply_template')}
            </ContextMenuItem>
            <ContextMenuItem onSelect={() => handleAction('copy_device_name')}>
                <Copy className="w-4 h-4 mr-2"/>
                {t('context_menu.copy_field_name')}
            </ContextMenuItem>
            <ContextMenuSeparator/>

            <ContextMenuItem
                onSelect={() => handleAction('delete_device')}
                className="text-destructive focus:text-destructive"
            >
                <Trash2 className="w-4 h-4 mr-2"/>
                {t('context_menu.delete_device')}
            </ContextMenuItem>
        </>
    );

    // ============================================================================
    // 时间序列节点菜单 (IoTDB)
    // ============================================================================
    const renderTimeseriesMenu = (metadata: Record<string, any>) => (
        <>
            <ContextMenuLabel>{t('context_menu.timeseries_operations')}</ContextMenuLabel>
            <ContextMenuItem onSelect={() => handleAction('query_timeseries')}>
                <Search className="w-4 h-4 mr-2"/>
                {t('context_menu.query_timeseries')}
            </ContextMenuItem>
            <ContextMenuItem onSelect={() => handleAction('timeseries_info')}>
                <Info className="w-4 h-4 mr-2"/>
                {t('context_menu.timeseries_info')}
            </ContextMenuItem>
            <ContextMenuSeparator/>

            <ContextMenuLabel>{t('context_menu.data_analysis')}</ContextMenuLabel>
            <ContextMenuItem onSelect={() => handleAction('timeseries_stats')}>
                <BarChart className="w-4 h-4 mr-2"/>
                {t('context_menu.table_statistics')}
            </ContextMenuItem>
            <ContextMenuSeparator/>

            <ContextMenuItem onSelect={() => handleAction('copy_timeseries_name')}>
                <Copy className="w-4 h-4 mr-2"/>
                {t('context_menu.copy_field_name')}
            </ContextMenuItem>
            <ContextMenuSeparator/>

            <ContextMenuItem
                onSelect={() => handleAction('delete_timeseries')}
                className="text-destructive focus:text-destructive"
            >
                <Trash2 className="w-4 h-4 mr-2"/>
                {t('context_menu.delete_timeseries')}
            </ContextMenuItem>
        </>
    );

    // ============================================================================
    // 模板节点菜单 (IoTDB)
    // ============================================================================
    const renderTemplateMenu = (metadata: Record<string, any>) => (
        <>
            <ContextMenuLabel>{t('context_menu.template_operations')}</ContextMenuLabel>
            <ContextMenuItem onSelect={() => handleAction('view_template')}>
                <Eye className="w-4 h-4 mr-2"/>
                {t('context_menu.view_template')}
            </ContextMenuItem>
            <ContextMenuItem onSelect={() => handleAction('edit_template')}>
                <Edit className="w-4 h-4 mr-2"/>
                {t('context_menu.edit_template')}
            </ContextMenuItem>
            <ContextMenuItem onSelect={() => handleAction('refresh_template')}>
                <RefreshCw className="w-4 h-4 mr-2"/>
                {t('context_menu.refresh')}
            </ContextMenuItem>
            <ContextMenuSeparator/>

            <ContextMenuLabel>{t('context_menu.template_operations')}</ContextMenuLabel>
            <ContextMenuItem onSelect={() => handleAction('mount_template')}>
                <Link className="w-4 h-4 mr-2"/>
                {t('context_menu.apply_template')}
            </ContextMenuItem>
            <ContextMenuItem onSelect={() => handleAction('unmount_template')}>
                <Unlink className="w-4 h-4 mr-2"/>
                {t('context_menu.delete_template')}
            </ContextMenuItem>
            <ContextMenuSeparator/>

            <ContextMenuItem onSelect={() => handleAction('copy_template_name')}>
                <Copy className="w-4 h-4 mr-2"/>
                {t('context_menu.copy_field_name')}
            </ContextMenuItem>
            <ContextMenuSeparator/>

            <ContextMenuItem
                onSelect={() => handleAction('delete_template')}
                className="text-destructive focus:text-destructive"
            >
                <Trash2 className="w-4 h-4 mr-2"/>
                {t('context_menu.delete_template')}
            </ContextMenuItem>
        </>
    );

    // ============================================================================
    // 保留策略节点菜单
    // ============================================================================
    const renderRetentionPolicyMenu = (metadata: Record<string, any>) => {
        // 检查是否为默认策略
        const isDefaultPolicy = metadata.default === true;

        return (
            <>
                <ContextMenuLabel>{t('context_menu.retention_policy_operations')}</ContextMenuLabel>
                <ContextMenuItem onSelect={() => handleAction('view_retention_policy')}>
                    <Eye className="w-4 h-4 mr-2"/>
                    {t('context_menu.view_retention_policy')}
                </ContextMenuItem>
                <ContextMenuItem onSelect={() => handleAction('edit_retention_policy')}>
                    <Edit className="w-4 h-4 mr-2"/>
                    {t('context_menu.edit_retention_policy')}
                </ContextMenuItem>
                <ContextMenuSeparator/>

                <ContextMenuItem onSelect={() => handleAction('copy_policy_name')}>
                    <Copy className="w-4 h-4 mr-2"/>
                    {t('context_menu.copy_field_name')}
                </ContextMenuItem>

                {/* 只有非默认策略才显示删除选项 */}
                {!isDefaultPolicy && (
                    <>
                        <ContextMenuSeparator/>
                        <ContextMenuItem
                            onSelect={() => handleAction('delete_retention_policy')}
                            className="text-destructive focus:text-destructive"
                        >
                            <Trash2 className="w-4 h-4 mr-2"/>
                            {t('context_menu.delete_retention_policy')}
                        </ContextMenuItem>
                    </>
                )}
            </>
        );
    };

    // ============================================================================
    // 组织节点菜单 (InfluxDB 2.x)
    // ============================================================================
    const renderOrganizationMenu = (metadata: Record<string, any>) => {
        const connectionId = metadata.connectionId || '';
        const organization = node.name;
        const isOpened = isDatabaseOpened?.(connectionId, `org:${organization}`) || false;

        return (
            <>
                <ContextMenuLabel>{t('context_menu.organization_operations')}</ContextMenuLabel>
                {!isOpened && (
                    <ContextMenuItem onSelect={() => handleAction('open_organization')}>
                        <FolderOpen className="w-4 h-4 mr-2"/>
                        {t('context_menu.open_database')}
                    </ContextMenuItem>
                )}
                {isOpened && (
                    <ContextMenuItem onSelect={() => handleAction('close_organization')}>
                        <FolderX className="w-4 h-4 mr-2"/>
                        {t('context_menu.close_database')}
                    </ContextMenuItem>
                )}
                <ContextMenuItem onSelect={() => handleAction('refresh_organization')}>
                    <RefreshCw className="w-4 h-4 mr-2"/>
                    {t('context_menu.refresh')}
                </ContextMenuItem>
                <ContextMenuItem onSelect={() => handleAction('organization_info')}>
                    <Info className="w-4 h-4 mr-2"/>
                    {t('context_menu.organization_info')}
                </ContextMenuItem>
                <ContextMenuSeparator/>

                <ContextMenuLabel>{t('context_menu.manage_buckets')}</ContextMenuLabel>
                <ContextMenuItem onSelect={() => handleAction('create_bucket')}>
                    <Plus className="w-4 h-4 mr-2"/>
                    {t('context_menu.create_database')}
                </ContextMenuItem>
                <ContextMenuSeparator/>

                <ContextMenuItem onSelect={() => handleAction('copy_organization_name')}>
                    <Copy className="w-4 h-4 mr-2"/>
                    {t('context_menu.copy_database_name')}
                </ContextMenuItem>
            </>
        );
    };

    // ============================================================================
    // 默认菜单（未知节点类型）
    // ============================================================================
    const renderDefaultMenu = () => (
        <>
            <ContextMenuLabel>{t('context_menu.connection_operations')}</ContextMenuLabel>
            <ContextMenuItem onSelect={() => handleAction('refresh')}>
                <RefreshCw className="w-4 h-4 mr-2"/>
                {t('context_menu.refresh')}
            </ContextMenuItem>
            <ContextMenuItem onSelect={() => handleAction('copy_name')}>
                <Copy className="w-4 h-4 mr-2"/>
                {t('context_menu.copy_connection_name')}
            </ContextMenuItem>
        </>
    );

    // 获取确认消息和标题
    const getConfirmConfig = () => {
        if (!confirmDialog) return { title: '', message: '' };

        switch (confirmDialog.action) {
            case 'disconnect':
                return {
                    title: '确认操作',
                    message: '确定要断开连接吗？'
                };
            case 'delete_connection':
                return {
                    title: '确认操作',
                    message: '确定要删除此连接吗？此操作不可撤销！'
                };
            default:
                return {
                    title: '确认操作',
                    message: '确定要执行此操作吗？'
                };
        }
    };

    // ============================================================================
    // 主渲染
    // ============================================================================
    if (disabled) {
        return <>{children}</>;
    }

    return (
        <>
            <ContextMenu modal={false}>
                <ContextMenuTrigger asChild={false} className="block w-full">
                    {children}
                </ContextMenuTrigger>
                <ContextMenuContent
                    className="w-56"
                    onCloseAutoFocus={(e) => {
                        // 阻止自动焦点恢复，避免与对话框的焦点管理冲突
                        e.preventDefault();
                    }}
                >
                    {renderMenuItems()}
                </ContextMenuContent>
            </ContextMenu>

            {/* 固定位置的确认对话框 */}
            {confirmDialog && (() => {
                const config = getConfirmConfig();
                const { position } = confirmDialog;

                // 计算对话框位置
                const dialogWidth = 288; // w-72 = 18rem = 288px
                const dialogHeight = 150; // 估计高度
                const padding = 16;

                // 默认显示在鼠标位置左上方
                let left = position.x - dialogWidth - 10;
                let top = position.y - dialogHeight - 10;

                // 如果左侧空间不足，显示在右侧
                if (left < padding) {
                    left = position.x + 10;
                }

                // 如果顶部空间不足，显示在下方
                if (top < padding) {
                    top = position.y + 10;
                }

                // 确保不超出右边界
                if (left + dialogWidth > window.innerWidth - padding) {
                    left = window.innerWidth - dialogWidth - padding;
                }

                // 确保不超出底部边界
                if (top + dialogHeight > window.innerHeight - padding) {
                    top = window.innerHeight - dialogHeight - padding;
                }

                return (
                    <div
                        ref={confirmDialogRef}
                        className="fixed z-50 w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-lg animate-in fade-in-0 zoom-in-95"
                        style={{
                            left: `${left}px`,
                            top: `${top}px`,
                        }}
                    >
                        <div className="space-y-3">
                            <div className="flex items-start space-x-3">
                                <div className="flex-shrink-0 mt-0.5">
                                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                                </div>
                                <div className="flex-1 space-y-1">
                                    <div className="text-sm font-medium leading-none">
                                        {config.title}
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                        {config.message}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center justify-end space-x-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleCancel}
                                    disabled={loading}
                                    className="h-7 px-3 text-xs"
                                >
                                    取消
                                </Button>
                                <Button
                                    variant={confirmDialog.action === 'delete_connection' ? 'destructive' : 'default'}
                                    size="sm"
                                    onClick={handleConfirm}
                                    disabled={loading}
                                    className="h-7 px-3 text-xs"
                                >
                                    {loading ? '处理中...' : '确定'}
                                </Button>
                            </div>
                        </div>
                    </div>
                );
            })()}
        </>
    );
}, (prevProps, nextProps) => {
    // 🔧 自定义比较函数：只有当关键属性变化时才重新渲染
    // 这样可以避免父组件重新渲染时，所有菜单都重新渲染

    // 检查节点数据是否变化
    if (prevProps.node.id !== nextProps.node.id) {
        return false; // 需要重新渲染
    }
    if (prevProps.node.name !== nextProps.node.name) {
        return false;
    }
    if (prevProps.node.nodeType !== nextProps.node.nodeType) {
        return false;
    }

    // 检查函数引用是否变化
    if (prevProps.onAction !== nextProps.onAction) {
        return false;
    }
    if (prevProps.isDatabaseOpened !== nextProps.isDatabaseOpened) {
        return false;
    }
    if (prevProps.isFavorite !== nextProps.isFavorite) {
        return false;
    }

    // 检查disabled状态
    if (prevProps.disabled !== nextProps.disabled) {
        return false;
    }

    // 没有变化，跳过重新渲染
    return true; // 返回true表示props相等，跳过渲染
});

UnifiedContextMenu.displayName = 'UnifiedContextMenu';

export default UnifiedContextMenu;
