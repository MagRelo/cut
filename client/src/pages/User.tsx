import { useAccount, useBalance } from "wagmi";
import { formatUnits } from "viem";
import { Link } from "react-router-dom";

import { PageHeader } from "../components/util/PageHeader";
import { Connect } from "../components/user/Connect";
import { UserSettings } from "../components/user/UserSettings";
import { getContractAddress } from "../utils/contractConfig";
import { usePortoAuth } from "../contexts/PortoAuthContext";
import { CutAmountDisplay } from "../components/common/CutAmountDisplay";

export function UserPage() {
  const { user } = usePortoAuth();
  const { address, chainId } = useAccount();

  // Get contract addresses for current chain
  const platformTokenAddress = getContractAddress(chainId ?? 0, "platformTokenAddress");

  // platformTokenAddress balance
  const { data: platformTokenBalance } = useBalance({
    address: address,
    token: platformTokenAddress as `0x${string}`,
  });

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
      <div className="bg-white rounded-lg shadow p-4 mb-2">
        <div className="grid grid-cols-[1fr_auto] gap-2 items-center">
          {/* Available Balance */}
          <div className="text-lg font-semibold text-gray-700 font-display">
            Available Balance{" "}
            <Link
              to="/tokens"
              className="text-gray-500 hover:text-gray-800 font-medium text-sm transition-colors ml-2"
            >
              Manage...
            </Link>
          </div>

          <div className="text-lg font-semibold text-gray-700 font-display">
            <CutAmountDisplay
              amount={Number(formatUnits(platformTokenBalance?.value ?? 0n, 18))}
              logoPosition="right"
              label="CUT"
            />
          </div>

          {/* Payment Token Balance */}
          {/* <div className="text-lg font-semibold text-gray-700 font-display">{paymentTokenSymbol || "USDC"} Balance</div>
          <div className="text-lg font-semibold text-gray-700 font-display">
            ${formattedPaymentBalance(paymentTokenBalance?.value ?? 0n)} {paymentTokenSymbol || "USDC"}
          </div> */}
        </div>

        {/* Link to token manager */}
        {/* <div className="flex justify-center mt-4">
          <Link to="/token-manager" className="text-gray-500 hover:text-gray-700">
            View Token Manager Details
          </Link>
        </div> */}
      </div>

      {/* User Settings */}
      <UserSettings />
    </div>
  );
}
