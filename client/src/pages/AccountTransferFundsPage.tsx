import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Tab, TabPanel, TabList, TabGroup } from "@headlessui/react";
import { ExclamationTriangleIcon, InformationCircleIcon } from "@heroicons/react/24/outline";
import { Breadcrumbs } from "../components/common/Breadcrumbs";
import { Receive } from "../components/user/Receive.tsx";
import { Send } from "../components/user/Send.tsx";
import { UserActivityPanel } from "../components/user/UserActivityPanel";
import { isTargetTestnet } from "../config/targetChain";
import { tabButtonClassName, tabListClassName } from "../lib/tabStyles";
import { fundPageTabIndex, parseFundPageSearchParams } from "../lib/fundLinks";

export function TransferFundsPage() {
  const [searchParams] = useSearchParams();
  const { tab, recipient } = useMemo(
    () => parseFundPageSearchParams(searchParams.toString()),
    [searchParams],
  );
  const initialIndex = fundPageTabIndex(tab);
  const [selectedIndex, setSelectedIndex] = useState(initialIndex);
  const showTestnetWarning = isTargetTestnet();

  useEffect(() => {
    setSelectedIndex(fundPageTabIndex(tab));
  }, [tab]);

  return (
    <>
      <Breadcrumbs
        items={[{ label: "Account", path: "/account" }, { label: "Manage Funds" }]}
        className="mb-3"
      />

      <div className="space-y-4">
        <div className="rounded-sm border border-gray-200">
          <TabGroup selectedIndex={selectedIndex} onChange={setSelectedIndex}>
            <TabList className={tabListClassName()}>
              <Tab
                className={({ selected }: { selected: boolean }) => tabButtonClassName(selected)}
              >
                Add Funds
              </Tab>
              <Tab
                className={({ selected }: { selected: boolean }) => tabButtonClassName(selected)}
              >
                Send
              </Tab>
              <Tab
                className={({ selected }: { selected: boolean }) => tabButtonClassName(selected)}
              >
                Activity
              </Tab>
            </TabList>
            <div className="px-4 py-2">
              <TabPanel>
                <div className="py-2">
                  <Receive />
                </div>
              </TabPanel>
              <TabPanel>
                <div className="py-2">
                  <Send
                    initialRecipientAddress={recipient ?? undefined}
                    lockRecipient={Boolean(recipient)}
                  />
                </div>
              </TabPanel>
              <TabPanel>
                <UserActivityPanel />
              </TabPanel>
            </div>
          </TabGroup>
        </div>

        {showTestnetWarning ? (
          <div
            className="overflow-hidden rounded-lg border border-amber-200 bg-gradient-to-tl from-amber-100 via-amber-50 to-white shadow-sm"
            role="note"
          >
            <div className="flex items-center gap-2 border-b border-amber-200 bg-amber-50/80 px-3 py-2">
              <ExclamationTriangleIcon className="h-4 w-4 shrink-0 text-amber-600" aria-hidden />
              <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-800">
                Testnet only
              </div>
            </div>
            <div className="p-3">
              <p className="text-sm leading-relaxed text-amber-950/90">
                Play The Cut is currently on <strong>Base Sepolia testnet</strong>. Contests use
                testnet <strong>xUSDC</strong>—not real USDC. Do not send mainnet funds or real USDC
                to your wallet; deposits will not land and may be lost.
              </p>
            </div>
          </div>
        ) : (
          <div
            className="overflow-hidden rounded-lg border border-blue-200 bg-blue-50/80 shadow-sm"
            role="note"
          >
            <div className="flex items-start gap-2 px-3 py-2.5">
              <InformationCircleIcon className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" aria-hidden />
              <p className="text-sm leading-relaxed text-blue-950/90">
                Play The Cut uses <strong>USDC</strong> on the <strong>Base</strong> network. Add
                funds from Coinbase or Robinhood, or send USDC from any Base wallet. Cash out the
                same way from the Send tab.
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
