import { TreeIcon } from "../common/TreeIcon";
import { referralStakeLabel } from "../../lib/referralStake";

interface ReferralStakeIconProps {
  depth: number;
  className?: string;
  /** Overrides the default contest-win tooltip / accessible name. */
  label?: string;
}

export const ReferralStakeIcon = ({
  depth,
  className = "h-6 w-6",
  label,
}: ReferralStakeIconProps) => {
  const resolvedLabel = label ?? referralStakeLabel(depth);

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full border border-green-600 bg-white shadow-sm ${className}`}
      title={resolvedLabel}
      aria-label={resolvedLabel}
    >
      <TreeIcon className="h-[58%] w-[58%] text-green-700" aria-hidden />
    </span>
  );
};
