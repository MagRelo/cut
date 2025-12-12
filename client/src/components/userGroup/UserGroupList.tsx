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
      <div className="flex justify-center items-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return <ErrorMessage message={error} />;
  }

  if (!userGroups || userGroups.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg mb-4">You're not a member of any groups yet.</p>
        <p className="text-gray-400 text-sm">Create a new group to get started!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {userGroups.map((userGroup) => (
        <UserGroupCard key={userGroup.id} userGroup={userGroup} />
      ))}
    </div>
  );
};
