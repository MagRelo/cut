import { Breadcrumbs } from "../../components/common/Breadcrumbs";
import { ReferralNetworkPanel } from "../../components/account/ReferralNetworkPanel";

export function ReferralsPage() {
  return (
    <div className="mb-8">
      <Breadcrumbs
        items={[{ label: "Account", path: "/account" }, { label: "Referral Network" }]}
        className="mb-2"
      />
      <ReferralNetworkPanel />
    </div>
  );
}
