import React from 'react';
import {
  Text,
  Tag,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Separator,
  Button,
  Card,
  CardContent,
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
  ExternalLink,
  Star,
  Code2,
  Sparkles,
  Globe,
  Mail,
  MessageSquare,
} from 'lucide-react';

import { getVersionInfo } from '@/utils/version';
import { openExternalLink } from '@/utils/externalLinks';

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
      <DialogContent className='max-w-4xl max-h-[90vh] p-0 flex flex-col gap-0 overflow-hidden'>
        {/* 渐变背景头部 */}
        <div className='relative bg-gradient-to-br from-primary/10 via-primary/5 to-background px-8 py-10 border-b shrink-0'>
          <div className='absolute inset-0 bg-grid-white/5 [mask-image:linear-gradient(0deg,transparent,black)]' />
          <div className='relative'>
            <div className='flex items-start justify-between'>
              <div className='flex items-center gap-4'>
                {/* 应用图标 */}
                <div className='relative'>
                  <div className='absolute inset-0 bg-primary/20 blur-xl rounded-full' />
                  <div className='relative bg-gradient-to-br from-primary to-primary/80 p-4 rounded-2xl shadow-lg'>
                    <Database className='w-10 h-10 text-primary-foreground' />
                  </div>
                </div>

                {/* 应用名称和版本 */}
                <div>
                  <DialogTitle className='text-3xl font-bold mb-1 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent'>
                    {appInfo.name}
                  </DialogTitle>
                  <div className='flex items-center gap-2'>
                    <Tag variant='secondary' className='text-xs font-mono'>
                      v{appInfo.version}
                    </Tag>
                    <Tag variant='outline' className='text-xs'>
                      {appInfo.license}
                    </Tag>
                  </div>
                </div>
              </div>

              {/* 快捷操作按钮 */}
              <div className='flex gap-2'>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => openExternalLink(appInfo.repository)}
                  className='gap-2'
                >
                  <Github className='w-4 h-4' />
                  <span className='hidden sm:inline'>GitHub</span>
                </Button>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => openExternalLink(appInfo.website)}
                  className='gap-2'
                >
                  <Globe className='w-4 h-4' />
                  <span className='hidden sm:inline'>官网</span>
                </Button>
              </div>
            </div>

            <DialogDescription className='mt-4 text-base'>
              {appInfo.description}
            </DialogDescription>
          </div>
        </div>

        {/* 内容区域 */}
        <div className='flex-1 overflow-y-auto px-8 py-6'>
          <div className='space-y-6'>

            {/* 主要功能卡片 */}
            <Card className='border-primary/20 bg-gradient-to-br from-primary/5 to-transparent'>
              <CardContent className='p-6'>
                <div className='flex items-center gap-2 mb-4'>
                  <div className='p-2 bg-primary/10 rounded-lg'>
                    <Rocket className='w-5 h-5 text-primary' />
                  </div>
                  <h3 className='text-lg font-semibold'>核心功能</h3>
                </div>
                <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                  {features.map((feature, index) => (
                    <div key={index} className='flex items-center gap-2 text-sm'>
                      <Sparkles className='w-4 h-4 text-primary shrink-0' />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 技术栈卡片 */}
            <Card className='border-primary/20'>
              <CardContent className='p-6'>
                <div className='flex items-center gap-2 mb-4'>
                  <div className='p-2 bg-primary/10 rounded-lg'>
                    <Code2 className='w-5 h-5 text-primary' />
                  </div>
                  <h3 className='text-lg font-semibold'>技术栈</h3>
                </div>
                <div className='flex flex-wrap gap-2'>
                  {techStack.map(tech => (
                    <Tag
                      key={tech.name}
                      variant='secondary'
                      className='px-3 py-1.5 text-sm font-medium'
                    >
                      {tech.name}
                    </Tag>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 项目信息卡片 */}
            <Card>
              <CardContent className='p-6'>
                <div className='flex items-center gap-2 mb-4'>
                  <div className='p-2 bg-primary/10 rounded-lg'>
                    <Info className='w-5 h-5 text-primary' />
                  </div>
                  <h3 className='text-lg font-semibold'>项目信息</h3>
                </div>

                <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                  <div className='space-y-3'>
                    <div className='flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors'>
                      <Users className='w-5 h-5 text-primary shrink-0' />
                      <div className='min-w-0'>
                        <div className='text-xs text-muted-foreground'>开发团队</div>
                        <div className='font-medium truncate'>{appInfo.author}</div>
                      </div>
                    </div>

                    <Button
                      variant='outline'
                      className='w-full justify-start gap-3 h-auto p-3'
                      onClick={() => openExternalLink(appInfo.repository)}
                    >
                      <Github className='w-5 h-5 shrink-0' />
                      <div className='text-left min-w-0'>
                        <div className='text-xs text-muted-foreground'>项目地址</div>
                        <div className='font-medium truncate'>GitHub 仓库</div>
                      </div>
                      <ExternalLink className='w-4 h-4 ml-auto shrink-0' />
                    </Button>
                  </div>

                  <div className='space-y-3'>
                    <div className='flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors'>
                      <Star className='w-5 h-5 text-primary shrink-0' />
                      <div className='min-w-0'>
                        <div className='text-xs text-muted-foreground'>开源许可</div>
                        <div className='font-medium'>{appInfo.license}</div>
                      </div>
                    </div>

                    <Button
                      variant='outline'
                      className='w-full justify-start gap-3 h-auto p-3'
                      onClick={() => openExternalLink(appInfo.website)}
                    >
                      <Globe className='w-5 h-5 shrink-0' />
                      <div className='text-left min-w-0'>
                        <div className='text-xs text-muted-foreground'>官方网站</div>
                        <div className='font-medium truncate'>{appInfo.website.replace('https://', '')}</div>
                      </div>
                      <ExternalLink className='w-4 h-4 ml-auto shrink-0' />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 支持与反馈卡片 */}
            <Card className='border-primary/20 bg-gradient-to-br from-primary/5 to-transparent'>
              <CardContent className='p-6'>
                <div className='text-center space-y-4'>
                  <div className='inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-primary/10'>
                    <Heart className='w-4 h-4 text-primary animate-pulse' />
                    <span className='font-medium'>感谢您使用 {appInfo.name}！</span>
                  </div>

                  <p className='text-sm text-muted-foreground'>
                    如果您遇到问题或有建议，欢迎通过以下方式联系我们
                  </p>

                  <div className='grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2'>
                    <Button
                      variant='outline'
                      className='gap-2 h-auto py-3'
                      onClick={() => openExternalLink(`${appInfo.repository}/issues`)}
                    >
                      <Bug className='w-4 h-4' />
                      <div className='text-left'>
                        <div className='font-medium'>报告问题</div>
                        <div className='text-xs text-muted-foreground'>提交 Bug 或建议</div>
                      </div>
                    </Button>

                    <Button
                      variant='outline'
                      className='gap-2 h-auto py-3'
                      onClick={() => openExternalLink(`${appInfo.repository}/discussions`)}
                    >
                      <MessageSquare className='w-4 h-4' />
                      <div className='text-left'>
                        <div className='font-medium'>社区讨论</div>
                        <div className='text-xs text-muted-foreground'>加入社区交流</div>
                      </div>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 版权信息 */}
            <div className='text-center pt-2'>
              <div className='inline-flex items-center gap-2 text-sm text-muted-foreground'>
                <span>© 2024 {appInfo.author}</span>
                <span>•</span>
                <span>All rights reserved</span>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AboutDialog;
