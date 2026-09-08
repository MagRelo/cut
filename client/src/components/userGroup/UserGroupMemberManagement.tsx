import { useState } from "react";
import { Link } from "react-router-dom";
import { type UserGroupMemberResponse } from "../../types/userGroup";
import { useRemoveUserGroupMember } from "../../hooks/useUserGroupMutations";
import { useAuth } from "../../contexts/AuthContext";
import { ErrorMessage } from "../common/ErrorMessage";
import { LoadingSpinnerSmall } from "../common/LoadingSpinnerSmall";
import { Modal } from "../common/Modal";
import { ReferralStakeIcon } from "../contest/ReferralStakeIcon";
import { inviteNetworkLabel } from "../../lib/referralStake";
import { buildFundSendUrl } from "../../lib/fundLinks";
import { walletSpecSecondaryClassName } from "../account/wallet/WalletSpecPanel";

interface UserGroupMemberManagementProps {
  userGroupId: string;
  members: UserGroupMemberResponse[];
  onMemberRemoved?: () => void;
}

const sendFundsClassName =
  "inline-flex min-h-11 shrink-0 items-center justify-center rounded border border-blue-500 bg-blue-500 px-4 font-display text-sm font-medium text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2";

const chipClassName =
  "rounded bg-gray-100 px-1.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-gray-700";

export const UserGroupMemberManagement = ({
  userGroupId,
  members,
  onMemberRemoved,
}: UserGroupMemberManagementProps) => {
  const { user } = useAuth();
  const currentUserId = user?.id;
  const [removeConfirmUserId, setRemoveConfirmUserId] = useState<string | null>(null);

  const removeMemberMutation = useRemoveUserGroupMember();
  const adminCount = members.filter((member) => member.role === "ADMIN").length;

  const handleRemoveMember = (memberUserId: string) => {
    removeMemberMutation.mutate(
      { id: userGroupId, userId: memberUserId },
      {
        onSuccess: () => {
          setRemoveConfirmUserId(null);
          onMemberRemoved?.();
        },
      },
    );
  };

  const getRemoveError = () => {
    const error = removeMemberMutation.error as any;
    if (error?.message) {
      return error.message;
    }
    if (error?.response?.data?.error) {
      return error.response.data.error;
    }
    return "Failed to remove member";
  };

  return (
    <div className="space-y-3 font-display">
      <h3 className="font-medium text-gray-900">
        Members{" "}
        <span className="font-normal tabular-nums text-gray-600">({members.length})</span>
      </h3>

      <ul className="divide-y divide-gray-100">
        {members.map((member) => {
          const isYou = member.userId === currentUserId;
          const isLastAdmin = member.role === "ADMIN" && adminCount === 1;
          const canRemove = !isLastAdmin;
          const showSendFunds = Boolean(member.walletAddress) && !isYou;
          const referralDepth = member.referralStake?.depth;
          const showReferralStake = referralDepth != null && referralDepth >= 1;
          const networkLabel = showReferralStake ? inviteNetworkLabel(referralDepth) : null;

          return (
            <li key={member.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-medium text-gray-900">{member.user.name}</span>
                  {isYou ? <span className={chipClassName}>You</span> : null}
                  {member.role === "ADMIN" ? <span className={chipClassName}>Admin</span> : null}
                  {showReferralStake ? (
                    <ReferralStakeIcon
                      depth={referralDepth}
                      className="h-4 w-4"
                      label={networkLabel ?? undefined}
                    />
                  ) : null}
                </div>
                {networkLabel ? (
                  <p className="mt-0.5 text-xs text-emerald-800">{networkLabel}</p>
                ) : null}
                {canRemove ? (
                  <button
                    type="button"
                    onClick={() => setRemoveConfirmUserId(member.userId)}
                    className="mt-1 inline-flex min-h-5 items-center text-sm font-medium text-red-700 hover:text-red-800"
                  >
                    Remove
                  </button>
                ) : null}
              </div>
              {showSendFunds && member.walletAddress ? (
                <Link to={buildFundSendUrl(member.walletAddress)} className={sendFundsClassName}>
                  Send funds
                </Link>
              ) : null}
            </li>
          );
        })}
      </ul>

      <Modal
        isOpen={removeConfirmUserId !== null}
        onClose={() => setRemoveConfirmUserId(null)}
        title="Remove member"
        maxWidth="md"
      >
        <div className="space-y-4 p-4 font-display">
          {removeMemberMutation.error && <ErrorMessage message={getRemoveError()} />}

          <p className="text-sm leading-relaxed text-gray-700">
            Remove this member from the league? They will need a new invite to join again.
          </p>

          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => removeConfirmUserId && handleRemoveMember(removeConfirmUserId)}
              disabled={removeMemberMutation.isPending}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded border border-red-600 bg-red-600 px-4 font-display text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {removeMemberMutation.isPending ? <LoadingSpinnerSmall /> : null}
              Remove member
            </button>
            <button
              type="button"
              onClick={() => setRemoveConfirmUserId(null)}
              className={walletSpecSecondaryClassName}
              disabled={removeMemberMutation.isPending}
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
