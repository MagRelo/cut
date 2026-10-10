import { cn } from "../../lib/tabStyles";

/** `hero` sits on the event photo. `paper` is the same layout on a plain background. */
export type EventHeaderTone = "hero" | "paper";

export function eventHeaderTitleClassName(tone: EventHeaderTone): string {
  return cn(
    "font-display text-2xl font-bold leading-snug tracking-tight sm:text-3xl",
    tone === "paper"
      ? "text-gray-900"
      : "text-white [text-shadow:_0_1px_2px_rgb(0_0_0_/_40%)]",
  );
}

export function eventHeaderTitleLinkClassName(tone: EventHeaderTone): string {
  return cn(
    "rounded-sm hover:opacity-90 focus:outline-none focus-visible:ring-2",
    tone === "paper" ? "focus-visible:ring-slate-900" : "focus-visible:ring-white/80",
  );
}

export function eventHeaderPrimaryLineClassName(tone: EventHeaderTone): string {
  return cn(
    "font-medium",
    tone === "paper"
      ? "text-gray-900"
      : "text-white/95 [text-shadow:_0_1px_1px_rgb(0_0_0_/_35%)]",
  );
}

export function eventHeaderSecondaryLineClassName(tone: EventHeaderTone): string {
  return cn(
    tone === "paper"
      ? "text-gray-900"
      : "text-white/80 [text-shadow:_0_1px_1px_rgb(0_0_0_/_35%)]",
  );
}

export function eventHeaderMetaRowClassName(tone: EventHeaderTone): string {
  return cn(
    "mt-1 flex w-full flex-wrap items-center gap-x-2 gap-y-0.5 font-medium",
    tone === "paper"
      ? "text-gray-900"
      : "text-white/95 [text-shadow:_0_1px_1px_rgb(0_0_0_/_35%)]",
  );
}

export function eventHeaderSeparatorClassName(tone: EventHeaderTone): string {
  return cn("text-[9px] leading-none", tone === "paper" ? "text-gray-700" : "text-white/60");
}

export function eventHeaderActionLinkClassName(tone: EventHeaderTone): string {
  return cn(
    "inline-flex items-center gap-0.5 rounded-sm underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2",
    tone === "paper"
      ? "text-gray-900 hover:text-gray-700 focus-visible:ring-slate-900"
      : "text-white/90 hover:text-white focus-visible:ring-white/80",
  );
}

export function eventHeaderCountdownClassName(tone: EventHeaderTone): string {
  return cn("ml-1 tabular-nums", tone === "paper" ? "text-green-600" : "text-green-300");
}

export function eventHeaderSuspendedClassName(tone: EventHeaderTone): string {
  return tone === "paper" ? "text-amber-700" : "text-yellow-300";
}
