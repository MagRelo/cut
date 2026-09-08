import { CurrencyDollarIcon } from "@heroicons/react/24/outline";
import { referralStakeLabel } from "../../lib/referralStake";

interface ReferralStakeIconProps {
  depth: number;
  className?: string;
  /** Overrides the default contest-win tooltip / accessible name. */
  label?: string;
}

export const ReferralStakeIcon = ({
  depth,
  className = "h-5 w-5",
  label,
}: ReferralStakeIconProps) => {
  const resolvedLabel = label ?? referralStakeLabel(depth);

  return (
    <span
      className="inline-flex shrink-0 text-emerald-600"
      title={resolvedLabel}
      aria-label={resolvedLabel}
    >
      <CurrencyDollarIcon className={className} aria-hidden />
    </span>
  );
};
