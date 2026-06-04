export const tabListClassName = (...extra: string[]) =>
  ["flex border-b border-gray-200", ...extra].filter(Boolean).join(" ");

/** Selected tab: soft gray (lighter than legacy gray-600 / gray-800). */
const segmentActive = "border-gray-500 text-gray-700 font-medium";
const segmentInactive = "border-transparent text-blue-500 hover:text-blue-600";

export function tabButtonClassName(selected: boolean, options?: { compact?: boolean }): string {
  const padding = options?.compact ? "py-0.5" : "py-1";
  const base = `w-full border-b-2 ${padding} text-sm font-display leading-tight focus:outline-none`;
  return `${base} ${selected ? segmentActive : segmentInactive}`;
}

/** Underline segment control (e.g. Timeline round picker). Same colors as tabs, different layout. */
export function segmentButtonClassName(selected: boolean): string {
  const base = "flex-1 border-b-2 pb-1 pt-1 text-xs font-display leading-tight focus:outline-none";
  return `${base} ${selected ? segmentActive : segmentInactive}`;
}

export function cn(...classes: (string | false | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}
