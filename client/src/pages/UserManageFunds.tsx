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
import { getContractAddress, useTokenSymbol } from "../utils/blockchainUtils.tsx";

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

  // Wallet Info Component (below tabs)
  const WalletInfo = () => (
    <div className="bg-white rounded-lg shadow p-4 mt-4">
      <div className="text-lg font-semibold text-gray-700 mb-4 font-display">
        Wallet Information
      </div>

      <div className="grid grid-cols-[100px_1fr] gap-2 mb-4">
        <div className="font-medium">Wallet:</div>
        <div>
          <a
            href={`https://id.porto.sh/`}
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
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            </div>
          </a>
        </div>

        <div className="font-medium">Address:</div>
        <div>
          <CopyToClipboard
            text={address || ""}
            displayText={`${address?.slice(0, 6)}...${address?.slice(-4)}`}
          />
        </div>

        <div className="font-medium">Chain:</div>
        <div>{chain?.name}</div>

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
        items={[{ label: "Account", path: "/account" }, { label: "Manage Funds" }]}
        className="mb-3"
      />
      <PageHeader title="Manage Funds" className="mb-3" />

      {/* Test Network Warning Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg shadow p-4 mb-4">
        <div className="text-lg font-semibold text-blue-800 font-display mb-2">
          💡 Funding Your Account
        </div>
        <div className="text-sm text-blue-700">
          <p className="mb-2">
            You'll need to fund your account with USDC. If you're new to crypto, consider asking
            another user to transfer you some funds to get started.
          </p>
          <p className="mb-2">
            If you already own USDC you can transfer it directly to your Cut account:
          </p>

          <p className="text-center font-medium text-md pt-4 pb-3">
            <span className="mr-2 border border-blue-500 rounded-md p-2">
              <CopyToClipboard
                text={address || ""}
                displayText={`${address?.slice(0, 6)}...${address?.slice(-6)}`}
              />
            </span>
          </p>
        </div>
      </div>

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

      {/* Wallet Information - Below tabs */}
      <WalletInfo />
    </div>
  );
}
