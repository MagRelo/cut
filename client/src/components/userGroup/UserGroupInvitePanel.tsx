import { useState } from "react";
import { CopyButton } from "../common/CopyToClipboard";
import { ErrorMessage } from "../common/ErrorMessage";
import { LoadingSpinnerSmall } from "../common/LoadingSpinnerSmall";
import { Modal } from "../common/Modal";
import { ShareInviteButton } from "../common/ShareInviteButton";
import { useGenerateLeagueInvite } from "../../hooks/useUserGroupMutations";
import { BRAND_PROSE } from "../../lib/brand";
import { walletSpecLabelClassName } from "../account/wallet/AssetChips";
import { walletAddressWellClassName } from "../account/wallet/WalletAddressCopy";
import {
  WalletSpecPanel,
  walletSpecCtaClassName,
  walletSpecSecondaryClassName,
} from "../account/wallet/WalletSpecPanel";

interface UserGroupInvitePanelProps {
  userGroupId: string;
  inviteCode?: string | null;
  inviteUrl?: string | null;
  onInviteUpdated?: () => void;
}

export const UserGroupInvitePanel = ({
  userGroupId,
  inviteUrl,
  onInviteUpdated,
}: UserGroupInvitePanelProps) => {
  const generateInviteMutation = useGenerateLeagueInvite();
  const [showRotateConfirm, setShowRotateConfirm] = useState(false);

  const activeInviteUrl = generateInviteMutation.data?.inviteUrl ?? inviteUrl ?? null;

  const handleGenerate = () => {
    generateInviteMutation.mutate(userGroupId, {
      onSuccess: () => {
        setShowRotateConfirm(false);
        onInviteUpdated?.();
      },
    });
  };

  const errorMessage =
    generateInviteMutation.error instanceof Error ? generateInviteMutation.error.message : null;

  return (
    <div className="space-y-3 font-display">
      {errorMessage ? <ErrorMessage message={errorMessage} /> : null}

      <WalletSpecPanel
        headingId="league-invite-heading"
        heading="League invite link"
        description={
          activeInviteUrl
            ? "Share by text or email, or copy the URL."
            : "Generate a link, then share it with anyone you want in the league."
        }
      >
        <div className="px-4 py-3">
          <p className="text-sm leading-relaxed text-gray-700">When someone follows this link:</p>
          <ol className="mt-1.5 list-decimal space-y-1 pl-5 text-sm leading-relaxed text-gray-700">
            <li>They will be prompted to create an account (if needed)</li>
            <li>You are set as their referrer</li>
            <li>They are added to the league</li>
          </ol>
        </div>
        {activeInviteUrl ? (
          <>
            <div className="px-4 py-3">
              <p className={walletSpecLabelClassName}>Invite link</p>
              <p
                className={`mt-1.5 break-all ${walletAddressWellClassName}`}
                aria-label={activeInviteUrl}
              >
                {activeInviteUrl}
              </p>
            </div>
            <div className="flex flex-col gap-2 px-4 py-3 pt-0">
              <ShareInviteButton
                url={activeInviteUrl}
                shareText={`Join my league on ${BRAND_PROSE}`}
                ariaLabel="Share league invite"
                label="Share invite"
                variant="cta"
                className="min-h-11 w-full"
              />
              <CopyButton text={activeInviteUrl} variant="secondary" idleLabel="Copy link" />
              <button
                type="button"
                onClick={() => setShowRotateConfirm(true)}
                disabled={generateInviteMutation.isPending}
                className="flex min-h-11 w-full items-center justify-center text-center text-sm text-gray-600 hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
              >
                Old links still out there?{" "}
                <span className="ml-1 font-medium text-gray-800 underline decoration-gray-300 underline-offset-2">
                  Rotate this one
                </span>
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-col gap-2 px-4 py-3">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={generateInviteMutation.isPending}
              className={walletSpecCtaClassName}
            >
              {generateInviteMutation.isPending ? <LoadingSpinnerSmall /> : null}
              Generate invite
            </button>
          </div>
        )}
      </WalletSpecPanel>

      <Modal
        isOpen={showRotateConfirm}
        onClose={() => setShowRotateConfirm(false)}
        title="Rotate invite link"
        maxWidth="md"
      >
        <div className="space-y-4 p-4 font-display">
          <p className="text-sm leading-relaxed text-gray-700">
            This creates a new invite link. The current link will stop working, so anyone who still
            has the old one will not be able to join.
          </p>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={generateInviteMutation.isPending}
              className={walletSpecCtaClassName}
            >
              {generateInviteMutation.isPending ? <LoadingSpinnerSmall /> : null}
              Rotate link
            </button>
            <button
              type="button"
              onClick={() => setShowRotateConfirm(false)}
              disabled={generateInviteMutation.isPending}
              className={walletSpecSecondaryClassName}
            >
              Keep current link
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
