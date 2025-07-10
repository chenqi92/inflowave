import React from 'react';
import { cn } from '@/utils/cn';

export interface EmptyProps extends React.HTMLAttributes<HTMLDivElement> {
  image?: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
}

const Empty: React.FC<EmptyProps> = ({
  image,
  description = 'No data',
  children,
  className,
  ...props
}) => {
  const defaultImage = (
    <svg
      className="w-16 h-16 text-gray-300 mx-auto"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  );

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12 px-4 text-center',
        className
      )}
      {...props}
    >
      <div className="mb-4">
        {image || defaultImage}
      </div>
      
      {description && (
        <div className="text-gray-500 text-sm mb-4">
          {description}
        </div>
      )}
      
      {children}
    </div>
  );
};

export { Empty };
