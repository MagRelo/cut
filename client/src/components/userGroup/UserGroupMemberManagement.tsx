import { useState } from "react";
import { Link } from "react-router-dom";
import { type UserGroupMemberResponse, type AddUserGroupMemberInput } from "../../types/userGroup";
import { useAddUserGroupMember, useRemoveUserGroupMember } from "../../hooks/useUserGroupMutations";
import { ErrorMessage } from "../common/ErrorMessage";
import { LoadingSpinnerSmall } from "../common/LoadingSpinnerSmall";
import { Modal } from "../common/Modal";
import { buildFundSendUrl } from "../../lib/fundLinks";

interface UserGroupMemberManagementProps {
  userGroupId: string;
  members: UserGroupMemberResponse[];
  onMemberAdded?: () => void;
  onMemberRemoved?: () => void;
}

export const UserGroupMemberManagement = ({
  userGroupId,
  members,
  onMemberAdded,
  onMemberRemoved,
}: UserGroupMemberManagementProps) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [walletAddress, setWalletAddress] = useState("");
  const [role, setRole] = useState<"MEMBER" | "ADMIN">("MEMBER");
  const [removeConfirmUserId, setRemoveConfirmUserId] = useState<string | null>(null);

  const addMemberMutation = useAddUserGroupMember();
  const removeMemberMutation = useRemoveUserGroupMember();

  const isValidWalletAddress = (address: string): boolean => {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
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
          setWalletAddress("");
          setRole("MEMBER");
          setShowAddModal(false);
          onMemberAdded?.();
        },
      }
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
      }
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
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Members</h3>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          Add Member
        </button>
      </div>

      {/* Add Member Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setWalletAddress("");
          setRole("MEMBER");
        }}
        title="Add Member"
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

          <div className="space-y-2">
            <label htmlFor="walletAddress" className="block text-sm font-medium text-gray-700">
              Wallet Address <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="walletAddress"
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              required
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm ${
                walletAddress.trim() && !isValidWalletAddress(walletAddress.trim())
                  ? "border-red-300 bg-red-50"
                  : "border-gray-300"
              }`}
              placeholder="0x..."
              disabled={addMemberMutation.isPending}
            />
            {walletAddress.trim() && !isValidWalletAddress(walletAddress.trim()) && (
              <p className="text-xs text-red-600">
                Please enter a valid Ethereum wallet address (0x followed by 40 hex characters)
              </p>
            )}
            {walletAddress.trim() && isValidWalletAddress(walletAddress.trim()) && (
              <p className="text-xs text-green-600">Valid wallet address</p>
            )}
            {!walletAddress.trim() && (
              <p className="text-xs text-gray-500">
                Enter the wallet address (public address) of the person you want to add to this
                league
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="role" className="block text-sm font-medium text-gray-700">
              Role
            </label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value as "MEMBER" | "ADMIN")}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={addMemberMutation.isPending}
            >
              <option value="MEMBER">Member</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setShowAddModal(false);
                setWalletAddress("");
                setRole("MEMBER");
              }}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
              disabled={addMemberMutation.isPending}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                addMemberMutation.isPending ||
                !walletAddress.trim() ||
                !isValidWalletAddress(walletAddress.trim())
              }
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {addMemberMutation.isPending && <LoadingSpinnerSmall />}
              Add Member
            </button>
          </div>
        </form>
      </Modal>

      {/* Members List */}
      <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
        {members.map((member) => (
          <li key={member.id} className="px-3 py-3">
            <div className="font-medium text-gray-900">{member.user.name}</div>
            <div className="mt-0.5 text-xs text-gray-400">
              Joined {new Date(member.joinedAt).toLocaleDateString()}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              {member.walletAddress ? (
                <Link
                  to={buildFundSendUrl(member.walletAddress)}
                  className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
                >
                  Send funds
                </Link>
              ) : null}
              <button
                type="button"
                onClick={() => setRemoveConfirmUserId(member.userId)}
                className="font-medium text-red-600 hover:text-red-800 hover:underline"
              >
                Remove
              </button>
            </div>
          </li>
        ))}
      </ul>

      {/* Remove Confirmation Modal */}
      <Modal
        isOpen={removeConfirmUserId !== null}
        onClose={() => setRemoveConfirmUserId(null)}
        title="Remove Member"
        maxWidth="md"
      >
        <div className="space-y-4 p-4">
          {removeMemberMutation.error && <ErrorMessage message={getRemoveError()} />}

          <p className="text-gray-700">
            Are you sure you want to remove this member from the league? This action cannot be
            undone.
          </p>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setRemoveConfirmUserId(null)}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
              disabled={removeMemberMutation.isPending}
            >
              Cancel
            </button>
            <button
              onClick={() => removeConfirmUserId && handleRemoveMember(removeConfirmUserId)}
              disabled={removeMemberMutation.isPending}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-red-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {removeMemberMutation.isPending && <LoadingSpinnerSmall />}
              Remove Member
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
