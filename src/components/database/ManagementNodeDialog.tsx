import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
    Search, 
    Copy, 
    RefreshCw, 
    Info, 
    Settings, 
    Code, 
    Zap,
    Database,
    Server,
    HardDrive
} from 'lucide-react';
import { safeTauriInvoke } from '@/utils/tauri';
import { showMessage } from '@/utils/message';

interface ManagementNodeDialogProps {
    open: boolean;
    onClose: () => void;
    connectionId: string;
    nodeType: string;
    nodeName: string;
    nodeCategory: string;
}

interface ManagementItem {
    id: string;
    name: string;
    type?: string;
    description?: string;
    properties?: Record<string, any>;
    metadata?: Record<string, any>;
}

export const ManagementNodeDialog: React.FC<ManagementNodeDialogProps> = ({
    open,
    onClose,
    connectionId,
    nodeType,
    nodeName,
    nodeCategory
}) => {
    const [loading, setLoading] = useState(false);
    const [items, setItems] = useState<ManagementItem[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedItem, setSelectedItem] = useState<ManagementItem | null>(null);

    // 获取图标
    const getIcon = () => {
        switch (nodeType) {
            case 'function': return <Code className="w-5 h-5" />;
            case 'trigger': return <Zap className="w-5 h-5" />;
            case 'system_info': return <Server className="w-5 h-5" />;
            case 'version_info': return <Info className="w-5 h-5" />;
            case 'schema_template': return <Database className="w-5 h-5" />;
            default: return <Settings className="w-5 h-5" />;
        }
    };

    // 获取标题
    const getTitle = () => {
        switch (nodeType) {
            case 'function': return 'IoTDB 函数列表';
            case 'trigger': return 'IoTDB 触发器列表';
            case 'system_info': return 'IoTDB 系统信息';
            case 'version_info': return 'IoTDB 版本信息';
            case 'schema_template': return 'IoTDB 模式模板';
            default: return nodeName;
        }
    };

    // 加载数据
    const loadData = async () => {
        if (!open || !connectionId) return;
        
        setLoading(true);
        try {
            console.log(`🔄 加载管理节点数据: ${nodeName} (${nodeType})`);
            
            const childNodes = await safeTauriInvoke('get_tree_children', {
                connectionId,
                parentNodeId: nodeName,
                nodeType
            });

            console.log(`✅ 成功加载管理节点数据: ${nodeName}`, childNodes);

            // 转换数据格式
            const formattedItems: ManagementItem[] = childNodes.map((node: any, index: number) => ({
                id: node.id || `${nodeType}_${index}`,
                name: node.name || node.id || `Item ${index + 1}`,
                type: node.node_type || node.nodeType || nodeType,
                description: node.description || '',
                properties: node.properties || {},
                metadata: node.metadata || {}
            }));

            setItems(formattedItems);
            showMessage.success(`已加载 ${formattedItems.length} 个${getTitle()}项`);
        } catch (error) {
            console.error(`❌ 加载管理节点数据失败: ${nodeName}`, error);
            showMessage.error(`加载${getTitle()}失败: ${error}`);
            setItems([]);
        } finally {
            setLoading(false);
        }
    };

    // 过滤项目
    const filteredItems = items.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    // 复制到剪贴板
    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text).then(() => {
            showMessage.success('已复制到剪贴板');
        }).catch(() => {
            showMessage.error('复制失败');
        });
    };

    // 刷新数据
    const handleRefresh = () => {
        setSearchTerm('');
        setSelectedItem(null);
        loadData();
    };

    // 当弹框打开时加载数据
    useEffect(() => {
        if (open) {
            loadData();
        } else {
            setSearchTerm('');
            setSelectedItem(null);
        }
    }, [open, connectionId, nodeType, nodeName]);

    // 渲染项目列表
    const renderItemList = () => (
        <div className="space-y-2">
            {filteredItems.map((item) => (
                <Card 
                    key={item.id} 
                    className={`cursor-pointer transition-colors hover:bg-accent ${
                        selectedItem?.id === item.id ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => setSelectedItem(item)}
                >
                    <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                {getIcon()}
                                <div>
                                    <div className="font-medium">{item.name}</div>
                                    {item.description && (
                                        <div className="text-sm text-muted-foreground">
                                            {item.description}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                <Badge variant="secondary" className="text-xs">
                                    {item.type}
                                </Badge>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        copyToClipboard(item.name);
                                    }}
                                >
                                    <Copy className="w-3 h-3" />
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );

    // 渲染详情面板
    const renderDetails = () => {
        if (!selectedItem) {
            return (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                    <div className="text-center">
                        <Info className="w-8 h-8 mx-auto mb-2" />
                        <p>选择一个项目查看详情</p>
                    </div>
                </div>
            );
        }

        return (
            <div className="space-y-4">
                <div>
                    <h3 className="font-semibold mb-2">基本信息</h3>
                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">名称:</span>
                            <span className="text-sm font-medium">{selectedItem.name}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">类型:</span>
                            <Badge variant="outline">{selectedItem.type}</Badge>
                        </div>
                        {selectedItem.description && (
                            <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">描述:</span>
                                <span className="text-sm">{selectedItem.description}</span>
                            </div>
                        )}
                    </div>
                </div>

                {Object.keys(selectedItem.properties || {}).length > 0 && (
                    <div>
                        <h3 className="font-semibold mb-2">属性</h3>
                        <div className="space-y-1">
                            {Object.entries(selectedItem.properties || {}).map(([key, value]) => (
                                <div key={key} className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">{key}:</span>
                                    <span className="font-mono">{String(value)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {Object.keys(selectedItem.metadata || {}).length > 0 && (
                    <div>
                        <h3 className="font-semibold mb-2">元数据</h3>
                        <div className="space-y-1">
                            {Object.entries(selectedItem.metadata || {}).map(([key, value]) => (
                                <div key={key} className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">{key}:</span>
                                    <span className="font-mono">{String(value)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[80vh]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {getIcon()}
                        {getTitle()}
                        <Badge variant="outline" className="ml-auto">
                            {filteredItems.length} 项
                        </Badge>
                    </DialogTitle>
                </DialogHeader>

                <div className="flex flex-col gap-4">
                    {/* 工具栏 */}
                    <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="搜索..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-8"
                            />
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleRefresh}
                            disabled={loading}
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                            刷新
                        </Button>
                    </div>

                    {/* 内容区域 */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[500px]">
                        {/* 列表面板 */}
                        <div className="border rounded-lg">
                            <div className="p-3 border-b bg-muted/50">
                                <h3 className="font-medium">项目列表</h3>
                            </div>
                            <div className="h-[450px] p-3 overflow-auto">
                                {loading ? (
                                    <div className="flex items-center justify-center h-full">
                                        <RefreshCw className="w-6 h-6 animate-spin" />
                                        <span className="ml-2">加载中...</span>
                                    </div>
                                ) : filteredItems.length > 0 ? (
                                    renderItemList()
                                ) : (
                                    <div className="flex items-center justify-center h-full text-muted-foreground">
                                        <div className="text-center">
                                            <HardDrive className="w-8 h-8 mx-auto mb-2" />
                                            <p>没有找到项目</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 详情面板 */}
                        <div className="border rounded-lg">
                            <div className="p-3 border-b bg-muted/50">
                                <h3 className="font-medium">详细信息</h3>
                            </div>
                            <div className="h-[450px] p-3 overflow-auto">
                                {renderDetails()}
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};
