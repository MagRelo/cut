import React from "react";

interface PageHeaderProps {
  title: string;
  className?: string;
  actions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, className = "", actions }) => {
  return (
    <div className={`flex items-center justify-between ${className}`}>
      <h2 className="m-0 text-3xl font-extrabold text-gray-400">{title}</h2>
      {actions}
    </div>
  );
};
