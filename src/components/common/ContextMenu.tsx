import React, {useEffect, useState} from 'react';
import {createPortal} from 'react-dom';
import {Button} from '@/components/ui';
import {Card, CardContent} from '@/components/ui/Card';
import {Separator} from '@/components/ui';
import {Badge} from '@/components/ui';
import {cn} from '@/lib/utils';
import {
    ChevronRight,
    Database,
    Table,
    Eye,
    Edit,
    Trash2,
    Copy,
    Info,
    Plus,
    Search,
    BarChart,
    FileDown,
    Tag,
    Hash,
    Calculator,
    Clock,
    TrendingUp,
    RefreshCw,
    Settings,
    Unplug,
} from 'lucide-react';

export interface ContextMenuItem {
    id: string;
    label: string;
    icon?: React.ReactNode;
    action?: {
        type: string;
        [key: string]: any;
    };
    children?: ContextMenuItem[];
    type?: 'item' | 'separator' | 'group';
    danger?: boolean;
    disabled?: boolean;
    shortcut?: string;
}

interface ContextMenuProps {
    open: boolean;
    x: number;
    y: number;
    target: any;
    onClose: () => void;
    onAction: (action: string, params?: any) => void;
    onExecuteQuery?: (sql: string, description?: string) => void;
    items?: ContextMenuItem[];
}

const ContextMenu: React.FC<ContextMenuProps> = ({
                                                     open,
                                                     x,
                                                     y,
                                                     target,
                                                     onClose,
                                                     onAction,
                                                     onExecuteQuery,
                                                     items: customItems,
                                                 }) => {
    const [menuItems, setMenuItems] = useState<ContextMenuItem[]>([]);
    const [submenuOpen, setSubmenuOpen] = useState<string | null>(null);
    const [submenuPosition, setSubmenuPosition] = useState({x: 0, y: 0});

    // 根据目标类型生成菜单项
    const generateMenuItems = (target: any): ContextMenuItem[] => {
        if (!target) return [];

        switch (target.type) {
            case 'connection':
                return [
                    {
                        id: 'refresh_connection',
                        label: '刷新连接',
                        icon: <RefreshCw className="w-4 h-4"/>,
                        action: {type: 'refresh_connection'}
                    },
                    {
                        id: 'sep1', type: 'separator',
                        label: ''
                    },
                    {
                        id: 'connection_properties',
                        label: '连接属性',
                        icon: <Info className="w-4 h-4"/>,
                        action: {type: 'connection_properties'}
                    },
                    {
                        id: 'sep2', type: 'separator',
                        label: ''
                    },
                    {
                        id: 'disconnect',
                        label: '断开连接',
                        icon: <Unplug className="w-4 h-4"/>,
                        action: {type: 'disconnect'},
                        danger: true
                    }
                ];

            case 'database_node':
                return [
                    {
                        id: 'refresh_database',
                        label: '刷新数据库',
                        icon: <RefreshCw className="w-4 h-4"/>,
                        action: {type: 'refresh_database'}
                    },
                    {
                        id: 'sep1', type: 'separator',
                        label: ''
                    },
                    {
                        id: 'create_measurement',
                        label: '创建测量',
                        icon: <Plus className="w-4 h-4"/>,
                        action: {type: 'create_measurement'}
                    },
                    {
                        id: 'database_info',
                        label: '数据库信息',
                        icon: <Info className="w-4 h-4"/>,
                        action: {type: 'database_info'}
                    },
                    {
                        id: 'sep2', type: 'separator',
                        label: ''
                    },
                    {
                        id: 'export_database',
                        label: '导出数据库',
                        icon: <FileDown className="w-4 h-4"/>,
                        action: {type: 'export_database'}
                    },
                    {
                        id: 'sep3', type: 'separator',
                        label: ''
                    },
                    {
                        id: 'drop_database',
                        label: '删除数据库',
                        icon: <Trash2 className="w-4 h-4"/>,
                        action: {type: 'drop_database'},
                        danger: true
                    }
                ];

            case 'table':
                return [
                    {
                        id: 'query_table',
                        label: '查询数据',
                        icon: <Search className="w-4 h-4"/>,
                        action: {type: 'query_table'}
                    },
                    {
                        id: 'table_designer',
                        label: '表设计器',
                        icon: <Settings className="w-4 h-4"/>,
                        action: {type: 'table_designer'}
                    },
                    {
                        id: 'sep1', type: 'separator',
                        label: ''
                    },
                    {
                        id: 'table_info',
                        label: '表信息',
                        icon: <Info className="w-4 h-4"/>,
                        action: {type: 'table_info'}
                    },
                    {
                        id: 'export_table',
                        label: '导出数据',
                        icon: <FileDown className="w-4 h-4"/>,
                        children: [
                            {
                                id: 'export_csv',
                                label: '导出为 CSV',
                                action: {type: 'export_table', format: 'csv'}
                            },
                            {
                                id: 'export_json',
                                label: '导出为 JSON',
                                action: {type: 'export_table', format: 'json'}
                            }
                        ]
                    },
                    {
                        id: 'sep2', type: 'separator',
                        label: ''
                    },
                    {
                        id: 'drop_table',
                        label: '删除表',
                        icon: <Trash2 className="w-4 h-4"/>,
                        action: {type: 'drop_table'},
                        danger: true
                    }
                ];

            case 'field':
                return [
                    {
                        id: 'copy_field_name',
                        label: '复制字段名',
                        icon: <Copy className="w-4 h-4"/>,
                        action: {type: 'copy_field_name'}
                    },
                    {
                        id: 'field_stats',
                        label: '字段统计',
                        icon: <BarChart className="w-4 h-4"/>,
                        action: {type: 'field_stats'}
                    }
                ];

            case 'connection_row':
                { const isConnected = target.status?.status === 'connected';
                return [
                    {
                        id: isConnected ? 'disconnect' : 'connect',
                        label: isConnected ? '断开连接' : '连接',
                        icon: isConnected ? <Unplug className="w-4 h-4"/> : <Database className="w-4 h-4"/>,
                        action: {type: isConnected ? 'disconnect' : 'connect'}
                    },
                    {
                        id: 'test_connection',
                        label: '测试连接',
                        icon: <Search className="w-4 h-4"/>,
                        action: {type: 'test_connection'}
                    },
                    {
                        id: 'refresh_status',
                        label: '刷新状态',
                        icon: <RefreshCw className="w-4 h-4"/>,
                        action: {type: 'refresh_status'}
                    },
                    {
                        id: 'sep1', type: 'separator',
                        label: ''
                    },
                    {
                        id: 'edit_connection',
                        label: '编辑连接',
                        icon: <Edit className="w-4 h-4"/>,
                        action: {type: 'edit_connection'}
                    },
                    {
                        id: 'duplicate_connection',
                        label: '复制连接',
                        icon: <Copy className="w-4 h-4"/>,
                        action: {type: 'duplicate_connection'}
                    },
                    {
                        id: 'sep2', type: 'separator',
                        label: ''
                    },
                    {
                        id: 'copy_connection_string',
                        label: '复制连接字符串',
                        icon: <Copy className="w-4 h-4"/>,
                        action: {type: 'copy_connection_string'}
                    },
                    {
                        id: 'copy_connection_info',
                        label: '复制连接信息',
                        icon: <Copy className="w-4 h-4"/>,
                        action: {type: 'copy_connection_info'}
                    },
                    {
                        id: 'view_pool_stats',
                        label: '查看连接池统计',
                        icon: <BarChart className="w-4 h-4"/>,
                        action: {type: 'view_pool_stats'}
                    },
                    {
                        id: 'sep3', type: 'separator',
                        label: ''
                    },
                    {
                        id: 'delete_connection',
                        label: '删除连接',
                        icon: <Trash2 className="w-4 h-4"/>,
                        action: {type: 'delete_connection'},
                        danger: true
                    }
                ]; }

            case 'database':
                return [
                    {
                        id: 'show_measurements',
                        label: '显示所有测量',
                        icon: <Table className="w-4 h-4"/>,
                        action: {type: 'showMeasurements', database: target.name}
                    },
                    {
                        id: 'create_measurement',
                        label: '创建测量',
                        icon: <Plus className="w-4 h-4"/>,
                        action: {type: 'createMeasurement', database: target.name}
                    },
                    {
                        id: 'sep1', type: 'separator',
                        label: ''
                    },
                    {
                        id: 'database_info',
                        label: '数据库信息',
                        icon: <Info className="w-4 h-4"/>,
                        action: {type: 'showDatabaseInfo', database: target.name}
                    },
                    {
                        id: 'database_stats',
                        label: '数据库统计',
                        icon: <BarChart className="w-4 h-4"/>,
                        action: {type: 'showDatabaseStats', database: target.name}
                    },
                    {
                        id: 'sep2', type: 'separator',
                        label: ''
                    },
                    {
                        id: 'export_database',
                        label: '导出数据库',
                        icon: <FileDown className="w-4 h-4"/>,
                        action: {type: 'exportDatabaseStructure', database: target.name}
                    },
                    {
                        id: 'sep3', type: 'separator',
                        label: ''
                    },
                    {
                        id: 'delete_database',
                        label: '删除数据库',
                        icon: <Trash2 className="w-4 h-4"/>,
                        action: {type: 'deleteDatabase', database: target.name},
                        danger: true
                    }
                ];

            case 'measurement':
                return [
                    {
                        id: 'preview_data',
                        label: '预览数据',
                        icon: <Eye className="w-4 h-4"/>,
                        action: {
                            type: 'previewData',
                            database: target.database,
                            measurement: target.name,
                            timeRange: '1h',
                            limit: 100,
                            orderBy: 'time DESC'
                        }
                    },
                    {
                        id: 'query_group',
                        label: '查询操作',
                        type: 'group',
                        children: [
                            {
                                id: 'select_all',
                                label: '查询所有数据',
                                icon: <Search className="w-4 h-4"/>,
                                action: {type: 'generateSQL', sqlType: 'select_all'}
                            },
                            {
                                id: 'select_recent',
                                label: '查询最近数据',
                                icon: <Clock className="w-4 h-4"/>,
                                action: {type: 'generateSQL', sqlType: 'time_series'}
                            },
                            {
                                id: 'count_records',
                                label: '统计记录数',
                                icon: <Hash className="w-4 h-4"/>,
                                action: {type: 'generateSQL', sqlType: 'count_records'}
                            }
                        ]
                    },
                    {
                        id: 'sep1', type: 'separator',
                        label: ''
                    },
                    {
                        id: 'structure_group',
                        label: '结构信息',
                        type: 'group',
                        children: [
                            {
                                id: 'show_fields',
                                label: '显示字段',
                                icon: <Hash className="w-4 h-4"/>,
                                action: {type: 'showFields', database: target.database, measurement: target.name}
                            },
                            {
                                id: 'show_tags',
                                label: '显示标签键',
                                icon: <Tag className="w-4 h-4"/>,
                                action: {type: 'showTagKeys', database: target.database, measurement: target.name}
                            },
                            {
                                id: 'show_series',
                                label: '显示序列',
                                icon: <TrendingUp className="w-4 h-4"/>,
                                action: {type: 'showSeries', database: target.database, measurement: target.name}
                            }
                        ]
                    },
                    {
                        id: 'sep2', type: 'separator',
                        label: ''
                    },
                    {
                        id: 'export_measurement',
                        label: '导出数据',
                        icon: <FileDown className="w-4 h-4"/>,
                        children: [
                            {
                                id: 'export_csv',
                                label: '导出为 CSV',
                                action: {type: 'exportData', format: 'csv', measurement: target.name}
                            },
                            {
                                id: 'export_json',
                                label: '导出为 JSON',
                                action: {type: 'exportData', format: 'json', measurement: target.name}
                            }
                        ]
                    },
                    {
                        id: 'visualize_data',
                        label: '可视化数据',
                        icon: <BarChart className="w-4 h-4"/>,
                        action: {type: 'createChart', database: target.database, measurement: target.name}
                    },
                    {
                        id: 'sep3', type: 'separator',
                        label: ''
                    },
                    {
                        id: 'delete_measurement',
                        label: '删除测量',
                        icon: <Trash2 className="w-4 h-4"/>,
                        action: {type: 'deleteMeasurement', database: target.database, measurement: target.name},
                        danger: true
                    }
                ];

            case 'field_advanced':
                return [
                    {
                        id: 'select_field',
                        label: `查询字段 "${target.name}"`,
                        icon: <Search className="w-4 h-4"/>,
                        action: {
                            type: 'generateSQL',
                            sqlType: 'select_fields',
                            fields: [target.name]
                        }
                    },
                    {
                        id: 'aggregate_group',
                        label: '聚合操作',
                        type: 'group',
                        children: [
                            {
                                id: 'sum_field',
                                label: '求和 (SUM)',
                                icon: <Calculator className="w-4 h-4"/>,
                                action: {
                                    type: 'generateSQL',
                                    sqlType: 'aggregation',
                                    fields: [`SUM(${target.name})`]
                                }
                            },
                            {
                                id: 'avg_field',
                                label: '平均值 (MEAN)',
                                icon: <Calculator className="w-4 h-4"/>,
                                action: {
                                    type: 'generateSQL',
                                    sqlType: 'aggregation',
                                    fields: [`MEAN(${target.name})`]
                                }
                            },
                            {
                                id: 'max_field',
                                label: '最大值 (MAX)',
                                icon: <Calculator className="w-4 h-4"/>,
                                action: {
                                    type: 'generateSQL',
                                    sqlType: 'aggregation',
                                    fields: [`MAX(${target.name})`]
                                }
                            },
                            {
                                id: 'min_field',
                                label: '最小值 (MIN)',
                                icon: <Calculator className="w-4 h-4"/>,
                                action: {
                                    type: 'generateSQL',
                                    sqlType: 'aggregation',
                                    fields: [`MIN(${target.name})`]
                                }
                            }
                        ]
                    },
                    {
                        id: 'sep1', type: 'separator',
                        label: ''
                    },
                    {
                        id: 'visualize_field',
                        label: '可视化字段',
                        icon: <BarChart className="w-4 h-4"/>,
                        action: {
                            type: 'createFieldChart',
                            database: target.database,
                            measurement: target.measurement,
                            field: target.name
                        }
                    },
                    {
                        id: 'sep2', type: 'separator',
                        label: ''
                    },
                    {
                        id: 'copy_field_name',
                        label: '复制字段名',
                        icon: <Copy className="w-4 h-4"/>,
                        action: {type: 'copyToClipboard', text: target.name}
                    }
                ];

            case 'query-editor':
                return [
                    {
                        id: 'execute_query',
                        label: target.hasSelection ? '执行选中查询' : '执行查询',
                        icon: <TrendingUp className="w-4 h-4"/>,
                        action: {type: 'executeQuery'},
                        disabled: !target.canExecute
                    },
                    {
                        id: 'sep1', type: 'separator',
                        label: ''
                    },
                    {
                        id: 'format_query',
                        label: target.hasSelection ? '格式化选中内容' : '格式化查询',
                        icon: <Edit className="w-4 h-4"/>,
                        action: {type: 'formatQuery'}
                    },
                    {
                        id: 'copy_query',
                        label: target.hasSelection ? '复制选中内容' : '复制查询',
                        icon: <Copy className="w-4 h-4"/>,
                        action: {
                            type: 'copyToClipboard',
                            text: target.hasSelection ? target.selectedText : target.query
                        }
                    },
                    {
                        id: 'sep2', type: 'separator',
                        label: ''
                    },
                    {
                        id: 'query_templates',
                        label: '查询模板',
                        icon: <Database className="w-4 h-4"/>,
                        children: [
                            {
                                id: 'template_select_all',
                                label: '查询所有数据',
                                action: {type: 'insertTemplate', template: 'SELECT * FROM measurement_name LIMIT 10'}
                            },
                            {
                                id: 'template_time_range',
                                label: '按时间范围查询',
                                action: {
                                    type: 'insertTemplate',
                                    template: 'SELECT * FROM measurement_name WHERE time >= now() - 1h'
                                }
                            },
                            {
                                id: 'template_aggregation',
                                label: '聚合查询',
                                action: {
                                    type: 'insertTemplate',
                                    template: 'SELECT MEAN(field_name) FROM measurement_name WHERE time >= now() - 1h GROUP BY time(5m)'
                                }
                            },
                            {
                                id: 'template_show_measurements',
                                label: '显示测量',
                                action: {type: 'insertTemplate', template: 'SHOW MEASUREMENTS'}
                            },
                            {
                                id: 'template_show_fields',
                                label: '显示字段',
                                action: {type: 'insertTemplate', template: 'SHOW TIMESERIES device_path.*'}
                            },
                            {
                                id: 'template_show_tags',
                                label: '显示标签',
                                action: {type: 'insertTemplate', template: 'SHOW DEVICES device_path'}
                            }
                        ]
                    },
                    {
                        id: 'sep3', type: 'separator',
                        label: ''
                    },
                    {
                        id: 'explain_query',
                        label: '解释查询',
                        icon: <Info className="w-4 h-4"/>,
                        action: {type: 'explainQuery'},
                        disabled: !target.query.trim()
                    },
                    {
                        id: 'save_query',
                        label: '保存查询',
                        icon: <FileDown className="w-4 h-4"/>,
                        action: {type: 'saveQuery'},
                        disabled: !target.query.trim()
                    },
                    {
                        id: 'sep4', type: 'separator',
                        label: ''
                    },
                    {
                        id: 'comment_toggle',
                        label: '切换注释',
                        icon: <Hash className="w-4 h-4"/>,
                        action: {type: 'toggleComment'},
                        shortcut: 'Ctrl+/'
                    }
                ];

            case 'result-table-cell':
                return [
                    {
                        id: 'copy_cell_value',
                        label: '复制单元格值',
                        icon: <Copy className="w-4 h-4"/>,
                        action: {type: 'copyToClipboard', text: String(target.value || '')}
                    },
                    {
                        id: 'copy_column_name',
                        label: '复制列名',
                        icon: <Copy className="w-4 h-4"/>,
                        action: {type: 'copyToClipboard', text: target.column}
                    },
                    {
                        id: 'sep1', type: 'separator',
                        label: ''
                    },
                    {
                        id: 'filter_by_value',
                        label: `按此值筛选`,
                        icon: <Search className="w-4 h-4"/>,
                        action: {
                            type: 'generateFilterQuery',
                            column: target.column,
                            value: target.value,
                            operator: '='
                        },
                        disabled: target.isNull
                    },
                    {
                        id: 'exclude_by_value',
                        label: `排除此值`,
                        icon: <Search className="w-4 h-4"/>,
                        action: {
                            type: 'generateFilterQuery',
                            column: target.column,
                            value: target.value,
                            operator: '!='
                        },
                        disabled: target.isNull
                    },
                    {
                        id: 'sep2', type: 'separator',
                        label: ''
                    },
                    {
                        id: 'aggregate_column',
                        label: '聚合操作',
                        icon: <Calculator className="w-4 h-4"/>,
                        children: [
                            {
                                id: 'sum_column',
                                label: '求和 (SUM)',
                                action: {type: 'generateAggregateQuery', column: target.column, func: 'SUM'},
                                disabled: !target.isNumber
                            },
                            {
                                id: 'avg_column',
                                label: '平均值 (MEAN)',
                                action: {type: 'generateAggregateQuery', column: target.column, func: 'MEAN'},
                                disabled: !target.isNumber
                            },
                            {
                                id: 'max_column',
                                label: '最大值 (MAX)',
                                action: {type: 'generateAggregateQuery', column: target.column, func: 'MAX'},
                                disabled: !target.isNumber
                            },
                            {
                                id: 'min_column',
                                label: '最小值 (MIN)',
                                action: {type: 'generateAggregateQuery', column: target.column, func: 'MIN'},
                                disabled: !target.isNumber
                            },
                            {
                                id: 'count_column',
                                label: '计数 (COUNT)',
                                action: {type: 'generateAggregateQuery', column: target.column, func: 'COUNT'}
                            }
                        ]
                    },
                    {
                        id: 'sep3', type: 'separator',
                        label: ''
                    },
                    {
                        id: 'chart_column',
                        label: '可视化列',
                        icon: <BarChart className="w-4 h-4"/>,
                        action: {type: 'createColumnChart', column: target.column},
                        disabled: target.isNull
                    },
                    {
                        id: 'sep4', type: 'separator',
                        label: ''
                    },
                    {
                        id: 'export_column',
                        label: '导出列数据',
                        icon: <FileDown className="w-4 h-4"/>,
                        action: {type: 'exportColumn', column: target.column}
                    }
                ];

            default:
                return [];
        }
    };

    // 监听目标变化，生成菜单项
    useEffect(() => {
        if (open && target) {
            const items = customItems || generateMenuItems(target);
            setMenuItems(items);
        }
    }, [open, target, customItems]);

    // 点击外部关闭菜单
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (open) {
                onClose();
            }
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && open) {
                onClose();
            }
        };

        if (open) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('keydown', handleEscape);
        }

        return () => {
            try {
                document.removeEventListener('mousedown', handleClickOutside);
                document.removeEventListener('keydown', handleEscape);
            } catch (error) {
                // 忽略清理事件监听器时的错误，避免 DOM 操作冲突
                console.debug('清理事件监听器时出错:', error);
            }
        };
    }, [open, onClose]);

    // 处理菜单项点击
    const handleItemClick = (item: ContextMenuItem) => {
        if (item.disabled) return;

        if (item.children) {
            // 处理子菜单
            if (submenuOpen === item.id) {
                setSubmenuOpen(null);
            } else {
                setSubmenuOpen(item.id);
                // 计算子菜单位置
                const rect = document.getElementById(`menu-item-${item.id}`)?.getBoundingClientRect();
                if (rect) {
                    setSubmenuPosition({
                        x: rect.right + 5,
                        y: rect.top
                    });
                }
            }
        } else if (item.action) {
            // 执行动作
            onAction(item.action.type, item.action);
            onClose();
        }
    };

    // 渲染菜单项
    const renderMenuItem = (item: ContextMenuItem) => {
        if (item.type === 'separator') {
            return <Separator key={item.id} className="my-1"/>;
        }

        if (item.type === 'group') {
            return (
                <div key={item.id} className="px-2 py-1">
                    <div className="text-xs font-medium text-muted-foreground mb-1">
                        {item.label}
                    </div>
                    {item.children?.map(child => renderMenuItem(child))}
                </div>
            );
        }

        const hasChildren = item.children && item.children.length > 0;
        const isActive = submenuOpen === item.id;

        return (
            <Button
                key={item.id}
                id={`menu-item-${item.id}`}
                variant="ghost"
                size="sm"
                className={cn(
                    "w-full justify-start gap-2 h-8 px-2",
                    item.danger && "text-destructive hover:text-destructive",
                    item.disabled && "opacity-50 cursor-not-allowed",
                    isActive && "bg-accent"
                )}
                onClick={() => handleItemClick(item)}
                disabled={item.disabled}
            >
                {item.icon}
                <span className="flex-1 text-left">{item.label}</span>
                {item.shortcut && (
                    <Badge variant="secondary" className="text-xs">
                        {item.shortcut}
                    </Badge>
                )}
                {hasChildren && <ChevronRight className="w-3 h-3"/>}
            </Button>
        );
    };

    // 渲染子菜单
    const renderSubmenu = (items: ContextMenuItem[]) => {
        return createPortal(
            <Card
                className="absolute z-50 min-w-[200px] p-1 shadow-lg border"
                style={{
                    left: submenuPosition.x,
                    top: submenuPosition.y,
                    maxHeight: '300px',
                    overflowY: 'auto'
                }}
            >
                <CardContent className="p-0">
                    {items.map(item => renderMenuItem(item))}
                </CardContent>
            </Card>,
            document.body
        );
    };

    if (!open) return null;

    // 调整菜单位置以防止超出屏幕
    const menuWidth = 240;
    const menuHeight = Math.min(400, menuItems.length * 32 + 20);
    const adjustedX = x + menuWidth > window.innerWidth ? x - menuWidth : x;
    const adjustedY = y + menuHeight > window.innerHeight ? y - menuHeight : y;

    return createPortal(
        <div className="fixed inset-0 z-40">
            <Card
                className="absolute z-50 min-w-[240px] p-1 shadow-lg border"
                style={{
                    left: adjustedX,
                    top: adjustedY,
                    maxHeight: '400px',
                    overflowY: 'auto'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <CardContent className="p-0">
                    {menuItems.map(item => renderMenuItem(item))}
                </CardContent>
            </Card>

            {/* 渲染子菜单 */}
            {submenuOpen && menuItems.find(item => item.id === submenuOpen)?.children && (
                renderSubmenu(menuItems.find(item => item.id === submenuOpen)!.children!)
            )}
        </div>,
        document.body
    );
};

export default ContextMenu;