import { isStagingDeploy } from "../../config/targetChain";

function stagingBadgeLabel(): string {
  const tag = import.meta.env.VITE_DEPLOY_TAG?.trim();
  return tag || "Staging";
}

/** Compact badge for staging builds (`vite --mode staging`). Renders nothing in prod. */
export function StagingBadge({ className = "" }: { className?: string }) {
  if (!isStagingDeploy()) return null;

  const label = stagingBadgeLabel();

  return (
    <span
      className={[
        "inline-flex max-w-[11rem] items-center truncate rounded-sm border border-amber-300 bg-amber-100 px-1.5 py-0.5",
        "font-mono text-[10px] font-semibold tracking-tight text-amber-900",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      title={`Staging · ${label}`}
    >
      {label}
    </span>
  );
}
