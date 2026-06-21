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
    <Link
      to={`/leagues/${userGroup.id}`}
      className="group block w-full min-w-0 rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
    >
      <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm ring-1 ring-slate-900/[0.04] transition-[border-color,box-shadow,background-color] duration-200 group-hover:border-blue-200 group-hover:bg-blue-50/40 group-hover:shadow-md">
        <div className="flex min-w-0 items-center gap-2">
          <h3 className="min-w-0 flex-1 truncate font-display text-xl font-bold leading-tight tracking-tight text-gray-900">
            {userGroup.name}
          </h3>
          <span
            className={`inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-[10px] font-semibold ${
              userGroup.role === "ADMIN"
                ? "border border-blue-300 bg-blue-100 text-blue-800"
                : "border border-gray-300 bg-gray-100 text-gray-800"
            }`}
          >
            {formatRole(userGroup.role)}
          </span>
        </div>
        {userGroup.description ? (
          <p className="mt-1 line-clamp-2 font-display text-sm leading-relaxed text-gray-600">
            {userGroup.description}
          </p>
        ) : null}
        <dl className="mt-2.5 grid grid-cols-2 gap-x-4 text-center">
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">Members</dt>
            <dd className="font-display text-sm font-semibold tabular-nums text-gray-900">
              {userGroup.memberCount}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">Contests</dt>
            <dd className="font-display text-sm font-semibold tabular-nums text-gray-900">
              {userGroup.contestCount}
            </dd>
          </div>
        </dl>
      </div>
    </Link>
  );
};
