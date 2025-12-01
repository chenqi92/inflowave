import React from 'react';
import {
  Text,
  Tag,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Button,
} from '@/components/ui';

import {
  Bug,
  Heart,
  Github,
  ExternalLink,
  Globe,
  MessageSquare,
} from 'lucide-react';

import { getVersionInfo } from '@/utils/version';
import { openExternalLink } from '@/utils/externalLinks';
import appIcon from '@/assets/app-icon.png';

interface AboutDialogProps {
  visible: boolean;
  onClose: () => void;
}

const AboutDialog: React.FC<AboutDialogProps> = ({ visible, onClose }) => {
  const versionInfo = getVersionInfo();
  const appInfo = {
    name: 'InfloWave',
    version: versionInfo.version,
    description: '现代化的时序数据库管理工具',
    author: 'KKAPE',
    license: 'MIT',
    repository: 'https://github.com/chenqi92/inflowave',
    website: 'https://inflowave.kkape.com',
  };

  const techStack = ['Tauri', 'React', 'TypeScript', 'Rust', 'InfluxDB'];

  return (
    <Dialog open={visible} onOpenChange={onClose}>
      <DialogContent className='max-w-md p-0 overflow-hidden'>
        {/* 头部区域 */}
        <div className='px-5 pt-5 pb-4 border-b bg-muted/30'>
          <div className='flex items-center gap-3'>
            {/* 应用图标 */}
            <img
              src={appIcon}
              alt='InfloWave'
              className='w-14 h-14 rounded-xl shadow-md'
            />

            {/* 应用名称和版本 */}
            <div className='flex-1 min-w-0'>
              <DialogTitle className='text-xl font-bold'>
                {appInfo.name}
              </DialogTitle>
              <div className='flex items-center gap-1.5 mt-1'>
                <Tag variant='secondary' className='text-xs font-mono px-1.5 py-0'>
                  v{appInfo.version}
                </Tag>
                <Tag variant='outline' className='text-xs px-1.5 py-0'>
                  {appInfo.license}
                </Tag>
              </div>
            </div>
          </div>
          <DialogDescription className='mt-3 text-sm'>
            {appInfo.description}
          </DialogDescription>
        </div>

        {/* 内容区域 */}
        <div className='px-5 py-4 space-y-4'>
          {/* 技术栈 */}
          <div>
            <div className='text-xs text-muted-foreground mb-1.5'>技术栈</div>
            <div className='flex flex-wrap gap-1.5'>
              {techStack.map(tech => (
                <Tag
                  key={tech}
                  variant='secondary'
                  className='text-xs px-2 py-0.5'
                >
                  {tech}
                </Tag>
              ))}
            </div>
          </div>

          {/* 项目信息 */}
          <div className='grid grid-cols-2 gap-2 text-sm'>
            <div className='p-2 rounded-md bg-muted/50'>
              <div className='text-xs text-muted-foreground'>开发团队</div>
              <div className='font-medium'>{appInfo.author}</div>
            </div>
            <div className='p-2 rounded-md bg-muted/50'>
              <div className='text-xs text-muted-foreground'>开源许可</div>
              <div className='font-medium'>{appInfo.license}</div>
            </div>
          </div>

          {/* 链接按钮 */}
          <div className='grid grid-cols-2 gap-2'>
            <Button
              variant='outline'
              size='sm'
              className='gap-1.5 h-8'
              onClick={() => openExternalLink(appInfo.repository)}
            >
              <Github className='w-3.5 h-3.5' />
              GitHub
            </Button>
            <Button
              variant='outline'
              size='sm'
              className='gap-1.5 h-8'
              onClick={() => openExternalLink(appInfo.website)}
            >
              <Globe className='w-3.5 h-3.5' />
              官网
            </Button>
          </div>

          {/* 支持与反馈 */}
          <div className='pt-2 border-t'>
            <div className='flex items-center justify-center gap-1.5 text-sm text-muted-foreground mb-2'>
              <Heart className='w-3.5 h-3.5 text-primary' />
              <span>感谢使用 {appInfo.name}</span>
            </div>
            <div className='grid grid-cols-2 gap-2'>
              <Button
                variant='ghost'
                size='sm'
                className='gap-1.5 h-8 text-xs'
                onClick={() => openExternalLink(`${appInfo.repository}/issues`)}
              >
                <Bug className='w-3.5 h-3.5' />
                报告问题
              </Button>
              <Button
                variant='ghost'
                size='sm'
                className='gap-1.5 h-8 text-xs'
                onClick={() => openExternalLink(`${appInfo.repository}/discussions`)}
              >
                <MessageSquare className='w-3.5 h-3.5' />
                社区讨论
              </Button>
            </div>
          </div>
        </div>

        {/* 版权信息 */}
        <div className='px-5 py-2 text-center text-xs text-muted-foreground border-t bg-muted/20'>
          © 2024 {appInfo.author} · All rights reserved
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AboutDialog;
