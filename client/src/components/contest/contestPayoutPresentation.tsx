import type { ReactNode } from "react";

export function ContestPayoutLayout({
  children,
  background = "muted",
}: {
  children: ReactNode;
  /** `muted` matches payouts modal; `white` for embedded panels (e.g. post-settlement results). */
  background?: "muted" | "white";
}) {
  const surfaceClass = background === "white" ? "bg-white" : "bg-gray-100";
  const paddingClass = background === "white" ? "p-4" : "p-3";
  return <div className={`space-y-4 ${paddingClass} font-display ${surfaceClass}`}>{children}</div>;
}

export function ContestPayoutHeroCard({
  label,
  amount,
}: {
  label: string;
  amount: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-emerald-800/30 bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-800 shadow-md">
      <div className="px-4 py-5 text-left">
        <p className="text-[11px] font-semibold uppercase leading-tight tracking-[0.2em] text-emerald-100/85">
          {label}
        </p>
        <div className="mt-2">{amount}</div>
      </div>
    </section>
  );
}

const gradientMoneySizeClass = {
  hero: "text-4xl font-bold leading-none tracking-tight sm:text-5xl",
  row: "text-lg font-semibold leading-tight",
} as const;

const gradientMoneyToneClass = {
  default:
    "bg-gradient-to-b from-emerald-600 to-emerald-700 bg-clip-text text-transparent drop-shadow-[0_1px_0_rgba(5,150,105,0.12)]",
  light: "text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.2)]",
} as const;

export function ContestPayoutGradientMoney({
  children,
  size = "row",
  tone = "default",
}: {
  children: ReactNode;
  size?: keyof typeof gradientMoneySizeClass;
  tone?: keyof typeof gradientMoneyToneClass;
}) {
  return (
    <p
      className={`tabular-nums ${gradientMoneySizeClass[size]} ${gradientMoneyToneClass[tone]}`}
    >
      {children}
    </p>
  );
}

export function ContestPayoutSubAmount({ children }: { children: ReactNode }) {
  return (
    <p className="mt-0.5 text-xs leading-tight tabular-nums text-slate-500">{children}</p>
  );
}

export function ContestPayoutSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="border-b border-slate-200 pb-4 last:border-b-0 last:pb-0">
      <div className="space-y-2 px-4">
        <div>
          <h2 className="text-xl font-semibold leading-tight text-slate-900">{title}</h2>
          {description != null ? (
            <div className="mt-1 text-xs leading-tight text-slate-500">{description}</div>
          ) : null}
        </div>
        {children}
      </div>
    </section>
  );
}

export function ContestPayoutDividedRows({ children }: { children: ReactNode }) {
  return <div className="divide-y divide-slate-200">{children}</div>;
}

export function ContestPayoutRow({ left, right }: { left: ReactNode; right: ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-2.5">
      <div className="min-w-0">{left}</div>
      <div className="shrink-0 text-right">{right}</div>
    </div>
  );
}

export function ContestPayoutRowTitle({ children }: { children: ReactNode }) {
  return <p className="text-base font-semibold leading-tight text-slate-800">{children}</p>;
}

export function ContestPayoutRowSubtitle({ children }: { children: ReactNode }) {
  return <p className="mt-0.5 text-xs leading-tight text-slate-500">{children}</p>;
}
