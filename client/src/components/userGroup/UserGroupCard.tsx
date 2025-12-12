import { Link } from "react-router-dom";
import { type UserGroupListItem } from "../../types/userGroup";

interface UserGroupCardProps {
  userGroup: UserGroupListItem;
}

export const UserGroupCard = ({ userGroup }: UserGroupCardProps) => {
  const formatRole = (role: string) => {
    return role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
  };

  return (
    <Link to={`/user-groups/${userGroup.id}`}>
      <div className="flex items-center justify-between gap-4 p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200">
        {/* Left Section - Group Info */}
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold text-gray-900 font-display truncate">
            {userGroup.name}
          </h3>
          {userGroup.description && (
            <p className="text-sm text-gray-600 mt-1 line-clamp-2">{userGroup.description}</p>
          )}
          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
            <span>
              {userGroup.memberCount} member{userGroup.memberCount !== 1 ? "s" : ""}
            </span>
            <span>
              {userGroup.contestCount} contest{userGroup.contestCount !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {/* Right Section - Role Badge */}
        <div className="flex-shrink-0">
          <div
            className={`inline-flex items-center justify-center px-3 py-1 rounded-md text-sm font-semibold ${
              userGroup.role === "ADMIN"
                ? "bg-blue-100 text-blue-800 border border-blue-300"
                : "bg-gray-100 text-gray-800 border border-gray-300"
            }`}
          >
            {formatRole(userGroup.role)}
          </div>
        </div>
      </div>
    </Link>
  );
};
