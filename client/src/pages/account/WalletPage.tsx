import { useEffect, useMemo, useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { Tab, TabPanel, TabList, TabGroup } from "@headlessui/react";
import { ExclamationTriangleIcon, WalletIcon } from "@heroicons/react/24/outline";
import { Breadcrumbs } from "../../components/common/Breadcrumbs";
import { Receive } from "../../components/account/wallet/Receive";
import { Send } from "../../components/account/wallet/Send";
import { WalletHeaderBalance } from "../../components/account/wallet/WalletBalancePanel";
import { useAuth } from "../../contexts/AuthContext";
import { defaultPaymentTokenSymbol, isTargetTestnet } from "../../config/targetChain";
import { tabButtonClassName, tabListClassName } from "../../lib/tabStyles";
import {
  fundPageTabFromIndex,
  fundPageTabIndex,
  parseFundPageSearchParams,
} from "../../lib/fundLinks";

export function WalletPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { tab, recipient } = useMemo(
    () => parseFundPageSearchParams(searchParams.toString()),
    [searchParams],
  );
  const initialIndex = fundPageTabIndex(tab);
  const [selectedIndex, setSelectedIndex] = useState(initialIndex);
  const { paymentTokenSymbol } = useAuth();
  const showTestnetWarning = isTargetTestnet();
  const tokenSymbol = paymentTokenSymbol ?? defaultPaymentTokenSymbol();

  useEffect(() => {
    setSelectedIndex(fundPageTabIndex(tab));
  }, [tab]);

  const handleTabChange = (index: number) => {
    setSelectedIndex(index);
    const nextTab = fundPageTabFromIndex(index);
    const next = new URLSearchParams(searchParams);
    next.set("tab", nextTab);
    setSearchParams(next, { replace: true });
  };

  if (tab === "activity") {
    return <Navigate to="/account/activity" replace />;
  }

  return (
    <>
      <Breadcrumbs
        items={[{ label: "Account", path: "/account" }, { label: "Wallet" }]}
        className="mb-2"
      />

      <div className="overflow-hidden rounded-md border border-slate-300 bg-white font-display shadow-sm">
        <div className="flex items-center justify-between gap-4 px-4 py-4">
          <h1 className="flex items-center gap-2 font-display text-xl font-semibold text-gray-900">
            <WalletIcon className="h-6 w-6 shrink-0" aria-hidden />
            Wallet
          </h1>
          <WalletHeaderBalance />
        </div>

        <div className="space-y-6 px-4 pb-4">
          {showTestnetWarning ? (
            <div className="border border-slate-900 px-3 py-3" role="note">
              <div className="flex items-center gap-2">
                <ExclamationTriangleIcon className="h-4 w-4 shrink-0 text-gray-900" aria-hidden />
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-900">
                  Testnet only
                </p>
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-gray-800">
                Play The Cut is currently on <strong>Base Sepolia testnet</strong>. Contests use
                testnet <strong>xUSDC</strong>—not real USDC. Do not send mainnet funds or real USDC
                to your wallet; deposits will not land and may be lost.
              </p>
            </div>
          ) : null}

          <p className="text-sm leading-relaxed text-gray-700">
            Your wallet belongs to you and is secured by your email. Play The Cut never holds or
            has access to your funds.
          </p>

          <div>
            <h2 className="font-medium text-gray-900">Powered by {tokenSymbol}</h2>
            <p className="mt-1 text-sm leading-relaxed text-gray-700">
              Play The Cut uses {tokenSymbol} - a digital dollar - for all contest entries and
              payouts. You can buy {tokenSymbol} through Coinbase, Kraken, Robinhood, and other
              supported exchanges and wallets.
            </p>
          </div>

          <div>
            <h2 className="font-medium text-gray-900">Receive and Send {tokenSymbol}</h2>
            <p className="mb-3 mt-1 text-sm leading-relaxed text-gray-700">
              You can receive and send {tokenSymbol} to and from your account wallet at any time.
            </p>

            <div className="overflow-hidden rounded-md border border-slate-200">
              <TabGroup selectedIndex={selectedIndex} onChange={handleTabChange}>
                <TabList className={tabListClassName()}>
                  <Tab
                    className={({ selected }: { selected: boolean }) => tabButtonClassName(selected)}
                  >
                    Receive
                  </Tab>
                  <Tab
                    className={({ selected }: { selected: boolean }) => tabButtonClassName(selected)}
                  >
                    Send
                  </Tab>
                </TabList>
                <div className="px-4 py-4">
                  <TabPanel>
                    <Receive />
                  </TabPanel>
                  <TabPanel>
                    <Send
                      initialRecipientAddress={recipient ?? undefined}
                      lockRecipient={Boolean(recipient)}
                    />
                  </TabPanel>
                </div>
              </TabGroup>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
