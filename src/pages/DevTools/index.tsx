import React from 'react';
import { VerticalDevTools } from '@/components/devtools/VerticalDevTools';

const DevTools: React.FC = () => {
  return (
    <div className="h-full">
      <VerticalDevTools />
    </div>
  );
};

export default DevTools;
