import { Link, useNavigate } from "react-router-dom";
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
      <p className="mb-4 font-display text-sm leading-relaxed text-gray-600">
        Set a name and optional description—then invite friends and create contests from the Manage
        tab.{" "}
        <Link to="/guides/start-a-league" className="text-blue-600 hover:text-blue-700">
          Full league starter guide
        </Link>
      </p>
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
