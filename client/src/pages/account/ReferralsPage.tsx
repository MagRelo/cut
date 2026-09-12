import { Link } from "react-router-dom";
import { Breadcrumbs } from "../../components/common/Breadcrumbs";
import { TreeIcon } from "../../components/common/TreeIcon";
import { ReferralNetworkPanel } from "../../components/account/ReferralNetworkPanel";

export function ReferralsPage() {
  return (
    <div className="mb-8">
      <Breadcrumbs
        items={[{ label: "Account", path: "/account" }, { label: "Referral Network" }]}
        className="mb-2"
      />
      <h1 className="mb-4 flex items-center gap-2 font-display text-xl font-semibold text-gray-900">
        <TreeIcon className="h-6 w-6 shrink-0 text-green-700" aria-hidden />
        Referral Rewards
      </h1>
      <p className="mb-4 font-display text-sm text-gray-700">
        Play The Cut is different—<b>no hidden fees, no ads, no sponsors</b>. It grows through the
        players who believe in it. Invite your people, help build a stronger community, and share in
        the rewards.
      </p>
      <p className="mb-4 font-display text-sm text-gray-700">
        <b>Referral Rewards</b> make Play The Cut a team sport. As friends invite friends, your
        network grows—and <b>when they win, you win too</b>. Share your referral link to start
        building you team!
      </p>
      <p className="mb-6 font-display text-sm text-gray-700">
        <Link to="/faq#referral-network" className="text-blue-600 hover:underline">
          Learn more about referral rewards…
        </Link>
      </p>
      <ReferralNetworkPanel />
    </div>
  );
}
