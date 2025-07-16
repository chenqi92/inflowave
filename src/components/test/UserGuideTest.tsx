import React, { useState } from 'react';
import { Button } from '@/components/ui';
import UserGuideModal from '@/components/common/UserGuideModal';
import { BookOpen } from 'lucide-react';

const UserGuideTest: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className='p-8'>
      <div className='max-w-2xl mx-auto text-center'>
        <h1 className='text-3xl font-bold mb-6'>用户指引测试</h1>
        <p className='text-muted-foreground mb-8'>
          点击下面的按钮测试用户指引弹框的布局和功能
        </p>

        <Button onClick={() => setIsOpen(true)} size='lg' className='gap-2'>
          <BookOpen className='w-5 h-5' />
          打开用户指引
        </Button>

        <div className='mt-8 p-4 bg-muted/50 rounded-lg text-left'>
          <h3 className='font-semibold mb-2'>测试要点：</h3>
          <ul className='space-y-1 text-sm text-muted-foreground'>
            <li>• 弹框是否正确显示在视口内</li>
            <li>• 左侧导航是否可以正常滚动</li>
            <li>• 右侧内容是否不会超出容器</li>
            <li>• 长代码块是否有水平滚动</li>
            <li>• 表格是否响应式显示</li>
            <li>• 长链接是否正确换行</li>
            <li>• 底部导航按钮是否正常工作</li>
          </ul>
        </div>
      </div>

      <UserGuideModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </div>
  );
};

export default UserGuideTest;
