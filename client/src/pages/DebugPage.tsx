import React from "react";
import { useAuth } from "../contexts/AuthContext";
import {
  useActiveTournament,
  useActiveTournamentLive,
  useTournamentShell,
} from "../hooks/useTournamentData";
import { useAccount } from "wagmi";

export const DebugPage: React.FC = () => {
  const { address, chainId, status: wagmiStatus } = useAccount();
  const auth = useAuth();
  const shellQuery = useTournamentShell();
  const tournamentId = shellQuery.data?.tournament?.id;
  const liveQuery = useActiveTournamentLive(tournamentId);
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
            {auth.platformBalanceUnavailable
              ? "Error"
              : auth.platformTokenBalance?.toString() ?? (auth.balancesLoading ? "Loading..." : "—")}
          </div>
          <div>
            <strong>Payment Token Balance:</strong>{" "}
            {auth.paymentBalanceUnavailable
              ? "Error"
              : auth.paymentTokenBalance?.toString() ?? (auth.balancesLoading ? "Loading..." : "—")}
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
          <div>
            <strong>Balances Unavailable:</strong> {auth.balancesUnavailable ? "true" : "false"}
          </div>
        </div>
      </div>

      {/* Tournament shell */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-3 text-purple-600">
          Tournament shell (useTournamentShell / GET active/shell)
        </h2>
        <div className="space-y-2 text-sm">
          <div>
            <strong>Loading:</strong> {shellQuery.isLoading ? "true" : "false"}
          </div>
          <div>
            <strong>Error:</strong>{" "}
            {shellQuery.error ? String(shellQuery.error.message) : "None"}
          </div>
          <div>
            <strong>Data updated:</strong>{" "}
            {shellQuery.dataUpdatedAt
              ? new Date(shellQuery.dataUpdatedAt).toLocaleString()
              : "—"}
          </div>
          {shellQuery.data && (
            <>
              <div>
                <strong>Tournament:</strong> {shellQuery.data.tournament.name}
              </div>
              <div>
                <strong>Tournament ID:</strong> {shellQuery.data.tournament.id}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Active tournament live */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-3 text-indigo-600">
          Active live (useActiveTournamentLive / GET active/live)
        </h2>
        <div className="space-y-2 text-sm">
          <div>
            <strong>Tournament ID (from shell):</strong> {tournamentId ?? "—"}
          </div>
          <div>
            <strong>Loading:</strong> {liveQuery.isLoading ? "true" : "false"}
          </div>
          <div>
            <strong>Error:</strong> {liveQuery.error ? String(liveQuery.error.message) : "None"}
          </div>
          <div>
            <strong>Data updated:</strong>{" "}
            {liveQuery.dataUpdatedAt
              ? new Date(liveQuery.dataUpdatedAt).toLocaleString()
              : "—"}
          </div>
          <div>
            <strong>Players Count:</strong> {liveQuery.data?.players.length ?? "—"}
          </div>
          {liveQuery.data && (
            <div>
              <strong>Status:</strong> {liveQuery.data.tournament.status}
            </div>
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
            <strong>Tournament:</strong>{" "}
            {activeTournament.tournament ? activeTournament.tournament.name : "None"}
          </div>
          <div>
            <strong>Players Count:</strong> {activeTournament.players.length}
          </div>
          <div>
            <strong>Is Tournament Editable:</strong>{" "}
            {activeTournament.isTournamentEditable ? "true" : "false"}
          </div>
        </div>
      </div>
    </div>
  );
};
