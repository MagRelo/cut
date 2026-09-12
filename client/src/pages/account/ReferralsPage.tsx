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
      <h1 className="mb-2 flex items-center gap-2 font-display text-xl font-semibold text-gray-900">
        <TreeIcon className="h-6 w-6 shrink-0 text-green-700" aria-hidden />
        Fantasy Sports, Powered by Players
      </h1>
      <p className="mb-4 font-display text-sm text-gray-700">
        Play The Cut puts players first—no hidden fees, no ads, no sponsors. Just players supporting
        players. Invite your people, build your team, and help grow the game.
      </p>
      <p className="mb-4 font-display text-sm text-gray-700">
        The Referral Network makes Play The Cut a team sport. As friends invite friends, your
        network grows—and when players in your network win contests, rewards flow back to you. Share
        your referral link to start building.{" "}
        <Link to="/faq#referral-network" className="text-blue-600 hover:underline">
          Learn how referral earnings work…
        </Link>
      </p>
      <ReferralNetworkPanel />
    </div>
  );
}
