import React from "react";
import { usePortoAuth } from "../contexts/PortoAuthContext";
import { useTournamentData, useActiveTournament } from "../hooks/useTournamentData";
import { useAccount } from "wagmi";

export const DebugPage: React.FC = () => {
  const { address, chainId, status: wagmiStatus } = useAccount();
  const portoAuth = usePortoAuth();
  const tournamentQuery = useTournamentData();
  const activeTournament = useActiveTournament();

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-2xl font-bold mb-6">Debug Information</h1>

      {/* Wagmi Account Status */}
      <div className="bg-white p-4 rounded-lg shadow">
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
      </div>

      {/* PortoAuth Context */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-3 text-green-600">PortoAuth Context</h2>
        <div className="space-y-2 text-sm">
          <div>
            <strong>Loading:</strong> {portoAuth.loading ? "true" : "false"}
          </div>
          <div>
            <strong>User:</strong> {portoAuth.user ? "Logged in" : "Not logged in"}
          </div>
          {portoAuth.user && (
            <>
              <div>
                <strong>User ID:</strong> {portoAuth.user.id}
              </div>
              <div>
                <strong>Name:</strong> {portoAuth.user.name}
              </div>
              <div>
                <strong>Email:</strong> {portoAuth.user.email || "Not set"}
              </div>
              <div>
                <strong>User Type:</strong> {portoAuth.user.userType}
              </div>
              <div>
                <strong>Chain ID:</strong> {portoAuth.user.chainId}
              </div>
              <div>
                <strong>Wallet Address:</strong> {portoAuth.user.walletAddress}
              </div>
              <div>
                <strong>Is Verified:</strong> {portoAuth.user.isVerified ? "true" : "false"}
              </div>
            </>
          )}
          <div>
            <strong>Platform Token Balance:</strong>{" "}
            {portoAuth.platformTokenBalance?.toString() || "Loading..."}
          </div>
          <div>
            <strong>Payment Token Balance:</strong>{" "}
            {portoAuth.paymentTokenBalance?.toString() || "Loading..."}
          </div>
          <div>
            <strong>Platform Token Address:</strong>{" "}
            {portoAuth.platformTokenAddress || "Not loaded"}
          </div>
          <div>
            <strong>Payment Token Address:</strong> {portoAuth.paymentTokenAddress || "Not loaded"}
          </div>
          <div>
            <strong>Balances Loading:</strong> {portoAuth.balancesLoading ? "true" : "false"}
          </div>
        </div>
      </div>

      {/* Tournament Data */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-3 text-purple-600">
          Tournament Data (useTournamentData)
        </h2>
        <div className="space-y-2 text-sm">
          <div>
            <strong>Loading:</strong> {tournamentQuery.isLoading ? "true" : "false"}
          </div>
          <div>
            <strong>Error:</strong> {tournamentQuery.error ? tournamentQuery.error.message : "None"}
          </div>
          <div>
            <strong>Data:</strong> {tournamentQuery.data ? "Loaded" : "Not loaded"}
          </div>
          {tournamentQuery.data && (
            <>
              <div>
                <strong>Tournament:</strong> {tournamentQuery.data.tournament.name}
              </div>
              <div>
                <strong>Tournament Status:</strong> {tournamentQuery.data.tournament.status}
              </div>
              <div>
                <strong>Players Count:</strong> {tournamentQuery.data.players.length}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Active Tournament State */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-3 text-orange-600">
          Active Tournament State (useActiveTournament)
        </h2>
        <div className="space-y-2 text-sm">
          <div>
            <strong>Loading:</strong> {activeTournament.isLoading ? "true" : "false"}
          </div>
          <div>
            <strong>Error:</strong>{" "}
            {activeTournament.error ? activeTournament.error.message : "None"}
          </div>
          <div>
            <strong>Current Tournament:</strong>{" "}
            {activeTournament.currentTournament ? activeTournament.currentTournament.name : "None"}
          </div>
          <div>
            <strong>Players Count:</strong> {activeTournament.players.length}
          </div>
          <div>
            <strong>Is Tournament Editable:</strong>{" "}
            {activeTournament.isTournamentEditable ? "true" : "false"}
          </div>
          <div>
            <strong>Tournament Status Display:</strong> {activeTournament.tournamentStatusDisplay}
          </div>
        </div>
      </div>

      {/* Raw JSON for debugging */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-3 text-red-600">Raw PortoAuth State (JSON)</h2>
        <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
          {JSON.stringify(
            portoAuth,
            (key, value) => {
              // Don't show the token in the raw JSON for security
              if (key === "token") return "[REDACTED]";
              return value;
            },
            2
          )}
        </pre>
      </div>
    </div>
  );
};
