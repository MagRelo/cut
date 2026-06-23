import { CopyButton } from "../common/CopyToClipboard";
import { ErrorMessage } from "../common/ErrorMessage";
import { LoadingSpinnerSmall } from "../common/LoadingSpinnerSmall";
import { ShareInviteButton } from "../common/ShareInviteButton";
import { useGenerateLeagueInvite } from "../../hooks/useUserGroupMutations";
import { BRAND_PROSE } from "../../lib/brand";

const inviteLinkRowGridClass = "grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4";

interface UserGroupInvitePanelProps {
  userGroupId: string;
  inviteCode?: string | null;
  inviteUrl?: string | null;
  onInviteUpdated?: () => void;
  /** Share: copy link only. Manage: generate/rotate link. */
  variant?: "share" | "manage";
}

export const UserGroupInvitePanel = ({
  userGroupId,
  inviteCode,
  inviteUrl,
  onInviteUpdated,
  variant = "manage",
}: UserGroupInvitePanelProps) => {
  const generateInviteMutation = useGenerateLeagueInvite();

  const activeInviteUrl = generateInviteMutation.data?.inviteUrl ?? inviteUrl ?? null;
  const activeInviteCode = generateInviteMutation.data?.inviteCode ?? inviteCode ?? null;

  const handleGenerate = () => {
    generateInviteMutation.mutate(userGroupId, {
      onSuccess: () => {
        onInviteUpdated?.();
      },
    });
  };

  const errorMessage =
    generateInviteMutation.error instanceof Error ? generateInviteMutation.error.message : null;

  const isManageVariant = variant === "manage";

  return (
    <div className="space-y-4">
      {errorMessage ? <ErrorMessage message={errorMessage} /> : null}

      {activeInviteUrl ? (
        <div className="space-y-3">
          {isManageVariant ? (
            <div className={inviteLinkRowGridClass}>
              <span className="shrink-0 font-display text-sm font-medium text-gray-700">
                Invite link
              </span>
              <div className="flex min-w-0 flex-nowrap items-center justify-end gap-3">
                <span
                  className="min-w-0 max-w-full truncate text-right font-display text-xs text-gray-800"
                  title={activeInviteUrl}
                >
                  {activeInviteUrl}
                </span>
                <CopyButton text={activeInviteUrl} />
              </div>
            </div>
          ) : (
            <div className={inviteLinkRowGridClass}>
              <span className="shrink-0 font-display text-sm font-medium text-gray-700">
                League Invite Link
              </span>
              <div className="flex min-w-0 flex-nowrap items-center justify-end gap-3">
                <ShareInviteButton
                  url={activeInviteUrl}
                  shareText={`Join my league on ${BRAND_PROSE}`}
                  ariaLabel="Share league invite link"
                />
              </div>
            </div>
          )}
          {isManageVariant && activeInviteCode ? (
            <p className="text-xs text-gray-500">Code: {activeInviteCode}</p>
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-gray-600">
          {isManageVariant
            ? "No invite link yet. Generate one to share."
            : "No invite link yet. Ask a league admin to generate one on the Manage tab."}
        </p>
      )}

      {isManageVariant ? (
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generateInviteMutation.isPending}
            className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
          >
            {generateInviteMutation.isPending && <LoadingSpinnerSmall />}
            {activeInviteUrl ? "Rotate invite link" : "Generate invite link"}
          </button>
        </div>
      ) : null}
    </div>
  );
};
