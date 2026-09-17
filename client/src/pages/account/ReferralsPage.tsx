import { Breadcrumbs } from "../../components/common/Breadcrumbs";
import { TreeIcon } from "../../components/common/TreeIcon";
import { ReferralNetworkPanel } from "../../components/account/ReferralNetworkPanel";

export function ReferralsPage() {
  return (
    <div className="mb-8 space-y-4 font-display text-sm leading-relaxed text-gray-700">
      <div>
        <Breadcrumbs
          items={[{ label: "Account", path: "/account" }, { label: "Referral Network" }]}
          className="mb-2"
        />
        <h1 className="flex items-center gap-2 font-display text-xl font-semibold text-gray-900">
          <TreeIcon className="h-6 w-6 shrink-0 text-green-700" aria-hidden />
          Referral Rewards
        </h1>
      </div>

      <p>
        Play The Cut is different—<b>no fees, no ads</b>. We grow by referrals - players supporting
        players.
      </p>

      <p>
        Referrals turn contests into a team sport - <b>when your friends win, you win</b>. As your
        friends invite friends, your network grows. Share your referral link to start building your
        team!
      </p>

      <ReferralNetworkPanel />
    </div>
  );
}
