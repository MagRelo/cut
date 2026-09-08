import { useEffect, useMemo, useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { Tab, TabPanel, TabList, TabGroup } from "@headlessui/react";
import { ExclamationTriangleIcon, WalletIcon } from "@heroicons/react/24/outline";
import { Breadcrumbs } from "../../components/common/Breadcrumbs";
import { Receive } from "../../components/account/wallet/Receive";
import { Send } from "../../components/account/wallet/Send";
import { WalletBalancePanel } from "../../components/account/wallet/WalletBalancePanel";
import { useAuth } from "../../contexts/AuthContext";
import { defaultPaymentTokenSymbol, isTargetTestnet } from "../../config/targetChain";
import { BLOCKCHAIN_NETWORK } from "../../lib/legalPlaceholders";
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
  const networkLabel = showTestnetWarning ? "Base Sepolia" : BLOCKCHAIN_NETWORK;

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
      <h1 className="mb-2 flex items-center gap-2 font-display text-xl font-semibold text-gray-900">
        <WalletIcon className="h-6 w-6 shrink-0" aria-hidden />
        Wallet
      </h1>

      <div className="space-y-4">
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
        ) : null}

        <div>
          <div className="space-y-4 pb-6 font-display">
            <WalletBalancePanel tokenSymbol={tokenSymbol} networkLabel={networkLabel} />
            <div>
              <h2 className="font-medium text-gray-900">Secure Wallet</h2>
              <p className="text-sm leading-relaxed text-gray-700">
                Your account comes with a wallet that belongs to you, secured with your email. Play
                The Cut never holds your funds, so you can add money, play in contests, or withdraw
                anytime.
              </p>
            </div>
            {showTestnetWarning ? null : (
              <div>
                <h2 className="font-medium text-gray-900">Powered by {tokenSymbol}</h2>

                <p className="text-sm leading-relaxed text-gray-700">
                  Play The Cut uses {tokenSymbol} for contests. You can buy {tokenSymbol} through an
                  app such as Coinbase, Kraken, or Robinhood, then send {tokenSymbol} to your Play
                  The Cut wallet.
                </p>
              </div>
            )}
          </div>

          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-md shadow-slate-900/10 ring-1 ring-black/5">
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
    </>
  );
}
