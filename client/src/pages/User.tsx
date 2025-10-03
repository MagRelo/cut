import { useAccount, useBalance } from "wagmi";
import { formatUnits } from "viem";
import { Link } from "react-router-dom";
import { Disclosure } from "@headlessui/react";
import { ChevronDownIcon } from "@heroicons/react/20/solid";

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

export function UserPage() {
  // const { user } = usePortoAuth();
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

  // Get payment token symbol
  const { data: paymentTokenSymbol } = useTokenSymbol(paymentTokenAddress as string);

  // round balance to 2 decimal points for payment tokens (6 decimals)
  const formattedPaymentBalance = (balance: bigint) => {
    return Number(formatUnits(balance, 6)).toFixed(2);
  };

  return (
    <div className="p-4">
      <PageHeader title="Account" className="mb-3" />

      {/* Token Balances */}
      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <Disclosure>
          {({ open }) => (
            <div>
              {/* Balance Header with Accordion Toggle */}
              <div className="flex items-center justify-between w-full mb-2">
                <div className="flex items-center gap-2">
                  <div className="text-xl font-semibold text-gray-700 font-display">Balance</div>
                  <Disclosure.Button>
                    <ChevronDownIcon
                      className={`h-5 w-5 text-gray-700 font-bold transition-transform duration-200 ${
                        open ? "rotate-180" : ""
                      }`}
                    />
                  </Disclosure.Button>
                </div>
                <div className="text-xl font-semibold text-gray-900 font-display">
                  $
                  {(
                    Number(formatUnits(platformTokenBalance?.value ?? 0n, 18)) +
                    Number(formatUnits(paymentTokenBalance?.value ?? 0n, 6))
                  ).toFixed(2)}
                </div>
              </div>

              {/* Token Breakdown - Hidden by default */}
              <Disclosure.Panel>
                <div className="grid grid-cols-[auto_1fr_auto] gap-x-2 gap-y-2 items-center">
                  {/* CUT Token */}
                  <CutLogo />
                  <div className="text-sm text-gray-600 font-semibold">CUT Token</div>
                  <div className="text-sm font-semibold text-gray-700 text-right">
                    ${Number(formatUnits(platformTokenBalance?.value ?? 0n, 18)).toFixed(2)}
                  </div>

                  {/* Payment Token */}
                  <UsdcLogo />
                  <div className="text-sm text-gray-600 font-semibold ">
                    {paymentTokenSymbol || "USDC"} Token
                  </div>
                  <div className="text-sm font-semibold text-gray-700 text-right">
                    ${formattedPaymentBalance(paymentTokenBalance?.value ?? 0n)}
                  </div>
                </div>
              </Disclosure.Panel>

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
          )}
        </Disclosure>
      </div>

      {/* User Settings */}
      <UserSettings />
    </div>
  );
}
