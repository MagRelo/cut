import React from "react";
import { useAuth } from "../contexts/AuthContext";
import { PageSection } from "../components/layout/PageSection";
import { useActiveEvent } from "../hooks/useActiveEvent";
import { useEventCandidatesQuery } from "../hooks/useSportData";
import { useAccount } from "wagmi";

export const DebugPage: React.FC = () => {
  const { address, chainId, status: wagmiStatus } = useAccount();
  const auth = useAuth();
  const {
    activeEvent,
    eventId,
    eventName,
    status,
    roundDisplay,
    isLoading: eventLoading,
    error: eventError,
  } = useActiveEvent();
  const candidatesQuery = useEventCandidatesQuery(activeEvent?.sport.id, eventId);

  return (
    <>
      <h1 className="text-2xl font-bold mb-6">Debug Information</h1>

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

      <PageSection>
        <h2 className="text-lg font-semibold mb-3 text-purple-600">Active event (useActiveEvent)</h2>
        <div className="space-y-2 text-sm">
          <div>
            <strong>Loading:</strong> {eventLoading ? "true" : "false"}
          </div>
          <div>
            <strong>Error:</strong> {eventError ? String(eventError.message) : "None"}
          </div>
          <div>
            <strong>Event ID:</strong> {eventId ?? "—"}
          </div>
          <div>
            <strong>Event name:</strong> {eventName ?? "—"}
          </div>
          <div>
            <strong>Status:</strong> {status ?? "—"}
          </div>
          <div>
            <strong>Round:</strong> {roundDisplay ?? "—"}
          </div>
        </div>
      </PageSection>

      <PageSection>
        <h2 className="text-lg font-semibold mb-3 text-indigo-600">Candidates (useCandidatesQuery)</h2>
        <div className="space-y-2 text-sm">
          <div>
            <strong>Loading:</strong> {candidatesQuery.isLoading ? "true" : "false"}
          </div>
          <div>
            <strong>Error:</strong>{" "}
            {candidatesQuery.error ? String(candidatesQuery.error.message) : "None"}
          </div>
          <div>
            <strong>Count:</strong> {candidatesQuery.data?.length ?? "—"}
          </div>
        </div>
      </PageSection>
    </>
  );
};
