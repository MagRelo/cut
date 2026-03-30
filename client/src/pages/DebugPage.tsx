import React from "react";
import { useAuth } from "../contexts/AuthContext";
import { useTournamentData, useActiveTournament } from "../hooks/useTournamentData";
import { useAccount } from "wagmi";

export const DebugPage: React.FC = () => {
  const { address, chainId, status: wagmiStatus } = useAccount();
  const auth = useAuth();
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

      {/* Auth context (Cut / Privy) */}
      <div className="bg-white p-4 rounded-lg shadow">
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
            <strong>Platform Token Balance:</strong>{" "}
            {auth.platformTokenBalance?.toString() || "Loading..."}
          </div>
          <div>
            <strong>Payment Token Balance:</strong>{" "}
            {auth.paymentTokenBalance?.toString() || "Loading..."}
          </div>
          <div>
            <strong>Platform Token Address:</strong>{" "}
            {auth.platformTokenAddress || "Not loaded"}
          </div>
          <div>
            <strong>Payment Token Address:</strong> {auth.paymentTokenAddress || "Not loaded"}
          </div>
          <div>
            <strong>Balances Loading:</strong> {auth.balancesLoading ? "true" : "false"}
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
        <h2 className="text-lg font-semibold mb-3 text-red-600">Raw auth state (JSON)</h2>
        <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
          {JSON.stringify(
            auth,
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
