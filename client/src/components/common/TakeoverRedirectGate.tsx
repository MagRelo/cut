import { Navigate, useLocation } from "react-router-dom";
import { useWallets } from "@privy-io/react-auth";
import { getAddress } from "viem";
import { useAuth } from "../../contexts/AuthContext";

const OPEN = new Set(["/takeover", "/connect"]);

/** A login on an agent email waits here until that agent yields the wallet. */
export function TakeoverRedirectGate({ children }: { children: React.ReactNode }) {
  const { user, sessionPhase } = useAuth();
  const { wallets } = useWallets();
  const location = useLocation();

  if (sessionPhase !== "ready" || !user?.walletOwner || OPEN.has(location.pathname)) {
    return <>{children}</>;
  }
  const embedded = wallets.find(
    (wallet) => wallet.type === "ethereum" && wallet.walletClientType === "privy",
  );
  if (embedded && getAddress(embedded.address) === getAddress(user.walletOwner)) {
    return <>{children}</>;
  }
  return <Navigate to="/takeover" replace />;
}
