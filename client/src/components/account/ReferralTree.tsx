import type { ReferralSummaryNode } from "../../hooks/useUserReferralSummary";
import { ShareInviteButton } from "../common/ShareInviteButton";
import { resolveUserBorderColor } from "../../lib/lineupDisplay";
import { buildReferralDisplayTree, type ReferralDisplayNode } from "../../lib/referralDisplayTree";

function NodePanel({ node, shareUrl }: { node: ReferralDisplayNode; shareUrl?: string | null }) {
  if (node.empty) {
    return (
      <div
        className="rounded-sm border border-gray-200 bg-white px-3 py-2 font-display shadow-sm"
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
      className="rounded-sm border border-gray-200 bg-white px-3 py-2 font-display shadow-sm"
      style={{
        borderLeftColor: resolveUserBorderColor(node.color),
        borderLeftWidth: "5px",
        borderLeftStyle: "solid",
      }}
    >
      <p className="truncate text-base font-semibold leading-tight text-gray-900" title={node.label}>
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
    <ul className="ml-4 mt-2 space-y-2 border-l border-slate-200 pl-3">
      {nodes.map((node) => (
        <TreeItem key={node.key} node={node} branched shareUrl={shareUrl} />
      ))}
    </ul>
  );
}

function TreeItem({
  node,
  branched = false,
  shareUrl,
}: {
  node: ReferralDisplayNode;
  branched?: boolean;
  shareUrl?: string | null;
}) {
  return (
    <li>
      <div className="relative">
        {branched ? (
          <span
            className="absolute -left-3 top-1/2 h-px w-3 -translate-y-1/2 bg-slate-200"
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
  viewerColor,
  shareUrl,
}: {
  people: ReferralSummaryNode[];
  viewerColor?: string;
  shareUrl?: string | null;
}) {
  const root = buildReferralDisplayTree(people, viewerColor);

  return (
    <ul className="space-y-2" aria-label="Your referral tree">
      <TreeItem node={root} shareUrl={shareUrl} />
    </ul>
  );
}
