import React from 'react';
import {
  Text,
  Tag,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Separator,
} from '@/components/ui';

import {
  Database,
  Info,
  Bug,
  Heart,
  Rocket,
  Users,
  Wrench,
  Github,
} from 'lucide-react';

import { getVersionInfo } from '@/utils/version';

interface AboutDialogProps {
  visible: boolean;
  onClose: () => void;
}

const AboutDialog: React.FC<AboutDialogProps> = ({ visible, onClose }) => {
  const versionInfo = getVersionInfo();
  const appInfo = {
    name: 'InfloWave',
    version: versionInfo.version,
    description: '现代化的 InfluxDB 数据库管理工具',
    author: 'KKAPE',
    license: 'MIT',
    repository: 'https://github.com/chenqi92/inflowave',
    website: 'https://inflowave.kkape.com',
  };

  const features = [
    '直观的数据库连接管理',
    '强大的查询编辑器',
    '实时数据可视化',
    '性能监控和分析',
    '数据导入导出',
    '多主题支持',
    '跨平台兼容',
  ];

  const techStack = [
    { name: 'Tauri', color: 'blue' },
    { name: 'React', color: 'cyan' },
    { name: 'TypeScript', color: 'geekblue' },
    { name: 'Shadcn/ui', color: 'purple' },
    { name: 'Rust', color: 'orange' },
    { name: 'InfluxDB', color: 'green' },
  ];

  return (
    <Dialog open={visible} onOpenChange={onClose}>
      <DialogContent className='max-w-3xl max-h-[80vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <Database className='w-5 h-5 text-primary' />
            <span>关于 {appInfo.name}</span>
          </DialogTitle>
        </DialogHeader>
        <div style={{ padding: '16px 0' }}>
          {/* 应用信息 */}
          <div className='grid grid-cols-1 gap-4'>
            <div>
              <div className='text-center mb-6'>
                <Database className='w-16 h-16 text-primary mx-auto mb-4' />
                <Text className='text-2xl font-bold block'>{appInfo.name}</Text>
                <Text className='text-muted-foreground text-base'>
                  版本 {appInfo.version}
                </Text>
              </div>

              <Text className='block text-center text-base'>
                {appInfo.description}
              </Text>
            </div>
          </div>

          <Separator />

          {/* 主要功能 */}
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <div className='space-y-2'>
              <div className='flex items-center gap-2 mb-3'>
                <Rocket className='w-4 h-4' />
                <Text className='font-semibold'>主要功能</Text>
              </div>
              <ul className='space-y-2 pl-5'>
                {features.map((feature, index) => (
                  <li key={index}>
                    <Text>{feature}</Text>
                  </li>
                ))}
              </ul>
            </div>

            <div className='space-y-2'>
              <div className='flex items-center gap-2 mb-3'>
                <Wrench className='w-4 h-4' />
                <Text className='font-semibold'>技术栈</Text>
              </div>
              <div className='flex flex-wrap gap-2'>
                {techStack.map(tech => (
                  <Tag key={tech.name} variant='secondary'>
                    {tech.name}
                  </Tag>
                ))}
              </div>
            </div>
          </div>

          <Separator />

          {/* 项目信息 */}
          <div className='space-y-4'>
            <div className='flex items-center gap-2 mb-4'>
              <Info className='w-4 h-4' />
              <Text className='font-semibold'>项目信息</Text>
            </div>

            <div className='space-y-3'>
              <div className='flex justify-between items-center'>
                <Text className='font-medium'>开发团队:</Text>
                <div className='flex items-center gap-2'>
                  <Users className='w-4 h-4' />
                  <Text>{appInfo.author}</Text>
                </div>
              </div>

              <div className='flex justify-between items-center'>
                <Text className='font-medium'>开源许可:</Text>
                <Tag variant='outline'>{appInfo.license}</Tag>
              </div>

              <div className='flex justify-between items-center'>
                <Text className='font-medium'>项目地址:</Text>
                <a
                  href={appInfo.repository}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='flex items-center gap-2 text-primary hover:text-blue-800 transition-colors'
                >
                  <Github className='w-4 h-4' />
                  <span>GitHub 仓库</span>
                </a>
              </div>

              <div className='flex justify-between items-center'>
                <Text className='font-medium'>官方网站:</Text>
                <a
                  href={appInfo.website}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='text-primary hover:text-blue-800 transition-colors'
                >
                  {appInfo.website}
                </a>
              </div>
            </div>
          </div>

          <Separator />

          {/* 支持信息 */}
          <div>
            <div className='text-center space-y-4'>
              <div className='flex items-center justify-center gap-2'>
                <Heart className='w-4 h-4 text-destructive' />
                <Text>感谢您使用 {appInfo.name}！</Text>
              </div>

              <Text className='text-muted-foreground'>
                如果您遇到问题或有建议，请通过以下方式联系我们：
              </Text>

              <div className='flex items-center justify-center gap-4'>
                <a
                  href={`${appInfo.repository}/issues`}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='flex items-center gap-2 text-primary hover:text-blue-800 transition-colors'
                >
                  <Bug className='w-4 h-4' />
                  <span>报告问题</span>
                </a>

                <Separator orientation='vertical' className='h-4' />

                <a
                  href={`${appInfo.repository}/discussions`}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='flex items-center gap-2 text-primary hover:text-blue-800 transition-colors'
                >
                  <Users className='w-4 h-4' />
                  <span>社区讨论</span>
                </a>
              </div>
            </div>
          </div>

          {/* 版权信息 */}
          <div className='text-center mt-6'>
            <Text className='text-muted-foreground text-xs'>
              © 2024 {appInfo.author}. All rights reserved.
            </Text>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AboutDialog;
