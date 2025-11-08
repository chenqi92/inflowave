import React from 'react';
import { VerticalQueryHistory } from '@/components/query/VerticalQueryHistory';

interface QueryHistoryPageProps {
  onClose?: () => void;
}

const QueryHistoryPage: React.FC<QueryHistoryPageProps> = ({ onClose }) => {
  return (
    <div className="h-full">
      <VerticalQueryHistory onClose={onClose} />
    </div>
  );
};

export default QueryHistoryPage;