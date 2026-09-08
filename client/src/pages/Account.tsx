import { Cog6ToothIcon } from "@heroicons/react/24/outline";
import { useAccount } from "wagmi";
import { useSmartWallets } from "@privy-io/react-auth/smart-wallets";

import { CopyButton } from "../components/common/CopyToClipboard";
import { Breadcrumbs } from "../components/common/Breadcrumbs";
import { PageSection } from "../components/layout/PageSection";
import { UserSettings } from "../components/user/UserSettings";
import { useAuth } from "../contexts/AuthContext";

function truncateMiddle(value: string, head = 8, tail = 6) {
  if (value.length <= head + tail + 1) return value;
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}

const WalletInfo = ({
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
    <PageSection>
      <h2 className="mb-3 font-display text-lg font-semibold text-gray-700">Account Information</h2>

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
        <div className="mt-4 flex justify-center pt-4">
          <button
            type="button"
            className="min-w-[120px] rounded border border-blue-500 bg-blue-500 px-4 py-1 font-display text-sm text-white transition-colors hover:bg-blue-600"
            onClick={() => {
              void disconnect();
            }}
          >
            Sign Out
          </button>
        </div>
      )}
    </PageSection>
  );
};

export function UserPage() {
  const { logout, user } = useAuth();
  const { address } = useAccount();
  const { client: smartWalletClient } = useSmartWallets();
  const smartWalletAddress = smartWalletClient?.account?.address;

  return (
    <>
      <Breadcrumbs
        items={[{ label: "Account", path: "/account" }, { label: "Settings" }]}
        className="mb-2"
      />
      <h1 className="mb-2 flex items-center gap-2 font-display text-xl font-semibold text-gray-900">
        <Cog6ToothIcon className="h-6 w-6 shrink-0" aria-hidden />
        Settings
      </h1>

      <UserSettings />

      <WalletInfo
        disconnect={logout}
        canSignOut={!!address || !!smartWalletAddress}
        userEmail={user?.email}
        accountIdAddress={smartWalletAddress}
      />
    </>
  );
}
