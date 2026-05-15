export const tabListClassName = (...extra: string[]) =>
  ["flex border-b border-gray-200", ...extra].filter(Boolean).join(" ");

const segmentActive = "border-gray-600 text-gray-800";
const segmentInactive = "border-transparent text-blue-500 hover:text-blue-600";

export function tabButtonClassName(
  selected: boolean,
  options?: { compact?: boolean },
): string {
  const py = options?.compact ? "py-1.5" : "py-2";
  const base = `w-full border-b-2 ${py} text-sm font-display leading-5 focus:outline-none`;
  return `${base} ${selected ? segmentActive : segmentInactive}`;
}

/** Underline segment control (e.g. Timeline round picker). Same colors as tabs, different layout. */
export function segmentButtonClassName(selected: boolean): string {
  const base = "flex-1 border-b-2 py-1.5 text-xs font-display leading-5 focus:outline-none";
  return `${base} ${selected ? segmentActive : segmentInactive}`;
}

export function cn(...classes: (string | false | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}
