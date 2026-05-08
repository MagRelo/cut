import { useState } from "react";
import { Link } from "react-router-dom";
import { formatUnits } from "viem";
import { PageHeader } from "../../components/common/PageHeader";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { ErrorMessage } from "../../components/common/ErrorMessage";
import { useAuth } from "../../contexts/AuthContext";
import { useAdminUsersQuery } from "../../hooks/useAdminUserQueries";

const PLATFORM_TOKEN_DECIMALS = 18;

function formatPlatformBalance(wei: string | null): string {
  if (wei === null) return "—";
  try {
    return Number(formatUnits(BigInt(wei), PLATFORM_TOKEN_DECIMALS)).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    });
  } catch {
    return "—";
  }
}

const USER_TYPE_OPTIONS = ["USER", "TEST", "ADMIN", "SUPER_ADMIN", "PUBLIC"] as const;

export function AdminUsersPage() {
  const [userTypeFilter, setUserTypeFilter] = useState<string>("USER");
  const { platformTokenSymbol } = useAuth();
  const tokenLabel = platformTokenSymbol ?? "CUT";
  const { data, isLoading, error } = useAdminUsersQuery(userTypeFilter);
  const errorMessage = error instanceof Error ? error.message : error ? String(error) : null;
  const totalFormatted = data ? formatPlatformBalance(data.totalPlatformTokenBalanceWei) : null;

  return (
    <div className="space-y-4 p-4">
      <PageHeader title="Users" />
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-gray-600 space-y-0.5">
          <p>Staff-only list. {data ? `${data.total} user(s) total` : null}</p>
          {data ? (
            <p className="font-medium text-gray-800">
              Total on this page: {totalFormatted} {tokenLabel}
            </p>
          ) : null}
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-600">
          User type
          <select
            value={userTypeFilter}
            onChange={(e) => setUserTypeFilter(e.target.value)}
            className="rounded-sm border border-gray-300 bg-white px-2 py-1 text-sm text-gray-800"
          >
            {USER_TYPE_OPTIONS.map((userType) => (
              <option key={userType} value={userType}>
                {userType}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="bg-white rounded-sm shadow border border-gray-200 overflow-x-auto">
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <LoadingSpinner />
          </div>
        ) : error ? (
          <div className="p-4">
            <ErrorMessage message={errorMessage || "Failed to load users"} />
          </div>
        ) : (
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left">
                <th className="p-3 font-medium text-gray-700">Name</th>
                <th className="p-3 font-medium text-gray-700">Email</th>
                <th className="p-3 font-medium text-gray-700 text-right whitespace-nowrap">
                  {tokenLabel} balance
                </th>
              </tr>
            </thead>
            <tbody>
              {(data?.items ?? []).map((u) => (
                <tr key={u.id} className="border-b border-gray-100 hover:bg-gray-50/80">
                  <td className="p-3 text-gray-900 font-medium">
                    <Link to={`/admin/users/${u.id}`} className="text-blue-600 hover:text-blue-800">
                      {u.name}
                    </Link>
                  </td>
                  <td className="p-3 text-gray-600 max-w-[180px] truncate" title={u.email ?? ""}>
                    {u.email ?? "—"}
                  </td>
                  <td className="p-3 text-gray-800 text-right tabular-nums whitespace-nowrap">
                    {formatPlatformBalance(u.platformTokenBalanceWei ?? null)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
