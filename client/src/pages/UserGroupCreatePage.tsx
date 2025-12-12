import { useNavigate } from "react-router-dom";
import { PageHeader } from "../components/common/PageHeader";
import { Breadcrumbs } from "../components/common/Breadcrumbs";
import { UserGroupForm } from "../components/userGroup/UserGroupForm";
import { useCreateUserGroup } from "../hooks/useUserGroupMutations";
import { type CreateUserGroupInput } from "../types/userGroup";

export const UserGroupCreatePage = () => {
  const navigate = useNavigate();
  const createMutation = useCreateUserGroup();

  const handleSubmit = (data: CreateUserGroupInput) => {
    createMutation.mutate(data, {
      onSuccess: (userGroup) => {
        navigate(`/user-groups/${userGroup.id}`);
      },
    });
  };

  return (
    <div className="space-y-4 p-4">
      <Breadcrumbs
        items={[
          { label: "User Groups", path: "/user-groups" },
          { label: "Create Group", path: "/user-groups/create" },
        ]}
      />
      <PageHeader title="Create User Group" />
      <div className="bg-white rounded-sm shadow p-4">
        <UserGroupForm
          onSubmit={handleSubmit}
          isLoading={createMutation.isPending}
          error={
            createMutation.error
              ? (createMutation.error as any)?.response?.data?.error || "Failed to create group"
              : null
          }
        />
      </div>
    </div>
  );
};
