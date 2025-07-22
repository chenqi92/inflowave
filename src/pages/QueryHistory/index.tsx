import React from 'react';
import { UnifiedQueryHistory } from '@/components/query/UnifiedQueryHistory';

const QueryHistoryPage: React.FC = () => {
  // 执行查询的处理函数
  const handleQuerySelect = async (query: string, database?: string) => {
    try {
      // 这里应该调用实际的查询执行逻辑
      // 可以通过路由导航到查询页面，并设置查询内容
      console.log('执行查询:', { query, database });
      // 暂时显示消息，实际实现可能需要导航到查询编辑器页面
      // showMessage.success('查询已加载到编辑器');
    } catch (error) {
      console.error('查询执行失败:', error);
    }
  };

  return (
    <UnifiedQueryHistory
      mode="page"
      onQuerySelect={handleQuerySelect}
      features={{
        advancedFilters: true,
        exportImport: true,
        detailedStats: true,
        editSavedQueries: true,
        favoriteQueries: true
      }}
      title="查询历史"
      description="查看和管理您的查询历史记录与保存的查询"
    />
  );
};

export default QueryHistoryPage;