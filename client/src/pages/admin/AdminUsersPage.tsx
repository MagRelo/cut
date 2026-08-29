import { PageHeader } from "../../components/common/PageHeader";
import { AdminUsersList } from "../../components/admin/AdminUsersList";

export function AdminUsersPage() {
  return (
    <>
      <PageHeader title="Users" />
      <AdminUsersList />
    </>
  );
}
