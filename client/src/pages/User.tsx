import { useAccount, useBalance, useDisconnect } from "wagmi";
import { formatUnits } from "viem";
import { Link } from "react-router-dom";

import { CopyToClipboard } from "../components/util/CopyToClipboard";
import { NetworkStatus } from "../components/util/NetworkStatus";
import { TestnetWarning } from "../components/util/ChainWarning";

import { PageHeader } from "../components/util/PageHeader";
import { UserSettings } from "../components/user/UserSettings";
import { getContractAddress, useTokenSymbol } from "../utils/blockchainUtils.tsx";
// import { usePortoAuth } from "../contexts/PortoAuthContext";

// Logo components using CSS background images (cached by browser)
const CutLogo = () => (
  <div
    className="h-9 w-9 bg-contain bg-no-repeat bg-center"
    style={{ backgroundImage: "url(/logo-transparent.png)" }}
    aria-label="CUT logo"
  />
);

const UsdcLogo = () => (
  <div
    className="h-7 w-7 ml-1 bg-contain bg-no-repeat bg-center"
    style={{ backgroundImage: "url(/usd-coin-usdc-logo.svg)" }}
    aria-label="USDC logo"
  />
);

// Wallet Info Component (below tabs)
const WalletInfo = ({
  address,
  disconnect,
}: {
  address: string | undefined;
  disconnect: () => void;
}) => (
  <div className="bg-white rounded-lg shadow p-4 mt-4">
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-lg font-semibold text-gray-900">Connected Wallet</h3>
    </div>

    <div className="space-y-3">
      {/* Wallet */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600 font-medium">Wallet:</span>
        <a
          href={`https://id.porto.sh/`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800"
        >
          Porto Wallet →
        </a>
      </div>

      {/* Address */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600 font-medium">Address:</span>
        <CopyToClipboard
          text={address || ""}
          displayText={`${address?.slice(0, 6)}...${address?.slice(-4)}`}
        />
      </div>

      {/* Network */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600 font-medium">Network:</span>
        <NetworkStatus />
      </div>
    </div>

    <hr className="my-4" />
    <div className="flex justify-center">
      {!!address && (
        <button
          className="bg-gray-50 py-1 px-4 rounded disabled:opacity-50 border border-gray-300 text-gray-500 font-medium min-w-fit mx-auto block"
          disabled={!address}
          onClick={() => {
            disconnect();
          }}
        >
          Sign out
        </button>
      )}
    </div>
  </div>
);

export function UserPage() {
  // const { user } = usePortoAuth();
  const { address, chainId } = useAccount();
  const { disconnect } = useDisconnect();

  // Get contract addresses for current chain
  const platformTokenAddress = getContractAddress(chainId ?? 0, "platformTokenAddress");
  const paymentTokenAddress = getContractAddress(chainId ?? 0, "paymentTokenAddress");

  // platformTokenAddress balance
  const { data: platformTokenBalance } = useBalance({
    address: address,
    token: platformTokenAddress as `0x${string}`,
  });

  // paymentTokenAddress balance
  const { data: paymentTokenBalance } = useBalance({
    address: address,
    token: paymentTokenAddress as `0x${string}`,
  });

  // Get payment token symbol
  const { data: paymentTokenSymbol } = useTokenSymbol(paymentTokenAddress as string);

  // round balance to 2 decimal points for payment tokens (6 decimals)
  const formattedPaymentBalance = (balance: bigint) => {
    return Number(formatUnits(balance, 6)).toFixed(2);
  };

  return (
    <div className="p-4">
      <PageHeader title="Account" className="mb-3" />

      {/* Testnet Warning */}
      <TestnetWarning />

      {/* Token Balances */}
      <div className="bg-white rounded-lg shadow p-4 mb-4">
        {/* Balance Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="text-xl font-semibold text-gray-700 font-display">Balance</div>
          <div className="text-xl font-semibold text-gray-900 font-display">
            $
            {(
              Number(formatUnits(platformTokenBalance?.value ?? 0n, 18)) +
              Number(formatUnits(paymentTokenBalance?.value ?? 0n, 6))
            ).toFixed(2)}
          </div>
        </div>

        {/* Token Breakdown */}
        <div className="grid grid-cols-[auto_1fr_auto] gap-x-2 gap-y-2 items-center">
          {/* CUT Token */}
          <CutLogo />
          <div className="text-sm text-gray-600 font-medium">
            CUT Token
            <Link
              to="/deposits"
              className="text-gray-400 ml-2 hover:text-gray-600 transition-colors"
            >
              What's this?
            </Link>
          </div>
          <div className="text-sm font-semibold text-gray-700 text-right">
            ${Number(formatUnits(platformTokenBalance?.value ?? 0n, 18)).toFixed(2)}
          </div>

          {/* Payment Token */}
          <UsdcLogo />
          <div className="text-sm text-gray-600 font-medium">
            {paymentTokenSymbol || "USDC"} Token
          </div>
          <div className="text-sm font-semibold text-gray-700 text-right">
            ${formattedPaymentBalance(paymentTokenBalance?.value ?? 0n)}
          </div>
        </div>

        <hr className="my-3 border-gray-200" />

        {/* Manage Link */}
        <div className="flex justify-center mt-3">
          <Link
            to="/account/funds"
            className="text-blue-500 hover:text-blue-700 text-sm transition-colors"
          >
            Manage Funds
          </Link>
        </div>
      </div>

      {/* User Settings */}
      <UserSettings />

      {/* Wallet Information - Below tabs */}
      <WalletInfo address={address} disconnect={disconnect} />
    </div>
  );
}
