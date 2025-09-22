import { useAccount, useBalance } from "wagmi";
import { formatUnits } from "viem";
import { Link } from "react-router-dom";

import { PageHeader } from "../components/util/PageHeader";
import { Connect } from "../components/user/Connect";
import { UserSettings } from "../components/user/UserSettings";
import { getContractAddress } from "../utils/blockchainUtils.tsx";
import { usePortoAuth } from "../contexts/PortoAuthContext";

export function UserPage() {
  const { user } = usePortoAuth();
  const { address, chainId } = useAccount();

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

  // Calculate combined total balance
  const platformTokenAmount = Number(formatUnits(platformTokenBalance?.value ?? 0n, 18));
  const paymentTokenAmount = Number(formatUnits(paymentTokenBalance?.value ?? 0n, 6));
  const combinedTotal = platformTokenAmount + paymentTokenAmount;

  // if user is not connected, show the connect component
  if (!user) {
    return (
      <div className="p-4">
        <Connect />
      </div>
    );
  }

  // if user is connected, show the account settings
  return (
    <div className="p-4">
      <PageHeader title="Account" className="mb-3" />

      {/* Account Settings */}
      <div className="bg-white rounded-lg shadow p-4 mb-4">
        {/* Balance Header with Total */}
        <div className="flex items-center justify-between mb-2">
          <div className="text-xl font-semibold text-gray-700 font-display">Balance</div>
          <div className="text-xl font-semibold text-gray-900 font-display">
            ${combinedTotal.toFixed(2)}
          </div>
        </div>

        <hr className="my-3 border-gray-200" />

        {/* Manage Link */}
        <div className="flex justify-center">
          <Link
            to="/account/funds"
            className="text-blue-500 hover:text-blue-700 font-medium text-base transition-colors"
          >
            Manage Funds
          </Link>
        </div>
      </div>

      {/* User Settings */}
      <UserSettings />
    </div>
  );
}
