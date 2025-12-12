import { type UserGroupMemberResponse, type UserGroupRole } from "../../types/userGroup";

interface UserGroupMembersListProps {
  members: UserGroupMemberResponse[];
  currentUserRole?: UserGroupRole | null;
  currentUserId?: string;
}

export const UserGroupMembersList = ({
  members,
  currentUserRole,
  currentUserId,
}: UserGroupMembersListProps) => {
  const formatRole = (role: string) => {
    return role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
  };

  if (members.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No members yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {members.map((member) => {
        const isCurrentUser = member.userId === currentUserId;
        return (
          <div
            key={member.id}
            className={`flex items-center justify-between p-3 rounded-lg border ${
              isCurrentUser ? "bg-blue-50 border-blue-200" : "bg-white border-gray-200"
            }`}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900">
                  {member.user.name || member.user.email}
                </span>
                {isCurrentUser && <span className="text-xs text-blue-600 font-medium">(You)</span>}
              </div>
              <div className="text-sm text-gray-500 mt-1">{member.user.email}</div>
              <div className="text-xs text-gray-400 mt-1">
                Joined {new Date(member.joinedAt).toLocaleDateString()}
              </div>
            </div>
            <div className="flex-shrink-0">
              <div
                className={`inline-flex items-center justify-center px-2.5 py-1 rounded-md text-xs font-semibold ${
                  member.role === "ADMIN"
                    ? "bg-blue-100 text-blue-800 border border-blue-300"
                    : "bg-gray-100 text-gray-800 border border-gray-300"
                }`}
              >
                {formatRole(member.role)}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
