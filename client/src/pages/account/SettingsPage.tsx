import { Cog6ToothIcon } from "@heroicons/react/24/outline";
import { useAccount } from "wagmi";
import { useEffectiveWalletAddress } from "../../hooks/useEffectiveWalletAddress";

import { Button } from "../../components/common/Button";
import { CopyButton } from "../../components/common/CopyToClipboard";
import { Breadcrumbs } from "../../components/common/Breadcrumbs";
import {
  AccountPanelHeading,
  accountPanelClassName,
  accountPanelIconClassName,
  accountSectionHeadingClassName,
} from "../../components/account/AccountPanel";
import { DisplaySettings } from "../../components/account/DisplaySettings";
import { useAuth } from "../../contexts/AuthContext";

function truncateMiddle(value: string, head = 8, tail = 6) {
  if (value.length <= head + tail + 1) return value;
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}

const AccountInfo = ({
  disconnect,
  canSignOut,
  userEmail,
  accountIdAddress,
}: {
  disconnect: () => void;
  canSignOut: boolean;
  userEmail: string | null | undefined;
  accountIdAddress: string | undefined;
}) => {
  return (
    <section className={accountPanelClassName}>
      <h2 className={accountSectionHeadingClassName}>Account Information</h2>

      <div className="space-y-3 pl-3">
        {userEmail ? (
          <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4">
            <span className="shrink-0 font-display text-sm font-medium text-gray-700">Email</span>
            <div className="flex min-w-0 justify-end break-all text-right font-display text-sm text-gray-600">
              {userEmail}
            </div>
          </div>
        ) : null}

        {accountIdAddress ? (
          <div>
            <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4">
              <span className="shrink-0 font-display text-sm font-medium text-gray-700">
                Wallet address
              </span>
              <div className="flex min-w-0 flex-nowrap items-center justify-end gap-3">
                <span
                  className="truncate text-right font-mono text-xs text-gray-800"
                  title={accountIdAddress}
                >
                  {truncateMiddle(accountIdAddress)}
                </span>
                <CopyButton text={accountIdAddress} />
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {canSignOut && (
        <div className="mt-4">
          <hr className="border-slate-300" />
          <div className="flex justify-center pt-4">
            <Button
              type="button"
              className="min-w-[120px]"
              onClick={() => {
                void disconnect();
              }}
            >
              Sign Out
            </Button>
          </div>
        </div>
      )}
    </section>
  );
};

export function SettingsPage() {
  const { logout, user } = useAuth();
  const { address } = useAccount();
  const smartWalletAddress = useEffectiveWalletAddress();

  return (
    <>
      <Breadcrumbs
        items={[{ label: "Account", path: "/account" }, { label: "Settings" }]}
        className="mb-2"
      />
      <AccountPanelHeading icon={<Cog6ToothIcon className={accountPanelIconClassName} aria-hidden />}>
        Settings
      </AccountPanelHeading>

      <div className="space-y-4">
        <DisplaySettings />

        <AccountInfo
          disconnect={logout}
          canSignOut={!!address || !!smartWalletAddress}
          userEmail={user?.email}
          accountIdAddress={smartWalletAddress}
        />
      </div>
    </>
  );
}
