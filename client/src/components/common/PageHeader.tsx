import React from "react";

interface PageHeaderProps {
  title: string;
  className?: string;
  actions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, className = "", actions }) => {
  return (
    <div className={`flex items-center justify-between gap-4 ${className}`}>
      <h2 className="m-0 min-w-0 max-w-full">
        <span className="inline-flex max-w-full items-center truncate rounded-full bg-slate-100 px-3 py-1 font-display text-sm font-medium text-slate-600">
          {title}
        </span>
      </h2>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </div>
  );
};
