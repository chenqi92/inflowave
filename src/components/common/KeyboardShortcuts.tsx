import React from 'react';
import { Typography, Tag, Separator } from '@/components/ui';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import {
  Settings,
  File,
  Edit,
  Eye,
  Database,
  Wrench,
  Grid3X3,
  HelpCircle,
} from 'lucide-react';

const { Title, Text } = Typography;

interface KeyboardShortcutsProps {
  visible: boolean;
  onClose: () => void;
}

const KeyboardShortcuts: React.FC<KeyboardShortcutsProps> = ({
  visible,
  onClose,
}) => {
  // 快捷键数据
  const shortcutCategories = [
    {
      title: '文件操作',
      icon: <File className='w-4 h-4' />,
      shortcuts: [
        { key: 'Ctrl+N', description: '新建SQL查询' },
        { key: 'Ctrl+Q', description: '退出应用' },
      ],
    },
    {
      title: '编辑操作',
      icon: <Edit className='w-4 h-4' />,
      shortcuts: [
        { key: 'Ctrl+Z', description: '撤销' },
        { key: 'Ctrl+Y', description: '重做' },
        { key: 'Ctrl+X', description: '剪切' },
        { key: 'Ctrl+C', description: '复制' },
        { key: 'Ctrl+V', description: '粘贴' },
        { key: 'Ctrl+F', description: '查找' },
        { key: 'Ctrl+H', description: '替换' },
        { key: 'Ctrl+Shift+P', description: '全局搜索' },
      ],
    },
    {
      title: '视图导航',
      icon: <Eye className='w-4 h-4' />,
      shortcuts: [
        { key: 'Ctrl+1', description: '仪表板' },
        { key: 'Ctrl+2', description: '连接管理' },
        { key: 'Ctrl+3', description: '数据查询' },
        { key: 'Ctrl+4', description: '数据库管理' },
        { key: 'Ctrl+B', description: '切换侧边栏' },
        { key: 'Ctrl+Plus', description: '放大' },
        { key: 'Ctrl+Minus', description: '缩小' },
        { key: 'Ctrl+0', description: '重置缩放' },
      ],
    },
    {
      title: '数据库操作',
      icon: <Database className='w-4 h-4' />,
      shortcuts: [
        { key: 'Ctrl+Shift+N', description: '新建连接' },
        { key: 'Ctrl+T', description: '测试连接' },
        { key: 'F5', description: '刷新结构' },
        { key: 'Ctrl+Enter', description: '执行查询' },
        { key: 'Ctrl+Shift+C', description: '停止查询' },
      ],
    },
    {
      title: '工具功能',
      icon: <Wrench className='w-4 h-4' />,
      shortcuts: [
        { key: 'Ctrl+Comma', description: '应用设置' },
        { key: 'F1', description: '用户手册' },
      ],
    },
    {
      title: '窗口管理',
      icon: <Grid3X3 className='w-4 h-4' />,
      shortcuts: [
        { key: 'Ctrl+M', description: '最小化' },
        { key: 'F11', description: '全屏' },
        { key: 'Escape', description: '退出全屏' },
        { key: 'F12', description: '开发者工具' },
      ],
    },
  ];


  return (
    <Dialog open={visible} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className='flex gap-2'>
            <Settings className='w-4 h-4' />
            <span>键盘快捷键</span>
          </DialogTitle>
        </DialogHeader>
      <div style={{ maxHeight: '70vh', overflowY: 'auto' }}>
        {shortcutCategories.map((category, index) => (
          <div key={category.title} style={{ marginBottom: 24 }}>
            <Title level={4} style={{ marginBottom: 16 }}>
              <div className='flex gap-2'>
                {category.icon}
                {category.title}
              </div>
            </Title>

            <Table className="mb-4">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-1/3">快捷键</TableHead>
                  <TableHead>描述</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {category.shortcuts.map((shortcut) => (
                  <TableRow key={shortcut.key}>
                    <TableCell className="font-mono">
                      {shortcut.key.split('+').map((key, index) => (
                        <span key={index}>
                          {index > 0 && ' + '}
                          <Tag variant="secondary" className="text-xs">
                            {key}
                          </Tag>
                        </span>
                      ))}
                    </TableCell>
                    <TableCell>{shortcut.description}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {index < shortcutCategories.length - 1 && <Separator />}
          </div>
        ))}

        <div
          style={{
            marginTop: 24,
            padding: 16,
            backgroundColor: '#f5f5f5',
            borderRadius: 6,
          }}
        >
          <div className='flex gap-2'>
            <HelpCircle className='w-4 h-4' style={{ color: '#1890ff' }} />
            <Text type='secondary'>
              提示：大部分快捷键在相应的功能页面中生效。某些快捷键可能因操作系统而异。
            </Text>
          </div>
        </div>
      </div>
      </DialogContent>
    </Dialog>
  );
};

export default KeyboardShortcuts;
