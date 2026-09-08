import type { ReactNode } from "react";

export function WalletSpecPanel({
  headingId,
  heading,
  description,
  children,
}: {
  headingId: string;
  heading: string;
  description: ReactNode;
  children: ReactNode;
}) {
  return (
    <div
      className="overflow-hidden rounded-lg border border-gray-200 bg-white"
      role="group"
      aria-labelledby={headingId}
    >
      <div className="border-b border-gray-100 bg-gray-50 px-4 py-2.5">
        <p
          id={headingId}
          className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-600"
        >
          {heading}
        </p>
        <p className="mt-1 text-sm leading-snug text-gray-700">{description}</p>
      </div>
      {children}
    </div>
  );
}

export const walletSpecCtaClassName =
  "inline-flex w-full min-h-11 items-center justify-center gap-2 rounded border border-blue-500 bg-blue-500 px-4 font-display text-sm font-medium text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50";

export const walletSpecSecondaryClassName =
  "min-h-11 w-full rounded border border-gray-300 px-4 font-display text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50";
