import { type UserGroupListItem } from "../../types/userGroup";
import { UserGroupCard } from "./UserGroupCard";
import { LoadingSpinner } from "../common/LoadingSpinner";
import { ErrorMessage } from "../common/ErrorMessage";

interface UserGroupListProps {
  userGroups?: UserGroupListItem[];
  loading?: boolean;
  error?: string | null;
}

export const UserGroupList = ({ userGroups, loading, error }: UserGroupListProps) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return <ErrorMessage message={error} />;
  }

  if (!userGroups || userGroups.length === 0) {
    return (
      <div>
        <p className="mb-1 font-display text-base font-semibold text-gray-900">
          No leagues yet
        </p>
        <p className="font-display text-sm leading-relaxed text-gray-600">
          Create a league or accept an invite to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="mb-4 space-y-3">
      {userGroups.map((userGroup) => (
        <UserGroupCard key={userGroup.id} userGroup={userGroup} />
      ))}
    </div>
  );
};
