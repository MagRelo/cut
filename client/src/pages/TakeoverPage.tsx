import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useWallets } from "@privy-io/react-auth";
import { useQueryClient } from "@tanstack/react-query";
import { getAddress } from "viem";
import { CopyButton } from "../components/common/CopyToClipboard";
import { ErrorMessage } from "../components/common/ErrorMessage";
import { useAuth } from "../contexts/AuthContext";
import apiClient from "../utils/apiClient";
import { queryKeys } from "../utils/queryKeys";

const YIELD = "Yield.";

export function TakeoverPage() {
  const { user } = useAuth();
  const { wallets } = useWallets();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const embedded = wallets.find(
    (wallet) => wallet.type === "ethereum" && wallet.walletClientType === "privy",
  );
  const ready =
    !!user?.walletOwner &&
    !!embedded &&
    getAddress(user.walletOwner) === getAddress(embedded.address);

  useEffect(() => {
    if (!embedded || ready) return;
    let cancel = false;
    void apiClient
      .post("/auth/takeover", { embeddedAddress: embedded.address }, { requiresAuth: true })
      .catch((err: unknown) => {
        if (!cancel) {
          setError(err instanceof Error ? err.message : "Could not start the takeover");
        }
      });
    return () => {
      cancel = true;
    };
  }, [embedded, ready]);

  useEffect(() => {
    if (ready) return;
    const timer = window.setInterval(() => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.user.profile() });
    }, 3000);
    return () => window.clearInterval(timer);
  }, [queryClient, ready]);

  if (ready) return <Navigate to="/contests" replace />;

  return (
    <main className="mx-auto max-w-xl px-4 py-16 font-display text-gray-900">
      <h1 className="text-3xl font-semibold">This account was opened by your agent</h1>
      <p className="mt-4 text-lg leading-7">
        Tell your agent to yield. The wallet, the entries, and the balance stay on this account.
        You can use the site once the agent yields.
      </p>
      <p className="mt-8 text-sm uppercase tracking-wide text-gray-500">Send this</p>
      <p className="mt-2 text-2xl font-semibold">{YIELD}</p>
      <div className="mt-4">
        <CopyButton text={YIELD} idleLabel="Copy" />
      </div>
      {user?.walletAddress ? (
        <p className="mt-8 break-all font-mono text-sm text-gray-700">{user.walletAddress}</p>
      ) : null}
      {error ? <ErrorMessage message={error} className="mt-6" /> : null}
    </main>
  );
}
