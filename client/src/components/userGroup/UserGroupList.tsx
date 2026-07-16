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
      <div className="py-12 text-center">
        <p className="mb-4 text-lg text-gray-500">You're not a member of any leagues yet.</p>
        <p className="text-sm text-gray-400">Create a league or accept an invite to get started.</p>
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
