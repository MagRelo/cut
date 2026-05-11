import type { ReactNode } from "react";

export function ContestPayoutLayout({ children }: { children: ReactNode }) {
  return <div className="space-y-4 bg-gray-100 p-3 font-display">{children}</div>;
}

export function ContestPayoutHeroCard({
  label,
  amount,
}: {
  label: string;
  amount: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="grid gap-4 px-4 py-4 sm:grid-cols-[1.35fr_1fr] sm:items-end">
        <div>
          <p className="text-[10px] font-semibold uppercase leading-tight tracking-[0.16em] text-slate-600">
            {label}
          </p>
          <div className="mt-1">{amount}</div>
        </div>
      </div>
    </section>
  );
}

const gradientMoneySizeClass = {
  hero: "text-4xl font-semibold leading-tight tracking-tight",
  row: "text-lg font-semibold leading-tight",
} as const;

export function ContestPayoutGradientMoney({
  children,
  size = "row",
}: {
  children: ReactNode;
  size?: keyof typeof gradientMoneySizeClass;
}) {
  return (
    <p
      className={`bg-gradient-to-b from-emerald-600 to-emerald-700 bg-clip-text text-transparent tabular-nums drop-shadow-[0_1px_0_rgba(5,150,105,0.12)] ${gradientMoneySizeClass[size]}`}
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
    <section className="space-y-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="border-b border-slate-200 pb-2">
        <h2 className="text-xl font-semibold leading-tight text-slate-900">{title}</h2>
        {description != null ? (
          <div className="mt-1 text-xs leading-tight text-slate-500">{description}</div>
        ) : null}
      </div>
      {children}
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
