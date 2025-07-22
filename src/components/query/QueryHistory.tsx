import React from 'react';
import { UnifiedQueryHistory } from './UnifiedQueryHistory';

interface QueryHistoryProps {
  onQuerySelect?: (query: string, database?: string) => void;
  visible?: boolean;
  onClose?: () => void;
}

const QueryHistory: React.FC<QueryHistoryProps> = ({
  onQuerySelect,
  visible = true,
  onClose,
}) => {
  return (
    <UnifiedQueryHistory
      mode="modal"
      visible={visible}
      onClose={onClose}
      onQuerySelect={onQuerySelect}
      features={{
        advancedFilters: false,
        exportImport: false,
        detailedStats: false,
        editSavedQueries: true,
        favoriteQueries: false
      }}
      title="查询历史"
      description="查看和管理查询历史记录与保存的查询"
    />
  );
};

export default QueryHistory;