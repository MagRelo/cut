import React from "react";

interface PageHeaderProps {
  title: string;
  className?: string;
  actions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, className = "", actions }) => {
  return (
    <div className={`flex items-center justify-between gap-4 ${className}`}>
      <h2 className="m-0 min-w-0 font-display text-xl font-bold uppercase tracking-[0.14em] text-slate-400 sm:text-2xl">
        {title}
      </h2>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </div>
  );
};
