import { CurrencyDollarIcon } from "@heroicons/react/24/outline";
import { referralStakeLabel } from "../../lib/referralStake";

interface ReferralStakeIconProps {
  depth: number;
  className?: string;
}

export const ReferralStakeIcon = ({ depth, className = "h-5 w-5" }: ReferralStakeIconProps) => {
  const label = referralStakeLabel(depth);

  return (
    <span className="inline-flex shrink-0 text-emerald-600" title={label} aria-label={label}>
      <CurrencyDollarIcon className={className} aria-hidden />
    </span>
  );
};
