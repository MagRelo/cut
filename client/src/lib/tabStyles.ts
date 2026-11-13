/**
 * Equal-width boxed tabs — active state is a filled background, not an underline.
 */
export const tabListClassName = (...extra: string[]) =>
  ["flex rounded-sm bg-blue-50 pt-1.5", ...extra].filter(Boolean).join(" ");

const tabActive = "bg-white text-slate-900 font-medium border-t border-x border-slate-300";
const tabInactive =
  "bg-transparent text-blue-500 hover:text-blue-600 hover:bg-blue-100 border-t border-x border-b border-t-transparent border-x-transparent border-b-slate-300";

const segmentActive = "bg-white text-slate-900 font-medium";
const segmentInactive = "bg-transparent text-blue-500 hover:text-blue-600 hover:bg-blue-100";

export function tabButtonClassName(selected: boolean, options?: { compact?: boolean }): string {
  const padding = options?.compact ? "pt-2 pb-1.5 px-2" : "pt-2.5 pb-2 px-2";
  const base = [
    "flex-1 rounded-sm",
    padding,
    "text-center text-sm font-display leading-tight",
    "transition-colors focus:outline-none",
  ].join(" ");
  return `${base} ${selected ? tabActive : tabInactive}`;
}

/** Equal-width segment control (e.g. Timeline round picker). */
export function segmentButtonClassName(selected: boolean): string {
  const base =
    "flex-1 rounded-sm px-1 py-1 text-xs font-display leading-tight transition-colors focus:outline-none";
  return `${base} ${selected ? segmentActive : segmentInactive}`;
}

export function cn(...classes: (string | false | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}
