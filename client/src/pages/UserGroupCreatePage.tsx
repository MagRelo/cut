import { useNavigate } from "react-router-dom";
import { PageHeader } from "../components/common/PageHeader";
import { Breadcrumbs } from "../components/common/Breadcrumbs";
import { PageSection } from "../components/layout/PageSection";
import { UserGroupForm } from "../components/userGroup/UserGroupForm";
import { useCreateUserGroup } from "../hooks/useUserGroupMutations";
import { type CreateUserGroupInput, type UpdateUserGroupInput } from "../types/userGroup";

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
    <>
      <Breadcrumbs
        items={[
          { label: "Leagues", path: "/user-groups" },
          { label: "Create League", path: "/user-groups/create" },
        ]}
      />
      <PageHeader title="Create League" />
      <PageSection>
        <UserGroupForm
          onSubmit={handleSubmit as (data: CreateUserGroupInput | UpdateUserGroupInput) => void}
          isLoading={createMutation.isPending}
          error={
            createMutation.error
              ? (createMutation.error as any)?.response?.data?.error || "Failed to create league"
              : null
          }
        />
      </PageSection>
    </>
  );
};
