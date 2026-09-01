import { AdminUsersList } from "../../components/admin/AdminUsersList";

export function AdminUsersPage() {
  return (
    <>
      <h1 className="font-display text-xl font-semibold text-gray-900">Users</h1>
      <AdminUsersList />
    </>
  );
}
