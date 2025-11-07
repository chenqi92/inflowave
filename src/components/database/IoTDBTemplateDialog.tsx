import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { safeTauriInvoke } from '@/utils/tauri';
import { showMessage } from '@/utils/message';
import { Loader2, Plus, Trash2, FileText, Upload, Download, X } from 'lucide-react';
import logger from '@/utils/logger';

// IoTDB 模板信息接口
interface TemplateInfo {
  name: string;
  measurements: string[];
  data_types: string[];
  encodings: string[];
  compressions: string[];
}

// 时间序列配置接口
interface TimeSeriesConfig {
  id: string;
  measurement: string;
  dataType: string;
  encoding: string;
  compression: string;
}

interface IoTDBTemplateDialogProps {
  open: boolean;
  onClose: () => void;
  connectionId: string;
  mode?: 'list' | 'create' | 'mount';
  devicePath?: string;
}

// IoTDB 数据类型选项
const DATA_TYPES = ['BOOLEAN', 'INT32', 'INT64', 'FLOAT', 'DOUBLE', 'TEXT'];

// IoTDB 编码方式选项
const ENCODINGS = ['PLAIN', 'RLE', 'TS_2DIFF', 'GORILLA', 'DICTIONARY'];

// IoTDB 压缩方式选项
const COMPRESSIONS = ['UNCOMPRESSED', 'SNAPPY', 'GZIP', 'LZ4', 'ZSTD'];

export default function IoTDBTemplateDialog({
  open,
  onClose,
  connectionId,
  mode = 'list',
  devicePath,
}: IoTDBTemplateDialogProps) {
  const [currentMode, setCurrentMode] = useState<'list' | 'create' | 'mount'>(mode);
  const [templates, setTemplates] = useState<string[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [templateInfo, setTemplateInfo] = useState<TemplateInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingInfo, setLoadingInfo] = useState(false);

  // 创建模板表单状态
  const [newTemplateName, setNewTemplateName] = useState('');
  const [timeSeries, setTimeSeries] = useState<TimeSeriesConfig[]>([]);

  // 挂载模板表单状态
  const [mountTemplateName, setMountTemplateName] = useState('');
  const [mountPath, setMountPath] = useState(devicePath || '');

  // 加载模板列表
  const loadTemplates = async () => {
    if (!connectionId) return;
    setLoading(true);
    try {
      const result = await safeTauriInvoke<string[]>('get_iotdb_templates', {
        connectionId,
      });
      setTemplates(result);
    } catch (error: any) {
      logger.error('加载模板列表失败:', error);
      showMessage.error(`加载模板列表失败: ${error.message || error}`);
    } finally {
      setLoading(false);
    }
  };

  // 加载模板详情
  const loadTemplateInfo = async (templateName: string) => {
    if (!connectionId || !templateName) return;
    setLoadingInfo(true);
    try {
      const result = await safeTauriInvoke<TemplateInfo>('get_iotdb_template_info', {
        connectionId,
        templateName,
      });
      setTemplateInfo(result);
    } catch (error: any) {
      logger.error('加载模板详情失败:', error);
      showMessage.error(`加载模板详情失败: ${error.message || error}`);
    } finally {
      setLoadingInfo(false);
    }
  };

  // 创建模板
  const handleCreateTemplate = async () => {
    if (!newTemplateName.trim()) {
      showMessage.error('请输入模板名称');
      return;
    }
    if (timeSeries.length === 0) {
      showMessage.error('请至少添加一个时间序列');
      return;
    }

    setLoading(true);
    try {
      const templateInfo: TemplateInfo = {
        name: newTemplateName,
        measurements: timeSeries.map((ts) => ts.measurement),
        data_types: timeSeries.map((ts) => ts.dataType),
        encodings: timeSeries.map((ts) => ts.encoding),
        compressions: timeSeries.map((ts) => ts.compression),
      };

      await safeTauriInvoke('create_iotdb_template', {
        connectionId,
        templateInfo,
      });

      showMessage.success('模板创建成功');
      setNewTemplateName('');
      setTimeSeries([]);
      setCurrentMode('list');
      await loadTemplates();
    } catch (error: any) {
      logger.error('创建模板失败:', error);
      showMessage.error(`创建模板失败: ${error.message || error}`);
    } finally {
      setLoading(false);
    }
  };

  // 挂载模板
  const handleMountTemplate = async () => {
    if (!mountTemplateName) {
      showMessage.error('请选择要挂载的模板');
      return;
    }
    if (!mountPath.trim()) {
      showMessage.error('请输入设备路径');
      return;
    }

    setLoading(true);
    try {
      await safeTauriInvoke('mount_iotdb_template', {
        connectionId,
        templateName: mountTemplateName,
        path: mountPath,
      });

      showMessage.success('模板挂载成功');
      setMountTemplateName('');
      setMountPath('');
      setCurrentMode('list');
    } catch (error: any) {
      logger.error('挂载模板失败:', error);
      showMessage.error(`挂载模板失败: ${error.message || error}`);
    } finally {
      setLoading(false);
    }
  };

  // 卸载模板
  const handleUnmountTemplate = async (templateName: string, path: string) => {
    if (!path.trim()) {
      showMessage.error('请输入设备路径');
      return;
    }

    setLoading(true);
    try {
      await safeTauriInvoke('unmount_iotdb_template', {
        connectionId,
        templateName,
        path,
      });

      showMessage.success('模板卸载成功');
    } catch (error: any) {
      logger.error('卸载模板失败:', error);
      showMessage.error(`卸载模板失败: ${error.message || error}`);
    } finally {
      setLoading(false);
    }
  };

  // 删除模板
  const handleDeleteTemplate = async (templateName: string) => {
    if (!confirm(`确定要删除模板 "${templateName}" 吗？`)) {
      return;
    }

    setLoading(true);
    try {
      await safeTauriInvoke('drop_iotdb_template', {
        connectionId,
        templateName,
      });

      showMessage.success('模板删除成功');
      setSelectedTemplate(null);
      setTemplateInfo(null);
      await loadTemplates();
    } catch (error: any) {
      logger.error('删除模板失败:', error);
      showMessage.error(`删除模板失败: ${error.message || error}`);
    } finally {
      setLoading(false);
    }
  };

  // 添加时间序列
  const handleAddTimeSeries = () => {
    const newId = `ts-${Date.now()}`;
    setTimeSeries([
      ...timeSeries,
      {
        id: newId,
        measurement: '',
        dataType: 'FLOAT',
        encoding: 'PLAIN',
        compression: 'SNAPPY',
      },
    ]);
  };

  // 删除时间序列
  const handleRemoveTimeSeries = (id: string) => {
    setTimeSeries(timeSeries.filter((ts) => ts.id !== id));
  };

  // 更新时间序列
  const handleUpdateTimeSeries = (id: string, field: keyof TimeSeriesConfig, value: string) => {
    setTimeSeries(
      timeSeries.map((ts) => (ts.id === id ? { ...ts, [field]: value } : ts))
    );
  };

  // 初始化
  useEffect(() => {
    if (open && connectionId) {
      setCurrentMode(mode);
      if (mode === 'list' || mode === 'mount') {
        loadTemplates();
      }
      if (mode === 'mount' && devicePath) {
        setMountPath(devicePath);
      }
    }
  }, [open, connectionId, mode, devicePath]);

  // 选择模板时加载详情
  useEffect(() => {
    if (selectedTemplate) {
      loadTemplateInfo(selectedTemplate);
    } else {
      setTemplateInfo(null);
    }
  }, [selectedTemplate]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>IoTDB 模板管理</DialogTitle>
        </DialogHeader>

        <Tabs value={currentMode} onValueChange={(value) => setCurrentMode(value as any)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="list">模板列表</TabsTrigger>
            <TabsTrigger value="create">创建模板</TabsTrigger>
            <TabsTrigger value="mount">挂载模板</TabsTrigger>
          </TabsList>

          {/* 模板列表标签页 */}
          <TabsContent value="list" className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              {/* 左侧：模板列表 */}
              <Card className="col-span-1">
                <CardHeader>
                  <CardTitle className="text-base">模板列表</CardTitle>
                  <CardDescription>
                    共 {templates.length} 个模板
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    {loading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : templates.length === 0 ? (
                      <div className="text-center text-muted-foreground py-8">
                        <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>暂无模板</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {templates.map((template) => (
                          <div
                            key={template}
                            className={`p-3 rounded-md border cursor-pointer transition-colors ${
                              selectedTemplate === template
                                ? 'bg-primary/10 border-primary'
                                : 'hover:bg-muted'
                            }`}
                            onClick={() => setSelectedTemplate(template)}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium">{template}</span>
                              {selectedTemplate === template && (
                                <Badge variant="default" className="text-xs">
                                  已选择
                                </Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* 右侧：模板详情 */}
              <Card className="col-span-2">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">模板详情</CardTitle>
                      <CardDescription>
                        {selectedTemplate ? `模板: ${selectedTemplate}` : '请选择一个模板'}
                      </CardDescription>
                    </div>
                    {selectedTemplate && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteTemplate(selectedTemplate)}
                        disabled={loading}
                      >
                        {loading ? (
                          <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4 mr-1" />
                        )}
                        删除模板
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    {!selectedTemplate ? (
                      <div className="text-center text-muted-foreground py-16">
                        <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                        <p>请从左侧选择一个模板查看详情</p>
                      </div>
                    ) : loadingInfo ? (
                      <div className="flex items-center justify-center py-16">
                        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                      </div>
                    ) : templateInfo ? (
                      <div className="space-y-4">
                        <div>
                          <h3 className="text-sm font-semibold mb-2">基本信息</h3>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <span className="text-muted-foreground">模板名称:</span>
                              <span className="ml-2 font-medium">{templateInfo.name}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">时间序列数量:</span>
                              <span className="ml-2 font-medium">{templateInfo.measurements.length}</span>
                            </div>
                          </div>
                        </div>

                        <Separator />

                        <div>
                          <h3 className="text-sm font-semibold mb-2">时间序列配置</h3>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>测点名称</TableHead>
                                <TableHead>数据类型</TableHead>
                                <TableHead>编码方式</TableHead>
                                <TableHead>压缩方式</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {templateInfo.measurements.map((measurement, index) => (
                                <TableRow key={index}>
                                  <TableCell className="font-medium">{measurement}</TableCell>
                                  <TableCell>
                                    <Badge variant="outline">
                                      {templateInfo.data_types[index]}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="outline">
                                      {templateInfo.encodings[index]}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="outline">
                                      {templateInfo.compressions[index]}
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center text-muted-foreground py-16">
                        <p>加载模板详情失败</p>
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* 创建模板标签页 */}
          <TabsContent value="create" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">创建新模板</CardTitle>
                <CardDescription>
                  定义模板名称和时间序列配置
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 模板名称 */}
                <div className="space-y-2">
                  <Label htmlFor="template-name">模板名称 *</Label>
                  <Input
                    id="template-name"
                    placeholder="例如: temperature_sensor_template"
                    value={newTemplateName}
                    onChange={(e) => setNewTemplateName(e.target.value)}
                  />
                </div>

                <Separator />

                {/* 时间序列配置 */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>时间序列配置 *</Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleAddTimeSeries}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      添加时间序列
                    </Button>
                  </div>

                  <ScrollArea className="h-[350px] border rounded-md p-4">
                    {timeSeries.length === 0 ? (
                      <div className="text-center text-muted-foreground py-8">
                        <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>暂无时间序列配置</p>
                        <p className="text-sm mt-1">点击上方按钮添加</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {timeSeries.map((ts, index) => (
                          <Card key={ts.id}>
                            <CardHeader className="pb-3">
                              <div className="flex items-center justify-between">
                                <CardTitle className="text-sm">
                                  时间序列 #{index + 1}
                                </CardTitle>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveTimeSeries(ts.id)}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                  <Label htmlFor={`measurement-${ts.id}`}>
                                    测点名称 *
                                  </Label>
                                  <Input
                                    id={`measurement-${ts.id}`}
                                    placeholder="例如: temperature"
                                    value={ts.measurement}
                                    onChange={(e) =>
                                      handleUpdateTimeSeries(ts.id, 'measurement', e.target.value)
                                    }
                                  />
                                </div>

                                <div className="space-y-2">
                                  <Label htmlFor={`dataType-${ts.id}`}>
                                    数据类型 *
                                  </Label>
                                  <Select
                                    value={ts.dataType}
                                    onValueChange={(value) =>
                                      handleUpdateTimeSeries(ts.id, 'dataType', value)
                                    }
                                  >
                                    <SelectTrigger id={`dataType-${ts.id}`}>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {DATA_TYPES.map((type) => (
                                        <SelectItem key={type} value={type}>
                                          {type}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div className="space-y-2">
                                  <Label htmlFor={`encoding-${ts.id}`}>
                                    编码方式 *
                                  </Label>
                                  <Select
                                    value={ts.encoding}
                                    onValueChange={(value) =>
                                      handleUpdateTimeSeries(ts.id, 'encoding', value)
                                    }
                                  >
                                    <SelectTrigger id={`encoding-${ts.id}`}>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {ENCODINGS.map((encoding) => (
                                        <SelectItem key={encoding} value={encoding}>
                                          {encoding}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div className="space-y-2">
                                  <Label htmlFor={`compression-${ts.id}`}>
                                    压缩方式 *
                                  </Label>
                                  <Select
                                    value={ts.compression}
                                    onValueChange={(value) =>
                                      handleUpdateTimeSeries(ts.id, 'compression', value)
                                    }
                                  >
                                    <SelectTrigger id={`compression-${ts.id}`}>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {COMPRESSIONS.map((compression) => (
                                        <SelectItem key={compression} value={compression}>
                                          {compression}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </div>

                {/* 操作按钮 */}
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setNewTemplateName('');
                      setTimeSeries([]);
                      setCurrentMode('list');
                    }}
                  >
                    取消
                  </Button>
                  <Button
                    onClick={handleCreateTemplate}
                    disabled={loading || !newTemplateName.trim() || timeSeries.length === 0}
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4 mr-1" />
                    )}
                    创建模板
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 挂载模板标签页 */}
          <TabsContent value="mount" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">挂载模板到设备</CardTitle>
                <CardDescription>
                  选择模板并指定设备路径进行挂载
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 选择模板 */}
                <div className="space-y-2">
                  <Label htmlFor="mount-template">选择模板 *</Label>
                  <Select
                    value={mountTemplateName}
                    onValueChange={setMountTemplateName}
                  >
                    <SelectTrigger id="mount-template">
                      <SelectValue placeholder="请选择要挂载的模板" />
                    </SelectTrigger>
                    <SelectContent>
                      {loading ? (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="w-4 h-4 animate-spin" />
                        </div>
                      ) : templates.length === 0 ? (
                        <div className="text-center text-muted-foreground py-4 text-sm">
                          暂无可用模板
                        </div>
                      ) : (
                        templates.map((template) => (
                          <SelectItem key={template} value={template}>
                            {template}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* 设备路径 */}
                <div className="space-y-2">
                  <Label htmlFor="mount-path">设备路径 *</Label>
                  <Input
                    id="mount-path"
                    placeholder="例如: root.sg1.d1"
                    value={mountPath}
                    onChange={(e) => setMountPath(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    请输入完整的设备路径，例如: root.sg1.d1
                  </p>
                </div>

                <Separator />

                {/* 操作按钮 */}
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setMountTemplateName('');
                      setMountPath('');
                      setCurrentMode('list');
                    }}
                  >
                    取消
                  </Button>
                  <Button
                    onClick={handleMountTemplate}
                    disabled={loading || !mountTemplateName || !mountPath.trim()}
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4 mr-1" />
                    )}
                    挂载模板
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* 卸载模板区域 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">卸载模板</CardTitle>
                <CardDescription>
                  从设备路径卸载已挂载的模板
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 选择模板 */}
                <div className="space-y-2">
                  <Label htmlFor="unmount-template">选择模板 *</Label>
                  <Select
                    value={mountTemplateName}
                    onValueChange={setMountTemplateName}
                  >
                    <SelectTrigger id="unmount-template">
                      <SelectValue placeholder="请选择要卸载的模板" />
                    </SelectTrigger>
                    <SelectContent>
                      {loading ? (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="w-4 h-4 animate-spin" />
                        </div>
                      ) : templates.length === 0 ? (
                        <div className="text-center text-muted-foreground py-4 text-sm">
                          暂无可用模板
                        </div>
                      ) : (
                        templates.map((template) => (
                          <SelectItem key={template} value={template}>
                            {template}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* 设备路径 */}
                <div className="space-y-2">
                  <Label htmlFor="unmount-path">设备路径 *</Label>
                  <Input
                    id="unmount-path"
                    placeholder="例如: root.sg1.d1"
                    value={mountPath}
                    onChange={(e) => setMountPath(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    请输入要卸载模板的设备路径
                  </p>
                </div>

                <Separator />

                {/* 操作按钮 */}
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setMountTemplateName('');
                      setMountPath('');
                    }}
                  >
                    清空
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleUnmountTemplate(mountTemplateName, mountPath)}
                    disabled={loading || !mountTemplateName || !mountPath.trim()}
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4 mr-1" />
                    )}
                    卸载模板
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

