import React from "react";

interface PageHeaderProps {
  title: React.ReactNode;
  className?: string;
  actions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, className = "", actions }) => {
  return (
    <div className={`flex items-center justify-between gap-4 ${className}`}>
      <h2 className="m-0 min-w-0 max-w-full">
        <span className="inline-flex max-w-full items-center gap-1.5 truncate rounded-full bg-gradient-to-b from-slate-100 to-slate-200/80 px-3 py-1 font-display text-sm font-medium text-slate-800 shadow-sm ring-1 ring-slate-300/80">
          {title}
        </span>
      </h2>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </div>
  );
};
