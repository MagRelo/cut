import { useState, useEffect } from "react";
import { Tab, TabPanel, TabList, TabGroup } from "@headlessui/react";
import { useSearchParams } from "react-router-dom";
import { useAccount } from "wagmi";

import { PageHeader } from "../components/util/PageHeader";
import { ChainWarning, TestnetWarning } from "../components/util/ChainWarning";
import { Breadcrumbs } from "../components/util/Breadcrumbs";
import { TokenBalances } from "../components/user/TokenBalances";
import { getContractAddress, useTokenSymbol } from "../utils/blockchainUtils.tsx";

import { Buy } from "../components/user/Buy";
import { Sell } from "../components/user/Sell";
import { Transfer } from "../components/user/Transfer";

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

export function UserManageFunds() {
  const [searchParams] = useSearchParams();
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Check query params for tab selection
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab) {
      // Map tab names to indices
      const tabMap: { [key: string]: number } = {
        usdc: 0,
        buy: 1,
        sell: 2,
        transfer: 3,
      };

      const tabIndex = tabMap[tab.toLowerCase()];
      if (tabIndex !== undefined) {
        setSelectedIndex(tabIndex);
      }
    }
  }, [searchParams]);

  const { chainId } = useAccount();
  const paymentTokenAddress = getContractAddress(chainId ?? 0, "paymentTokenAddress");
  const { data: paymentTokenSymbol } = useTokenSymbol(paymentTokenAddress as string);

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

      {/* Token Balances - Above tabs */}
      <TokenBalances showCutTokenLink={true} />

      {/* <RealMoneyWarning /> */}

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
