import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Button,
  Checkbox,
  Progress,
} from '@/components/ui';
import { ChevronLeft, ChevronRight, BookOpen, Home, Menu } from 'lucide-react';
import MarkdownRenderer from './MarkdownRenderer';
import { useNoticeStore } from '@/store/notice';
import { loadAllDocuments } from '@/utils/documentLoader';
import '@/styles/user-guide.css';

interface UserGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface GuideDocument {
  id: string;
  title: string;
  filename: string;
  content: string;
  order: number;
  description?: string;
}

const UserGuideModal: React.FC<UserGuideModalProps> = ({ isOpen, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [documents, setDocuments] = useState<GuideDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const { dismissBrowserModeNotice } = useNoticeStore();

  // 加载用户文档
  useEffect(() => {
    const loadDocuments = async () => {
      setLoading(true);
      try {
        const loadedDocs = await loadAllDocuments();
        setDocuments(loadedDocs);
      } catch (error) {
        console.error('Failed to load user guide documents:', error);
      } finally {
        setLoading(false);
      }
    };

    if (isOpen) {
      loadDocuments();
      // 检查屏幕尺寸，在移动端默认隐藏侧边栏
      setShowSidebar(window.innerWidth >= 768);
    }
  }, [isOpen]);

  const handleClose = () => {
    if (dontShowAgain) {
      dismissBrowserModeNotice();
    }
    onClose();
  };

  const goToNext = () => {
    if (currentIndex < documents.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const goToDocument = (index: number) => {
    setCurrentIndex(index);
  };

  // 处理内部文档链接导航
  const handleInternalLinkClick = (filename: string) => {
    const targetIndex = documents.findIndex(doc => doc.filename === filename);
    if (targetIndex !== -1) {
      setCurrentIndex(targetIndex);
    }
  };

  const currentDoc = documents[currentIndex];
  const progress =
    documents.length > 0 ? ((currentIndex + 1) / documents.length) * 100 : 0;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className='max-w-6xl w-[95vw] h-[90vh] p-0 flex flex-col user-guide-modal'>
        <DialogHeader className='px-6 py-4 border-b border-border flex-shrink-0'>
          <DialogTitle className='flex items-center justify-between'>
            <div className='flex items-center gap-3'>
              <Button
                variant='ghost'
                size='sm'
                onClick={() => setShowSidebar(!showSidebar)}
                className='md:hidden'
              >
                <Menu className='w-4 h-4' />
              </Button>
              <BookOpen className='w-6 h-6 text-primary' />
              <span className='truncate'>
                {currentDoc?.title || 'InfloWave 用户指引'}
              </span>
            </div>
            <div className='flex items-center gap-2 text-sm text-muted-foreground'>
              {documents.length > 0 && (
                <span>
                  {currentIndex + 1} / {documents.length}
                </span>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className='flex flex-1 min-h-0 overflow-hidden relative'>
          {/* 移动端遮罩层 */}
          {showSidebar && (
            <div
              className='fixed inset-0 bg-black/50 z-5 md:hidden'
              onClick={() => setShowSidebar(false)}
            />
          )}

          {/* 左侧导航 */}
          {showSidebar && (
            <div className='w-64 border-r border-border bg-background flex-shrink-0 user-guide-sidebar md:bg-muted/20 z-10'>
              <div className='h-full overflow-y-auto p-4 user-guide-scroll'>
                <div className='space-y-1'>
                  {documents.map((doc, index) => (
                    <button
                      key={doc.id}
                      onClick={() => {
                        goToDocument(index);
                        // 在移动端选择文档后隐藏侧边栏
                        if (window.innerWidth < 768) {
                          setShowSidebar(false);
                        }
                      }}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors user-guide-nav-button ${
                        index === currentIndex
                          ? 'bg-primary text-primary-foreground active'
                          : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <div className='truncate'>{doc.title}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 右侧内容 */}
          <div className='flex-1 flex flex-col min-h-0 overflow-hidden'>
            {/* 进度条 */}
            <div className='px-6 py-2 border-b border-border flex-shrink-0'>
              <Progress value={progress} className='h-1' />
            </div>

            {/* 文档内容 */}
            <div className='flex-1 overflow-y-auto user-guide-scroll'>
              <div className='p-6 max-w-none user-guide-content'>
                {loading ? (
                  <div className='flex items-center justify-center h-64'>
                    <div className='text-center'>
                      <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4'></div>
                      <p className='text-muted-foreground'>加载用户指引中...</p>
                    </div>
                  </div>
                ) : currentDoc ? (
                  <MarkdownRenderer
                    content={currentDoc.content}
                    className='max-w-none user-guide-content'
                    onInternalLinkClick={handleInternalLinkClick}
                  />
                ) : (
                  <div className='flex items-center justify-center h-64'>
                    <p className='text-muted-foreground'>暂无内容</p>
                  </div>
                )}
              </div>
            </div>

            {/* 底部导航和操作 */}
            <div className='border-t border-border p-4 flex-shrink-0'>
              <div className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4'>
                <div className='flex items-center gap-2'>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={goToPrevious}
                    disabled={currentIndex === 0}
                  >
                    <ChevronLeft className='w-4 h-4 mr-1' />
                    上一页
                  </Button>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={goToNext}
                    disabled={currentIndex === documents.length - 1}
                  >
                    下一页
                    <ChevronRight className='w-4 h-4 ml-1' />
                  </Button>
                </div>

                <div className='flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto'>
                  <div className='flex items-center space-x-2'>
                    <Checkbox
                      id='dont-show-again'
                      checked={dontShowAgain}
                      onCheckedChange={setDontShowAgain}
                    />
                    <label
                      htmlFor='dont-show-again'
                      className='text-sm text-muted-foreground cursor-pointer'
                    >
                      不再显示此指引
                    </label>
                  </div>
                  <Button onClick={handleClose} className='w-full sm:w-auto'>
                    <Home className='w-4 h-4 mr-2' />
                    开始使用
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UserGuideModal;
