import { useState } from "react";
import { Link } from "react-router-dom";
import { type UserGroupMemberResponse, type AddUserGroupMemberInput } from "../../types/userGroup";
import { useAddUserGroupMember, useRemoveUserGroupMember } from "../../hooks/useUserGroupMutations";
import { useAuth } from "../../contexts/AuthContext";
import { ErrorMessage } from "../common/ErrorMessage";
import { LoadingSpinnerSmall } from "../common/LoadingSpinnerSmall";
import { Modal } from "../common/Modal";
import { buildFundSendUrl } from "../../lib/fundLinks";
import {
  walletSpecCtaClassName,
  walletSpecSecondaryClassName,
} from "../account/wallet/WalletSpecPanel";

interface UserGroupMemberManagementProps {
  userGroupId: string;
  members: UserGroupMemberResponse[];
  onMemberAdded?: () => void;
  onMemberRemoved?: () => void;
}

const fieldClassName =
  "min-h-11 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100";

const sendFundsClassName =
  "inline-flex min-h-11 shrink-0 items-center justify-center rounded border border-blue-500 bg-blue-500 px-4 font-display text-sm font-medium text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2";

const chipClassName =
  "rounded bg-gray-100 px-1.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-gray-700";

export const UserGroupMemberManagement = ({
  userGroupId,
  members,
  onMemberAdded,
  onMemberRemoved,
}: UserGroupMemberManagementProps) => {
  const { user } = useAuth();
  const currentUserId = user?.id;
  const [showAddModal, setShowAddModal] = useState(false);
  const [walletAddress, setWalletAddress] = useState("");
  const [role, setRole] = useState<"MEMBER" | "ADMIN">("MEMBER");
  const [removeConfirmUserId, setRemoveConfirmUserId] = useState<string | null>(null);

  const addMemberMutation = useAddUserGroupMember();
  const removeMemberMutation = useRemoveUserGroupMember();
  const adminCount = members.filter((member) => member.role === "ADMIN").length;

  const isValidWalletAddress = (address: string): boolean => {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  };

  const closeAddModal = () => {
    setShowAddModal(false);
    setWalletAddress("");
    setRole("MEMBER");
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedAddress = walletAddress.trim();

    if (!trimmedAddress) return;

    if (!isValidWalletAddress(trimmedAddress)) {
      return;
    }

    const data: AddUserGroupMemberInput = {
      walletAddress: trimmedAddress.toLowerCase(),
      role,
    };

    addMemberMutation.mutate(
      { id: userGroupId, data },
      {
        onSuccess: () => {
          closeAddModal();
          onMemberAdded?.();
        },
      },
    );
  };

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
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-medium text-gray-900">
          Members{" "}
          <span className="font-normal tabular-nums text-gray-600">({members.length})</span>
        </h3>
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="inline-flex min-h-11 shrink-0 items-center rounded border border-gray-300 px-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Add by wallet
        </button>
      </div>

      <Modal
        isOpen={showAddModal}
        onClose={closeAddModal}
        title="Add by wallet"
        maxWidth="md"
      >
        <form onSubmit={handleAddMember} className="space-y-4 p-4">
          {addMemberMutation.error && (
            <ErrorMessage
              message={
                (addMemberMutation.error as any)?.response?.data?.error || "Failed to add member"
              }
            />
          )}

          <p className="text-sm leading-relaxed text-gray-700">
            Use this only if someone already has a Play The Cut wallet. The invite link is the usual
            way to add players.
          </p>

          <div>
            <label htmlFor="walletAddress" className="block text-sm font-medium text-gray-700">
              Wallet address <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="walletAddress"
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              required
              className={`${fieldClassName} mt-1.5 font-mono ${
                walletAddress.trim() && !isValidWalletAddress(walletAddress.trim())
                  ? "border-red-300 bg-red-50"
                  : ""
              }`}
              placeholder="0x..."
              disabled={addMemberMutation.isPending}
            />
            {walletAddress.trim() && !isValidWalletAddress(walletAddress.trim()) && (
              <p className="mt-1 text-xs text-red-600">
                Enter a valid wallet address (0x followed by 40 hex characters).
              </p>
            )}
            {!walletAddress.trim() ? (
              <p className="mt-1 text-xs text-gray-600">
                Public address of the person you want to add.
              </p>
            ) : null}
          </div>

          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700">
              Role
            </label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value as "MEMBER" | "ADMIN")}
              className={`${fieldClassName} mt-1.5`}
              disabled={addMemberMutation.isPending}
            >
              <option value="MEMBER">Member</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <button
              type="submit"
              disabled={
                addMemberMutation.isPending ||
                !walletAddress.trim() ||
                !isValidWalletAddress(walletAddress.trim())
              }
              className={walletSpecCtaClassName}
            >
              {addMemberMutation.isPending ? <LoadingSpinnerSmall /> : null}
              Add member
            </button>
            <button
              type="button"
              onClick={closeAddModal}
              className={walletSpecSecondaryClassName}
              disabled={addMemberMutation.isPending}
            >
              Cancel
            </button>
          </div>
        </form>
      </Modal>

      <ul className="divide-y divide-gray-100">
        {members.map((member) => {
          const isYou = member.userId === currentUserId;
          const isLastAdmin = member.role === "ADMIN" && adminCount === 1;
          const canRemove = !isLastAdmin;
          const showSendFunds = Boolean(member.walletAddress) && !isYou;

          return (
            <li key={member.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-medium text-gray-900">{member.user.name}</span>
                  {isYou ? <span className={chipClassName}>You</span> : null}
                  {member.role === "ADMIN" ? <span className={chipClassName}>Admin</span> : null}
                </div>
                <p className="mt-0.5 text-xs text-gray-600">
                  Joined {new Date(member.joinedAt).toLocaleDateString()}
                </p>
                {canRemove ? (
                  <button
                    type="button"
                    onClick={() => setRemoveConfirmUserId(member.userId)}
                    className="mt-1 inline-flex min-h-9 items-center text-sm font-medium text-red-700 hover:text-red-800"
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
