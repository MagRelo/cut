import { isStagingDeploy } from "../../config/targetChain";

/** Compact badge for staging builds (`vite --mode staging`). Renders nothing in prod. */
export function StagingBadge({ className = "" }: { className?: string }) {
  if (!isStagingDeploy()) return null;

  return (
    <span
      className={[
        "inline-flex items-center rounded-sm border border-amber-300 bg-amber-100 px-1.5 py-0.5",
        "text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-900",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      title="Staging environment — not production"
    >
      Staging
    </span>
  );
}
