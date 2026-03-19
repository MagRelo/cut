import React from 'react';

interface PageHeaderProps {
  title: string;
  className?: string;
  actions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  className = '',
  actions,
}) => {
  return (
    <div className={`flex items-center justify-between ${className}`}>
      <h2 className='text-3xl font-extrabold text-gray-400 m-0'>{title}</h2>
      {actions}
    </div>
  );
};
