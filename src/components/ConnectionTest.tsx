import React, {useState} from 'react';
import {useForm} from 'react-hook-form';
import {useConnection} from '@/hooks/useConnection';
import {Button, Form, FormField, FormItem, FormLabel, FormControl, FormMessage, Input, InputNumber, Switch, Typography} from '@/components/ui';
import {showNotification} from '@/utils/message';

interface ConnectionConfig {
    id: string;
    name: string;
    host: string;
    port: number;
    username?: string;
    password?: string;
    database?: string;
    ssl: boolean;
    timeout: number;
    created_at: string;
    updated_at: string;
}

interface ConnectionTestResult {
    success: boolean;
    latency?: number;
    error?: string;
    server_version?: string;
}

const ConnectionTest: React.FC = () => {
    const form = useForm();
    const {createTempConnectionForTest, testConnection, deleteTempConnection} = useConnection();
    const [loading, setLoading] = useState(false);
    const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);

    const handleTest = async (values: Record<string, string | number>) => {
        setLoading(true);
        setTestResult(null);

        try {
            // 创建连接配置
            const config: Partial<ConnectionConfig> = {
                id: `test-${Date.now()}`,
                name: values.name || 'Test Connection',
                host: values.host,
                port: values.port,
                username: values.username,
                password: values.password,
                database: values.database,
                ssl: values.ssl || false,
                timeout: values.timeout || 30,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            // 使用专门的临时连接创建函数（不添加到前端状态）
            const connectionId = await createTempConnectionForTest(config);

            try {
                // 测试连接
                const result = await testConnection(connectionId);

                setTestResult(result);

                if (result.success) {
                    showNotification.success({
                        message: "连接成功",
                        description: `延迟: ${result.latency}ms`
                    });
                } else {
                    showNotification.error({
                        message: "连接失败",
                        description: result.error || '未知错误'
                    });
                }
            } finally {
                // 清理测试连接
                await deleteTempConnection(connectionId);
            }

        } catch (error) {
            console.error('连接测试失败:', error);
            showNotification.error({
                message: "连接测试失败",
                description: String(error)
            });
            setTestResult({
                success: false,
                error: String(error)
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-2xl mx-auto">
            <div title="InfluxDB 连接测试" className="mb-6">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleTest)} className="space-y-6">
                    <FormField
                        control={form.control}
                        name="name"
                        rules={{ required: '请输入连接名称' }}
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>连接名称</FormLabel>
                                <FormControl>
                                    <Input placeholder="例如: 本地 InfluxDB" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="host"
                        rules={{ required: '请输入主机地址' }}
                        defaultValue="localhost"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>主机地址</FormLabel>
                                <FormControl>
                                    <Input placeholder="localhost 或 IP 地址" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="port"
                        rules={{ required: '请输入端口号' }}
                        defaultValue={8086}
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>端口</FormLabel>
                                <FormControl>
                                    <InputNumber
                                        min={1}
                                        max={65535}
                                        className="w-full"
                                        value={field.value}
                                        onChange={field.onChange}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="username"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>用户名</FormLabel>
                                <FormControl>
                                    <Input placeholder="可选" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>密码</FormLabel>
                                <FormControl>
                                    <Input type="password" placeholder="可选" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="database"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>数据库</FormLabel>
                                <FormControl>
                                    <Input placeholder="可选，默认连接后选择" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="ssl"
                        defaultValue={false}
                        render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                    <FormLabel className="text-base">使用 SSL</FormLabel>
                                </div>
                                <FormControl>
                                    <Switch
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                    />
                                </FormControl>
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="timeout"
                        rules={{ required: '请输入超时时间' }}
                        defaultValue={30}
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>超时时间 (秒)</FormLabel>
                                <FormControl>
                                    <InputNumber
                                        min={1}
                                        max={300}
                                        className="w-full"
                                        value={field.value}
                                        onChange={field.onChange}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormItem>
                        <Button
                            type="submit"
                            disabled={loading}
                            size="lg"
                            className="w-full">
                            {loading ? '测试中...' : '测试连接'}
                        </Button>
                    </FormItem>
                    </form>
                </Form>
            </div>

            {/* 测试结果 */}
            {testResult && (
                <div
                    title="测试结果"
                    className={`mb-6 ${testResult.success ? 'border-green-500' : 'border-red-500'}`}>
                    <div className="space-y-2">
                        <div className="flex items-center">
                            <Typography.Text className="font-medium mr-2">状态:</Typography.Text>
                            <span className={testResult.success ? 'text-success' : 'text-destructive'}>
                {testResult.success ? '✅ 连接成功' : '❌ 连接失败'}
              </span>
                        </div>

                        {testResult.latency && (
                            <div className="flex items-center">
                                <Typography.Text className="font-medium mr-2">延迟:</Typography.Text>
                                <span className="text-primary">{testResult.latency} ms</span>
                            </div>
                        )}

                        {testResult.server_version && (
                            <div className="flex items-center">
                                <Typography.Text className="font-medium mr-2">服务器版本:</Typography.Text>
                                <span className="text-muted-foreground">{testResult.server_version}</span>
                            </div>
                        )}

                        {testResult.error && (
                            <div className="flex items-start">
                                <Typography.Text className="font-medium mr-2">错误:</Typography.Text>
                                <span className="text-destructive break-all">{testResult.error}</span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* 使用说明 */}
            <div title="使用说明" size="small">
                <div className="text-sm text-muted-foreground space-y-2">
                    <p>• 确保 InfluxDB 服务正在运行</p>
                    <p>• 默认端口通常是 8086</p>
                    <p>• 如果启用了认证，请提供用户名和密码</p>
                    <p>• SSL 连接需要服务器支持 HTTPS</p>
                </div>
            </div>
        </div>
    );
};

export default ConnectionTest;
