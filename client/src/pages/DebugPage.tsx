import React from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { PageSection } from "../components/layout/PageSection";
import { useSportActiveEvent } from "../hooks/useSportActiveEvent";
import { useAccount } from "wagmi";

export const DebugPage: React.FC = () => {
  const { address, chainId, status: wagmiStatus } = useAccount();
  const auth = useAuth();
  const [searchParams] = useSearchParams();
  const debugSportId = searchParams.get("sportId") ?? undefined;
  const sportActive = useSportActiveEvent(debugSportId ?? "");

  return (
    <>
      <h1 className="text-2xl font-bold mb-6">Debug Information</h1>

      <PageSection>
        <h2 className="text-lg font-semibold mb-3 text-gray-800">Dev pages</h2>
        <ul className="list-inside list-disc text-sm text-blue-600">
          <li>
            <a href="/dev/commodity-icons" className="hover:underline">
              Commodity icon preview
            </a>
          </li>
          <li>
            <a href="/dev/commodity-avatar-variants" className="hover:underline">
              Commodity avatar variants
            </a>
          </li>
        </ul>
      </PageSection>

      <PageSection>
        <h2 className="text-lg font-semibold mb-3 text-blue-600">Wagmi Account Status</h2>
        <div className="space-y-2 text-sm">
          <div>
            <strong>Address:</strong> {address || "Not connected"}
          </div>
          <div>
            <strong>Chain ID:</strong> {chainId || "Not connected"}
          </div>
          <div>
            <strong>Status:</strong> {wagmiStatus}
          </div>
        </div>
      </PageSection>

      <PageSection>
        <h2 className="text-lg font-semibold mb-3 text-green-600">Auth context</h2>
        <div className="space-y-2 text-sm">
          <div>
            <strong>Loading:</strong> {auth.loading ? "true" : "false"}
          </div>
          <div>
            <strong>User:</strong> {auth.user ? "Logged in" : "Not logged in"}
          </div>
          {auth.user && (
            <>
              <div>
                <strong>User ID:</strong> {auth.user.id}
              </div>
              <div>
                <strong>Name:</strong> {auth.user.name}
              </div>
              <div>
                <strong>Email:</strong> {auth.user.email || "Not set"}
              </div>
              <div>
                <strong>User Type:</strong> {auth.user.userType}
              </div>
              <div>
                <strong>Chain ID:</strong> {auth.user.chainId}
              </div>
              <div>
                <strong>Wallet Address:</strong> {auth.user.walletAddress}
              </div>
              <div>
                <strong>Is Verified:</strong> {auth.user.isVerified ? "true" : "false"}
              </div>
            </>
          )}
          <div>
            <strong>Payment Token Balance:</strong>{" "}
            {auth.balancesUnavailable
              ? "Error"
              : auth.paymentTokenBalance?.toString() ?? (auth.balancesLoading ? "Loading..." : "—")}
          </div>
          <div>
            <strong>Payment Token Address:</strong> {auth.paymentTokenAddress || "Not loaded"}
          </div>
          <div>
            <strong>Balances Loading:</strong> {auth.balancesLoading ? "true" : "false"}
          </div>
          <div>
            <strong>Balances Unavailable:</strong> {auth.balancesUnavailable ? "true" : "false"}
          </div>
        </div>
      </PageSection>

      {debugSportId ? (
        <PageSection>
          <h2 className="text-lg font-semibold mb-3 text-purple-600">
            Sport active event (useSportActiveEvent)
          </h2>
          <div className="space-y-2 text-sm">
            <div>
              <strong>Loading:</strong> {sportActive.isLoading ? "true" : "false"}
            </div>
            <div>
              <strong>Error:</strong>{" "}
              {sportActive.error ? String(sportActive.error.message) : "None"}
            </div>
            <div>
              <strong>Sport ID:</strong> {sportActive.sportId}
            </div>
            <div>
              <strong>Event ID:</strong> {sportActive.eventId ?? "—"}
            </div>
            <div>
              <strong>Event name:</strong> {sportActive.eventName ?? "—"}
            </div>
            <div>
              <strong>Status:</strong> {sportActive.status ?? "—"}
            </div>
            <div>
              <strong>Period:</strong> {sportActive.periodDisplay ?? "—"}
            </div>
            <div>
              <strong>Candidates count:</strong> {sportActive.candidates.length}
            </div>
          </div>
        </PageSection>
      ) : (
        <PageSection>
          <p className="text-sm text-gray-600">
            Add <code className="font-mono">?sportId=…</code> to the URL to load sport-active
            event debug info.
          </p>
        </PageSection>
      )}
    </>
  );
};
