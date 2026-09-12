import { useAuth } from "../../contexts/AuthContext";
import { formatReferralEarned } from "../../lib/formatReferralEarned";
import { useUserReferralSummary } from "../../hooks/useUserReferralSummary";

/** Cached referral earnings for account menus. Renders nothing until the shared query has data. */
export function ReferralMenuTotal() {
  const { user } = useAuth();
  const { data } = useUserReferralSummary(user?.id);
  if (data == null) return null;

  return (
    <span className="shrink-0 font-normal tabular-nums tracking-normal">
      +{formatReferralEarned(data.totalEarned)}
    </span>
  );
}
