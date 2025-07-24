import React, { useEffect, useState } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import '@/styles/datagrip.css';
import '@/styles/accessibility.css';
import '@/styles/zebra-tables.css';

// 错误处理
import ErrorBoundary from '@/components/common/ErrorBoundary';
import { errorLogger } from '@/utils/errorLogger';
import { DialogProvider } from '@/components/providers/DialogProvider';

import { safeTauriInvoke, initializeEnvironment } from './utils/tauri';
import { showMessage } from './utils/message';
import GlobalSearch from './components/common/GlobalSearch';
import UserGuideModal from './components/common/UserGuideModal';
import { useNoticeStore } from './store/notice';
import { useConnectionStore } from './store/connection';
import { useUserPreferences } from './hooks/useUserPreferences';
import { consoleLogger } from './utils/consoleLogger';
import { initializeHealthCheck } from './utils/healthCheck';
import { initializeContextMenuDisabler } from './utils/contextMenuDisabler';
import { useTabStore } from './stores/tabStore';
import UnsavedTabsDialog from './components/common/UnsavedTabsDialog';
import type { EditorTab } from './components/editor/TabManager';

// 更新组件
import { UpdateNotification } from '@components/updater';
import { useUpdater } from './hooks/useUpdater';

// 页面组件
import UserGuideTest from './components/test/UserGuideTest';
import DataGripStyleLayout from './components/layout/DataGripStyleLayout';
import NativeMenuHandler from './components/layout/NativeMenuHandler';

// UI 组件导入
import { Text, Spin, Layout, Content, Toaster } from '@/components/ui';
import { DialogManager } from '@/utils/dialog';

// 主布局组件
const MainLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [globalSearchVisible, setGlobalSearchVisible] = useState(false);
  const [userGuideVisible, setUserGuideVisible] = useState(false);
  const { browserModeNoticeDismissed } = useNoticeStore();
  
  // 更新功能
  const {
    updateInfo,
    showNotification: showUpdateNotification,
    hideNotification,
    skipVersion: _skipVersion,
  } = useUpdater();



  // 检查是否显示用户指引
  useEffect(() => {
    if (!browserModeNoticeDismissed) {
      // 监听app-ready事件后显示弹框
      const handleAppReady = () => {
        setTimeout(() => setUserGuideVisible(true), 100);
      };
      window.addEventListener('app-ready', handleAppReady);
      const timer = setTimeout(() => {
        setUserGuideVisible(true);
      }, 2000); // 兜底延迟
      return () => {
        clearTimeout(timer);
        window.removeEventListener('app-ready', handleAppReady);
      };
    }
  }, [browserModeNoticeDismissed]);

  // 监听菜单触发的用户引导事件
  useEffect(() => {
    const handleShowUserGuide = () => {
      setUserGuideVisible(true);
    };

    const handleShowQuickStart = () => {
      setUserGuideVisible(true);
    };

    document.addEventListener('show-user-guide', handleShowUserGuide);
    document.addEventListener('show-quick-start', handleShowQuickStart);
    
    return () => {
      document.removeEventListener('show-user-guide', handleShowUserGuide);
      document.removeEventListener('show-quick-start', handleShowQuickStart);
    };
  }, []);

  // 键盘快捷键处理
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 不要阻止系统级的复制粘贴快捷键
      const isSystemClipboard = (
        (e.ctrlKey || e.metaKey) &&
        ['c', 'v', 'x', 'a'].includes(e.key.toLowerCase())
      );

      if (isSystemClipboard) {
        return; // 让系统处理复制粘贴
      }

      // Ctrl+Shift+P 打开全局搜索
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        e.preventDefault();
        setGlobalSearchVisible(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 检查是否为需要特殊处理的页面（调试页面等）
  const isSpecialPage = [
    '/debug',
    '/typography-test',
    '/ui-test',
    '/user-guide-test',
  ].includes(location.pathname);

  if (isSpecialPage) {
    return (
      <>
        {/* 全局菜单处理器 - 确保特殊页面也能处理菜单事件 */}
        <NativeMenuHandler onGlobalSearch={() => setGlobalSearchVisible(true)} />
        
        <Layout className='min-h-screen bg-background'>
          {/* 应用工具栏 */}

          {/* 主内容区 */}
          <Content className='flex-1 p-4'>
            <Routes>
              <Route path='/user-guide-test' element={<UserGuideTest />} />
            </Routes>
          </Content>

          {/* 全局搜索 */}
          <GlobalSearch
            isOpen={globalSearchVisible}
            onClose={() => setGlobalSearchVisible(false)}
            onNavigate={(path, params) => {
              navigate(path, { state: params });
            }}
            onExecuteQuery={query => {
              navigate('/query', { state: { query } });
            }}
          />
        </Layout>
      </>
    );
  }

  // 对于主要的数据库工作区页面，使用DataGrip风格布局
  return (
    <>
      {/* 全局菜单处理器 - 确保在所有页面都能处理菜单事件 */}
      <NativeMenuHandler onGlobalSearch={() => setGlobalSearchVisible(true)} />

      <Routes>
        <Route path='/' element={<DataGripStyleLayout />} />
        <Route path='/dashboard' element={<DataGripStyleLayout />} />
        <Route path='/database' element={<DataGripStyleLayout />} />
        <Route path='/query' element={<DataGripStyleLayout />} />
        <Route path='/datagrip' element={<DataGripStyleLayout />} />
        <Route path='/visualization' element={<DataGripStyleLayout />} />
        <Route path='/data-write' element={<DataGripStyleLayout />} />
        <Route path='/write' element={<DataGripStyleLayout />} />
        <Route path='/performance' element={<DataGripStyleLayout />} />
        <Route path='/extensions' element={<DataGripStyleLayout />} />
        <Route path='/dev-tools' element={<DataGripStyleLayout />} />
        <Route path='/query-history' element={<DataGripStyleLayout />} />

        {/* 连接管理页面 */}
        <Route path='/connections' element={<DataGripStyleLayout />} />
      </Routes>

      {/* 用户指引弹框 */}
      <UserGuideModal
        isOpen={userGuideVisible}
        onClose={() => setUserGuideVisible(false)}
      />

      {/* 更新通知 */}
      <UpdateNotification
        open={showUpdateNotification}
        updateInfo={updateInfo}
        onOpenChange={hideNotification}
      />
    </>
  );
};

const App: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [showUnsavedTabsDialog, setShowUnsavedTabsDialog] = useState(false);
  const [unsavedTabs, setUnsavedTabs] = useState<EditorTab[]>([]);
  const { preferences } = useUserPreferences();

  // 应用无障碍设置到 DOM
  useEffect(() => {
    if (!preferences?.accessibility) return;

    const { high_contrast, font_size, font_family, reduced_motion } = preferences.accessibility;
    const body = document.body;
    
    // 高对比度设置
    if (high_contrast) {
      body.classList.add('high-contrast');
    } else {
      body.classList.remove('high-contrast');
    }
    
    // 字体大小设置
    body.classList.remove('font-small', 'font-medium', 'font-large', 'font-xlarge');
    switch (font_size) {
      case 'small':
        body.classList.add('font-small');
        break;
      case 'medium':
        body.classList.add('font-medium');
        break;
      case 'large':
        body.classList.add('font-large');
        break;
      case 'xlarge':
      case 'extraLarge':
        body.classList.add('font-xlarge');
        break;
      default:
        body.classList.add('font-medium');
        break;
    }

    // 字体系列设置
    body.classList.remove(
      'font-system', 'font-inter', 'font-roboto', 'font-open-sans', 'font-lato', 'font-source-sans',
      'font-nunito', 'font-poppins', 'font-montserrat', 'font-fira-sans', 'font-noto-sans', 'font-ubuntu',
      'font-work-sans', 'font-dm-sans', 'font-plus-jakarta', 'font-manrope', 'font-space-grotesk',
      'font-outfit', 'font-lexend', 'font-be-vietnam', 'font-fira-code', 'font-jetbrains-mono',
      'font-source-code-pro', 'font-inconsolata', 'font-roboto-mono', 'font-ubuntu-mono',
      'font-cascadia-code', 'font-sf-mono'
    );
    switch (font_family) {
      case 'inter':
        body.classList.add('font-inter');
        break;
      case 'roboto':
        body.classList.add('font-roboto');
        break;
      case 'open-sans':
        body.classList.add('font-open-sans');
        break;
      case 'lato':
        body.classList.add('font-lato');
        break;
      case 'source-sans':
        body.classList.add('font-source-sans');
        break;
      case 'nunito':
        body.classList.add('font-nunito');
        break;
      case 'poppins':
        body.classList.add('font-poppins');
        break;
      case 'montserrat':
        body.classList.add('font-montserrat');
        break;
      case 'fira-sans':
        body.classList.add('font-fira-sans');
        break;
      case 'noto-sans':
        body.classList.add('font-noto-sans');
        break;
      case 'ubuntu':
        body.classList.add('font-ubuntu');
        break;
      case 'work-sans':
        body.classList.add('font-work-sans');
        break;
      case 'dm-sans':
        body.classList.add('font-dm-sans');
        break;
      case 'plus-jakarta':
        body.classList.add('font-plus-jakarta');
        break;
      case 'manrope':
        body.classList.add('font-manrope');
        break;
      case 'space-grotesk':
        body.classList.add('font-space-grotesk');
        break;
      case 'outfit':
        body.classList.add('font-outfit');
        break;
      case 'lexend':
        body.classList.add('font-lexend');
        break;
      case 'be-vietnam':
        body.classList.add('font-be-vietnam');
        break;
      // 等宽字体
      case 'fira-code':
        body.classList.add('font-fira-code');
        break;
      case 'jetbrains-mono':
        body.classList.add('font-jetbrains-mono');
        break;
      case 'source-code-pro':
        body.classList.add('font-source-code-pro');
        break;
      case 'inconsolata':
        body.classList.add('font-inconsolata');
        break;
      case 'roboto-mono':
        body.classList.add('font-roboto-mono');
        break;
      case 'ubuntu-mono':
        body.classList.add('font-ubuntu-mono');
        break;
      case 'cascadia-code':
        body.classList.add('font-cascadia-code');
        break;
      case 'sf-mono':
        body.classList.add('font-sf-mono');
        break;
      default: // system
        body.classList.add('font-system');
        break;
    }

    // 减少动画设置
    if (reduced_motion) {
      body.classList.add('reduced-motion');
    } else {
      body.classList.remove('reduced-motion');
    }

    console.log('已应用无障碍设置:', { high_contrast, font_size, font_family, reduced_motion });
  }, [preferences?.accessibility]);

  // 应用工作区设置到 DOM
  useEffect(() => {
    if (!preferences?.workspace) return;

    const { layout } = preferences.workspace;
    const body = document.body;

    // 布局模式设置
    body.classList.remove('layout-compact', 'layout-comfortable', 'layout-spacious', 'layout-minimal');
    switch (layout) {
      case 'compact':
        body.classList.add('layout-compact');
        break;
      case 'comfortable':
        body.classList.add('layout-comfortable');
        break;
      case 'spacious':
        body.classList.add('layout-spacious');
        break;
      case 'minimal':
        body.classList.add('layout-minimal');
        break;
      default:
        body.classList.add('layout-comfortable');
        break;
    }

    console.log('已应用工作区设置:', { layout });
  }, [preferences?.workspace]);

  // 处理未保存标签页对话框事件
  useEffect(() => {
    const handleShowDialog = (event: CustomEvent) => {
      const { unsavedTabs } = event.detail;
      setUnsavedTabs(unsavedTabs);
      setShowUnsavedTabsDialog(true);
    };

    window.addEventListener('show-unsaved-tabs-dialog', handleShowDialog as EventListener);

    return () => {
      window.removeEventListener('show-unsaved-tabs-dialog', handleShowDialog as EventListener);
    };
  }, []);

  // 处理对话框用户选择
  const handleDialogSave = () => {
    setShowUnsavedTabsDialog(false);
    const event = new CustomEvent('unsaved-tabs-dialog-result', {
      detail: { action: 'save' }
    });
    window.dispatchEvent(event);
  };

  const handleDialogDiscard = () => {
    setShowUnsavedTabsDialog(false);
    const event = new CustomEvent('unsaved-tabs-dialog-result', {
      detail: { action: 'discard' }
    });
    window.dispatchEvent(event);
  };

  const handleDialogCancel = () => {
    setShowUnsavedTabsDialog(false);
    const event = new CustomEvent('unsaved-tabs-dialog-result', {
      detail: { action: 'cancel' }
    });
    window.dispatchEvent(event);
  };

  // 处理应用关闭事件
  useEffect(() => {
    const handleBeforeUnload = async (event: BeforeUnloadEvent) => {
      const { handleAppClose } = useTabStore.getState();

      try {
        const canClose = await handleAppClose();
        if (!canClose) {
          event.preventDefault();
          event.returnValue = ''; // 标准做法
        }
      } catch (error) {
        console.error('处理应用关闭失败:', error);
      }
    };

    // 监听浏览器关闭事件
    window.addEventListener('beforeunload', handleBeforeUnload);

    // 如果是Tauri环境，也监听Tauri的关闭事件
    if ((window as any).__TAURI__) {
      try {
        import('@tauri-apps/api/event').then(({ listen }) => {
          listen('tauri://close-requested', async () => {
            const { handleAppClose } = useTabStore.getState();
            try {
              const canClose = await handleAppClose();
              if (canClose) {
                // 允许关闭应用 - 使用正确的webview window API
                import('@tauri-apps/api/webviewWindow').then(({ getCurrentWebviewWindow }) => {
                  getCurrentWebviewWindow().close();
                }).catch(err => {
                  console.warn('无法关闭Tauri窗口:', err);
                });
              }
            } catch (error) {
              console.error('处理Tauri关闭事件失败:', error);
            }
          });
        }).catch(err => {
          console.warn('无法监听Tauri关闭事件:', err);
        });
      } catch (error) {
        console.warn('Tauri API 不可用:', error);
      }
    }

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // 初始化应用
  useEffect(() => {
    const initApp = async () => {
      try {
        console.log('InfloWave 启动中...');

        // 初始化控制台日志拦截器
        console.log('初始化控制台日志拦截器...');

        // 初始化错误日志系统
        console.log('初始化错误日志系统...');

        // 初始化环境检测
        initializeEnvironment();

        // 初始化上下文菜单禁用器（生产环境）
        initializeContextMenuDisabler();

        // 尝试获取应用配置信息
        try {
          await safeTauriInvoke<any>('get_app_config');
          console.log('应用配置加载成功');
        } catch (configError) {
          console.warn('应用配置加载失败，使用默认配置:', configError);
        }

        // 尝试初始化连接服务
        try {
          await safeTauriInvoke<void>('initialize_connections');
          console.log('连接服务初始化成功');

          // 初始化前端连接状态，确保所有连接都为断开状态
          const { initializeConnectionStates } = useConnectionStore.getState();
          initializeConnectionStates();
          console.log('前端连接状态初始化完成');
        } catch (connError) {
          console.warn('连接服务初始化失败:', connError);
        }

        // 初始化性能监控健康检查
        try {
          initializeHealthCheck();
          console.log('性能监控健康检查初始化成功');
        } catch (healthError) {
          console.warn('性能监控健康检查初始化失败:', healthError);
        }

        showMessage.success('应用启动成功');
      } catch (error) {
        console.error('应用初始化失败:', error);
        // 记录到错误日志系统
        await errorLogger.logCustomError('应用初始化失败', {
          error: error?.toString(),
          stack: (error as Error)?.stack,
        });
        // 不显示错误消息，允许应用继续运行
        console.warn('应用将以降级模式运行');
      } finally {
        setLoading(false);

        // 通知加载屏幕应用已准备就绪
        setTimeout(() => {
          // 确保窗口标题正确设置
          document.title = 'InfloWave';
          
          // 如果是Tauri环境，也通过Tauri API设置标题
          if ((window as any).__TAURI__) {
            import('@tauri-apps/api/webviewWindow').then(({ getCurrentWebviewWindow }) => {
              getCurrentWebviewWindow().setTitle('InfloWave').catch(err => {
                console.warn('无法通过Tauri API设置窗口标题:', err);
              });
            }).catch(err => {
              console.warn('无法导入Tauri webviewWindow模块:', err);
            });
          }
          
          window.dispatchEvent(new CustomEvent('app-ready'));
          console.log('✅ 应用启动完成，窗口标题已设置，已发送ready信号');
        }, 50); // 轻微延迟确保DOM更新完成

        // 在开发模式下加载测试工具
        if ((import.meta as any).env?.DEV) {
          try {
            // 加载主测试工具
            import('./utils/masterTestRunner').then(
              ({ masterTestRunner: _testRunner }) => {
                console.log('🧪 测试工具已加载');
                console.log('使用以下命令运行测试:');
                console.log('- runCompleteTests() // 运行完整测试套件');
                console.log('- quickHealthCheck() // 快速健康检查');
                console.log('- runUITests() // 运行UI测试');
                console.log('- runFeatureTests() // 运行功能测试');
              }
            );
          } catch (error) {
            console.warn('测试工具加载失败:', error);
          }
        }
      }
    };

    // 直接初始化，React已确保UI渲染顺序
    initApp();
    return () => {
      // 应用卸载时清理错误日志器
      errorLogger.cleanup();
    };
  }, []);

  if (loading) {
    return (
      <div className='min-h-screen bg-muted/20 flex items-center justify-center'>
        <div className='text-center space-y-4'>
          <Spin size='large' />
          <Text className='text-base text-muted-foreground'>
            正在启动 InfloWave...
          </Text>
        </div>
      </div>
    );
  }

  // 获取通知位置设置，如果没有设置则使用默认值
  const getToasterPosition = () => {
    console.log('获取Toaster位置，当前preferences:', preferences);
    if (!preferences?.notifications?.position) {
      console.log('使用默认位置: bottom-right');
      return 'bottom-right'; // 默认位置
    }

    // 转换用户偏好中的位置值为 Sonner 支持的格式
    const positionMap: Record<string, string> = {
      'topLeft': 'top-left',
      'topCenter': 'top-center',
      'topRight': 'top-right',
      'bottomLeft': 'bottom-left',
      'bottomCenter': 'bottom-center',
      'bottomRight': 'bottom-right',
    };

    const position = positionMap[preferences.notifications.position] || 'bottom-right';
    console.log('计算出的位置:', position, '原始值:', preferences.notifications.position);
    return position;
  };

  return (
    <DialogProvider>
      <ErrorBoundary>
        <MainLayout />
        <DialogManager />
        <Toaster position={getToasterPosition() as any} />

        {/* 未保存标签页对话框 */}
        <UnsavedTabsDialog
          open={showUnsavedTabsDialog}
          unsavedTabs={unsavedTabs}
          onSave={handleDialogSave}
          onDiscard={handleDialogDiscard}
          onCancel={handleDialogCancel}
        />
      </ErrorBoundary>
    </DialogProvider>
  );
};

export default App;
