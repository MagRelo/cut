import type { ReferralSummaryNode } from "../../hooks/useUserReferralSummary";
import { ShareInviteButton } from "../common/ShareInviteButton";
import { TreeIcon } from "../common/TreeIcon";
import { resolveUserBorderColor } from "../../lib/lineupDisplay";
import { buildReferralDisplayTree, type ReferralDisplayNode } from "../../lib/referralDisplayTree";

const ghostInvite: ReferralDisplayNode = {
  key: "ghost-invite",
  label: "Share your link!",
  invite: true,
  children: [],
};

function NodePanel({ node, shareUrl }: { node: ReferralDisplayNode; shareUrl?: string | null }) {
  if (node.invite) {
    return (
      <div
        className="rounded-sm border border-dashed border-gray-300 bg-white/80 px-3 py-4 font-display"
        style={{
          borderLeftColor: resolveUserBorderColor(undefined),
          borderLeftWidth: "5px",
          borderLeftStyle: "solid",
        }}
      >
        {shareUrl ? (
          <ShareInviteButton
            url={shareUrl}
            ariaLabel="Share your referral link"
            label={node.label}
            variant="link"
          />
        ) : (
          <span className="text-base font-semibold leading-tight text-blue-600">{node.label}</span>
        )}
      </div>
    );
  }

  return (
    <div
      className="rounded-sm border border-gray-200 bg-white px-3 py-4 font-display shadow-sm"
      style={{
        borderLeftColor: resolveUserBorderColor(node.color),
        borderLeftWidth: "5px",
        borderLeftStyle: "solid",
      }}
    >
      <p
        className="truncate text-base font-semibold leading-tight text-gray-900"
        title={node.label}
      >
        {node.label}
      </p>
    </div>
  );
}

function TreeRows({
  nodes,
  shareUrl,
}: {
  nodes: ReferralDisplayNode[];
  shareUrl?: string | null;
}) {
  if (nodes.length === 0) return null;

  return (
    <ul className="relative mt-2 space-y-2 pl-4">
      <span className="absolute -top-2 left-[2px] h-2 w-px bg-slate-300" aria-hidden />
      {nodes.map((node, index) => (
        <TreeItem
          key={node.key}
          node={node}
          branched
          isLast={index === nodes.length - 1}
          shareUrl={shareUrl}
        />
      ))}
    </ul>
  );
}

function TreeItem({
  node,
  branched = false,
  isLast = false,
  shareUrl,
}: {
  node: ReferralDisplayNode;
  branched?: boolean;
  isLast?: boolean;
  shareUrl?: string | null;
}) {
  return (
    <li className="relative">
      {branched && !isLast ? (
        <span className="absolute -bottom-2 -left-[14px] top-0 w-px bg-slate-300" aria-hidden />
      ) : null}
      <div className="relative">
        {branched && isLast ? (
          <span className="absolute -left-[14px] top-0 h-1/2 w-px bg-slate-300" aria-hidden />
        ) : null}
        {branched ? (
          <span
            className="absolute -left-3.5 top-1/2 h-px w-3.5 -translate-y-1/2 bg-slate-300"
            aria-hidden
          />
        ) : null}
        <NodePanel node={node} shareUrl={shareUrl} />
      </div>
      <TreeRows nodes={node.children} shareUrl={shareUrl} />
    </li>
  );
}

export function ReferralTree({
  people,
  shareUrl,
}: {
  people: ReferralSummaryNode[];
  shareUrl?: string | null;
}) {
  const referrals = buildReferralDisplayTree(people);
  const rows = referrals.length > 0 ? referrals : [ghostInvite];

  return (
    <div aria-label="Your referral tree">
      <div className="flex w-6 -translate-x-[10px] flex-col items-center">
        <span
          className="flex h-6 w-6 items-center justify-center rounded-full border border-green-600 bg-white shadow-sm"
          aria-label="Part of the referral tree"
        >
          <TreeIcon className="h-3.5 w-3.5 text-green-700" aria-hidden />
        </span>
        <span className="h-2 w-px bg-slate-300" aria-hidden />
      </div>
      <ul className="relative space-y-2 pl-4">
        {rows.map((node, index) => (
          <TreeItem
            key={node.key}
            node={node}
            branched
            isLast={index === rows.length - 1}
            shareUrl={shareUrl}
          />
        ))}
      </ul>
    </div>
  );
}
