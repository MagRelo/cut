import type { ReactNode } from "react";

export const accountPanelClassName =
  "rounded-lg border border-slate-300 bg-white p-6 font-display shadow-sm";

export const accountPanelTitleClassName =
  "flex items-center gap-2 font-display text-xl font-semibold text-gray-900";

export const accountPanelIconClassName = "h-6 w-6 shrink-0";

export const accountSectionTitleClassName = "font-display text-base font-semibold text-gray-900";

export const accountSectionHeadingClassName = `${accountSectionTitleClassName} mb-3`;

export const accountBodyClassName = "text-sm leading-relaxed text-gray-700";

export const accountFieldStackClassName = "space-y-6";

export const accountFieldControlClassName = "mt-2";

export const accountPanelRuleClassName = "my-6 border-slate-300";

type AccountPanelHeadingProps = {
  id?: string;
  icon?: ReactNode;
  children: ReactNode;
  aside?: ReactNode;
};

export function AccountPanelHeading({ id, icon, children, aside }: AccountPanelHeadingProps) {
  return (
    <div className="mb-4 flex items-center justify-between gap-4">
      <h1 id={id} className={accountPanelTitleClassName}>
        {icon}
        {children}
      </h1>
      {aside}
    </div>
  );
}
