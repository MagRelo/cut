import { useState } from "react";
import { Tab, TabPanel, TabList, TabGroup } from "@headlessui/react";
import { useAccount, useBalance, useDisconnect } from "wagmi";
import { formatUnits } from "viem";
import { PageHeader } from "../components/util/PageHeader";
import { Breadcrumbs } from "../components/util/Breadcrumbs";
import { CopyToClipboard } from "../components/util/CopyToClipboard";
import { Buy } from "../components/user/Buy";
import { Sell } from "../components/user/Sell";
import { Transfer } from "../components/user/Transfer";
import { getContractAddress } from "../utils/contractConfig";
import { useTokenSymbol } from "../utils/tokenUtils";

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

export function PlatformTokenPage() {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { address, chainId, chain } = useAccount();
  const { disconnect } = useDisconnect();

  // Get contract addresses for current chain
  const platformTokenAddress = getContractAddress(chainId ?? 0, "platformTokenAddress");
  const paymentTokenAddress = getContractAddress(chainId ?? 0, "paymentTokenAddress");

  // platformTokenAddress balance
  const { data: platformTokenBalance } = useBalance({
    address: address,
    token: platformTokenAddress as `0x${string}`,
  });

  // Get payment token symbol
  const { data: paymentTokenSymbol } = useTokenSymbol(paymentTokenAddress as string);

  // paymentTokenAddress balance
  const { data: paymentTokenBalance } = useBalance({
    address: address,
    token: paymentTokenAddress as `0x${string}`,
  });

  // round balance to 2 decimal points for platform tokens (18 decimals)
  const formattedPlatformBalance = (balance: bigint) => {
    return Number(formatUnits(balance, 18)).toFixed(0);
  };

  // round balance to 2 decimal points for payment tokens (6 decimals)
  const formattedPaymentBalance = (balance: bigint) => {
    return Number(formatUnits(balance, 6)).toFixed(2);
  };

  // Wallet Tab Component
  const WalletTab = () => (
    <div className="bg-white rounded-lg shadow p-4 mb-4">
      <div className="text-lg font-semibold text-gray-700 mb-2 font-display">Wallet</div>

      <div className="grid grid-cols-[100px_1fr] gap-2">
        {/* Platform Token Balance */}
        <div className="font-medium">CUT</div>
        <div>
          {formattedPlatformBalance(platformTokenBalance?.value ?? 0n)}{" "}
          {platformTokenBalance?.symbol}
        </div>

        {/* Payment Token Balance */}
        <div className="font-medium">{paymentTokenSymbol || "USDC"}</div>
        <div>
          {formattedPaymentBalance(paymentTokenBalance?.value ?? 0n)} {paymentTokenBalance?.symbol}
        </div>

        <div className="font-medium">Wallet:</div>

        <div>
          <a
            href={`https://stg.id.porto.sh/`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-600"
          >
            <div className="flex items-center gap-1">
              Porto Wallet
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            </div>
          </a>
        </div>

        {/* Address */}
        <div className="font-medium">Address:</div>

        <div>
          <CopyToClipboard
            text={address || ""}
            displayText={`${address?.slice(0, 6)}...${address?.slice(-4)}`}
          />
        </div>

        {/* Chain */}
        <div className="font-medium">Chain:</div>
        <div>{chain?.name}</div>

        {/* Chain ID */}
        <div className="font-medium">Chain ID:</div>
        <div>{chainId}</div>
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

  return (
    <div className="p-4">
      <Breadcrumbs
        items={[{ label: "Account", path: "/user" }, { label: "CUT Tokens" }]}
        className="mb-3"
      />
      <PageHeader title="Manage CUT tokens" className="mb-3" />

      <div className="bg-white rounded-lg shadow">
        <TabGroup selectedIndex={selectedIndex} onChange={setSelectedIndex}>
          <TabList className="flex space-x-1 border-b border-gray-200 px-4">
            <Tab
              className={({ selected }: { selected: boolean }) =>
                classNames(
                  "w-full py-2 text-sm font-medium leading-5",
                  "focus:outline-none",
                  selected
                    ? "border-b-2 border-emerald-500 text-emerald-600"
                    : "text-gray-500 hover:border-gray-300 hover:text-gray-700"
                )
              }
            >
              Wallet
            </Tab>
            <Tab
              className={({ selected }: { selected: boolean }) =>
                classNames(
                  "w-full py-2 text-sm font-medium leading-5",
                  "focus:outline-none",
                  selected
                    ? "border-b-2 border-emerald-500 text-emerald-600"
                    : "text-gray-500 hover:border-gray-300 hover:text-gray-700"
                )
              }
            >
              Buy
            </Tab>
            <Tab
              className={({ selected }: { selected: boolean }) =>
                classNames(
                  "w-full py-2 text-sm font-medium leading-5",
                  "focus:outline-none",
                  selected
                    ? "border-b-2 border-emerald-500 text-emerald-600"
                    : "text-gray-500 hover:border-gray-300 hover:text-gray-700"
                )
              }
            >
              Sell
            </Tab>
            <Tab
              className={({ selected }: { selected: boolean }) =>
                classNames(
                  "w-full py-2 text-sm font-medium leading-5",
                  "focus:outline-none",
                  selected
                    ? "border-b-2 border-emerald-500 text-emerald-600"
                    : "text-gray-500 hover:border-gray-300 hover:text-gray-700"
                )
              }
            >
              Transfer
            </Tab>
          </TabList>
          <div className="p-4">
            <TabPanel>
              <WalletTab />
            </TabPanel>
            <TabPanel>
              <Buy />
            </TabPanel>
            <TabPanel>
              <Sell />
            </TabPanel>
            <TabPanel>
              <Transfer />
            </TabPanel>
          </div>
        </TabGroup>
      </div>
    </div>
  );
}
