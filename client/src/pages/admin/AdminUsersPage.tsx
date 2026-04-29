import { useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../../components/common/PageHeader";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { ErrorMessage } from "../../components/common/ErrorMessage";
import { useAdminUsersQuery } from "../../hooks/useAdminUserQueries";

const USER_TYPE_OPTIONS = ["USER", "TEST", "ADMIN", "SUPER_ADMIN", "PUBLIC"] as const;

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export function AdminUsersPage() {
  const [userTypeFilter, setUserTypeFilter] = useState<string>("USER");
  const { data, isLoading, error } = useAdminUsersQuery(userTypeFilter);
  const errorMessage = error instanceof Error ? error.message : error ? String(error) : null;

  return (
    <div className="space-y-4 p-4">
      <PageHeader title="Users" />
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-gray-600">
          Staff-only list. {data ? `${data.total} user(s) total` : null}
        </p>
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
                <th className="p-3 font-medium text-gray-700">Type</th>
                <th className="p-3 font-medium text-gray-700">Email</th>
                <th className="p-3 font-medium text-gray-700">Wallet</th>
                <th className="p-3 font-medium text-gray-700">Created</th>
                <th className="p-3 font-medium text-gray-700">View</th>
              </tr>
            </thead>
            <tbody>
              {(data?.items ?? []).map((u) => (
                <tr key={u.id} className="border-b border-gray-100 hover:bg-gray-50/80">
                  <td className="p-3 text-gray-900 font-medium">{u.name}</td>
                  <td className="p-3 text-gray-600">{u.userType}</td>
                  <td className="p-3 text-gray-600 max-w-[180px] truncate" title={u.email ?? ""}>
                    {u.email ?? "—"}
                  </td>
                  <td className="p-3 text-gray-600 font-mono text-xs max-w-[200px] truncate" title={u.walletAddress ?? ""}>
                    {u.walletAddress ? `${u.walletAddress.slice(0, 6)}…${u.walletAddress.slice(-4)}` : "—"}
                  </td>
                  <td className="p-3 text-gray-500 whitespace-nowrap">{formatDate(u.createdAt)}</td>
                  <td className="p-3">
                    <Link
                      to={`/admin/users/${u.id}`}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Open
                    </Link>
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
