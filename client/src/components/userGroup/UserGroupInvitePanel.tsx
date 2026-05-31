import { CopyButton } from "../common/CopyToClipboard";
import { ErrorMessage } from "../common/ErrorMessage";
import { LoadingSpinnerSmall } from "../common/LoadingSpinnerSmall";
import { useGenerateLeagueInvite } from "../../hooks/useUserGroupMutations";

interface UserGroupInvitePanelProps {
  userGroupId: string;
  inviteCode?: string | null;
  inviteUrl?: string | null;
  onInviteUpdated?: () => void;
}

export const UserGroupInvitePanel = ({
  userGroupId,
  inviteCode,
  inviteUrl,
  onInviteUpdated,
}: UserGroupInvitePanelProps) => {
  const generateInviteMutation = useGenerateLeagueInvite();

  const activeInviteUrl =
    generateInviteMutation.data?.inviteUrl ?? inviteUrl ?? null;
  const activeInviteCode =
    generateInviteMutation.data?.inviteCode ?? inviteCode ?? null;

  const handleGenerate = () => {
    generateInviteMutation.mutate(userGroupId, {
      onSuccess: () => {
        onInviteUpdated?.();
      },
    });
  };

  const errorMessage =
    generateInviteMutation.error instanceof Error
      ? generateInviteMutation.error.message
      : null;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Invite Link</h3>
        <p className="text-sm text-gray-600">
          Share this link so friends can join your league. Rotating the link invalidates the old
          one.
        </p>
      </div>

      {errorMessage ? <ErrorMessage message={errorMessage} /> : null}

      {activeInviteUrl ? (
        <div className="space-y-3">
          <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 items-center">
            <span className="text-sm font-medium text-gray-700 font-display shrink-0">
              Invite link
            </span>
            <div className="flex min-w-0 flex-nowrap items-center justify-end gap-3">
              <span
                className="min-w-0 max-w-full truncate text-xs text-gray-800 text-right font-display"
                title={activeInviteUrl}
              >
                {activeInviteUrl}
              </span>
              <CopyButton text={activeInviteUrl} />
            </div>
          </div>
          {activeInviteCode ? (
            <p className="text-xs text-gray-500">Code: {activeInviteCode}</p>
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-gray-600">No invite link yet. Generate one to share.</p>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleGenerate}
          disabled={generateInviteMutation.isPending}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors text-sm font-medium flex items-center gap-2"
        >
          {generateInviteMutation.isPending && <LoadingSpinnerSmall />}
          {activeInviteUrl ? "Rotate invite link" : "Generate invite link"}
        </button>
      </div>
    </div>
  );
};
