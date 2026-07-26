/**
 * Equal-width boxed tabs — active state is a filled background, not an underline.
 */
export const tabListClassName = (...extra: string[]) =>
  ["flex gap-1 rounded-sm bg-slate-100 p-0.5", ...extra].filter(Boolean).join(" ");

const tabActive = "bg-white text-slate-900 font-medium shadow-sm";
const tabInactive = "bg-transparent text-blue-500 hover:text-blue-600 hover:bg-white/60";

const segmentActive = "bg-white text-slate-900 font-medium shadow-sm";
const segmentInactive = "bg-transparent text-blue-500 hover:text-blue-600 hover:bg-white/60";

export function tabButtonClassName(selected: boolean, options?: { compact?: boolean }): string {
  const padding = options?.compact ? "py-1 px-2" : "py-1.5 px-2";
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
