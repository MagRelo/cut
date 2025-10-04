import { useState } from "react";
import { Tab, TabPanel, TabList, TabGroup } from "@headlessui/react";
import { useAccount, useBalance } from "wagmi";
import { formatUnits } from "viem";
import { PageHeader } from "../components/util/PageHeader";
import { Breadcrumbs } from "../components/util/Breadcrumbs";
import { Buy } from "../components/user/Buy";
import { Sell } from "../components/user/Sell";
import { Transfer } from "../components/user/Transfer";
import { getContractAddress, useTokenSymbol } from "../utils/blockchainUtils.tsx";

import { ChainWarning, TestnetWarning, RealMoneyWarning } from "../components/util/ChainWarning";

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

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

export function UserManageFunds() {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { address, chainId } = useAccount();

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

  // round balance to 2 decimal points for payment tokens (6 decimals)
  const formattedPaymentBalance = (balance: bigint) => {
    return Number(formatUnits(balance, 6)).toFixed(2);
  };

  // Token Balances Component (above tabs)
  const TokenBalances = () => {
    return (
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
          <div className="text-sm text-gray-600 font-medium">CUT Token</div>
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
      </div>
    );
  };

  return (
    <div className="p-4">
      <Breadcrumbs
        items={[{ label: "Account", path: "/account" }, { label: "Manage Funds" }]}
        className="mb-3"
      />
      <PageHeader title="Manage Funds" className="mb-3" />

      {/* Chain Warnings */}
      <ChainWarning />
      <TestnetWarning />
      <RealMoneyWarning />

      {/* Token Balances - Above tabs */}
      <TokenBalances />

      <div className="bg-white rounded-lg shadow">
        <TabGroup selectedIndex={selectedIndex} onChange={setSelectedIndex}>
          <TabList className="flex space-x-1 border-b border-gray-200 px-4">
            <Tab
              className={({ selected }: { selected: boolean }) =>
                classNames(
                  "w-full py-2 text-sm font-medium leading-5",
                  "focus:outline-none",
                  selected
                    ? "border-b-2 border-blue-500 text-blue-600"
                    : "text-gray-500 hover:border-gray-300 hover:text-gray-700"
                )
              }
            >
              USDC
            </Tab>
            <Tab
              className={({ selected }: { selected: boolean }) =>
                classNames(
                  "w-full py-2 text-sm font-medium leading-5",
                  "focus:outline-none",
                  selected
                    ? "border-b-2 border-blue-500 text-blue-600"
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
                    ? "border-b-2 border-blue-500 text-blue-600"
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
                    ? "border-b-2 border-blue-500 text-blue-600"
                    : "text-gray-500 hover:border-gray-300 hover:text-gray-700"
                )
              }
            >
              Transfer
            </Tab>
          </TabList>
          <div className="p-4">
            <TabPanel>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Get USDC</h3>
                  <div className="text-sm text-gray-600 mt-1">
                    {/* USDC explanation */}
                    <div className="text-sm font-medium text-gray-700">
                      {paymentTokenSymbol || "USDC"} is a digital coin that is always worth one U.S.
                      dollar. {paymentTokenSymbol || "USDC"} can be purchased using credit cards,
                      bank transfers, and crypto options.{" "}
                    </div>
                  </div>
                </div>

                <div className="grid gap-4">
                  {/* Coinbase */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-gray-900">Coinbase</h4>
                      <span className="text-sm text-green-600 font-medium">Recommended</span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">
                      Buy USDC directly on Coinbase and transfer to Base network.
                    </p>
                    <div className="flex gap-2">
                      <a
                        href="https://www.coinbase.com/buy/usdc"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700 transition-colors"
                      >
                        Buy USDC
                      </a>
                    </div>
                  </div>

                  {/* Other Options */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-2">Other Options</h4>
                    <div className="space-y-2 text-sm text-gray-600">
                      <div className="flex items-center justify-between">
                        <span>Ramp Network</span>
                        <a
                          href="https://ramp.network/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800"
                        >
                          Visit →
                        </a>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Transak</span>
                        <a
                          href="https://transak.com/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800"
                        >
                          Visit →
                        </a>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>MoonPay</span>
                        <a
                          href="https://www.moonpay.com/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800"
                        >
                          Visit →
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
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
