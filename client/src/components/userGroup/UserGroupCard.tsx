import { Link } from "react-router-dom";
import { ChevronRightIcon } from "@heroicons/react/24/outline";
import { type UserGroupListItem } from "../../types/userGroup";
import { cn } from "../../lib/tabStyles";

const viewButtonClassName =
  "inline-flex min-w-[88px] items-center justify-center gap-1 rounded border border-blue-500 bg-blue-500 px-4 py-1.5 font-display text-sm text-white transition-colors hover:bg-blue-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500";

function LeagueListStat({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="min-w-0 text-center">
      <div className="font-display text-sm font-bold tabular-nums leading-none text-gray-900">
        {value}
      </div>
      <div className="mt-1 text-[9px] font-semibold uppercase leading-none tracking-wide text-gray-500">
        {label}
      </div>
    </div>
  );
}

interface UserGroupCardProps {
  userGroup: UserGroupListItem;
}

export const UserGroupCard = ({ userGroup }: UserGroupCardProps) => {
  const formatRole = (role: string) => {
    return role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
  };

  const leaguePath = `/leagues/${userGroup.id}`;

  return (
    <div
      className={cn(
        "group min-w-0 overflow-hidden rounded-sm border border-slate-200 bg-white shadow-sm ring-1 ring-slate-900/[0.04] transition-[border-color,box-shadow] duration-200 hover:border-blue-200 hover:shadow-md",
      )}
    >
      <div className="px-3 pb-2 pt-4">
        <div className="flex min-w-0 items-center gap-2">
          <h3 className="min-w-0 flex-1 truncate font-display text-2xl font-bold leading-tight tracking-tight text-gray-900">
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
      </div>

      <div className="flex items-center gap-3 px-3 py-2 pt-0">
        <div className="grid min-w-0 flex-1 grid-cols-2 gap-2">
          <LeagueListStat value={userGroup.memberCount} label="Members" />
          <LeagueListStat value={userGroup.contestCount} label="Contests" />
        </div>
        <Link
          to={leaguePath}
          aria-label={`View ${userGroup.name} league`}
          className={viewButtonClassName}
        >
          View
          <ChevronRightIcon className="h-4 w-4 shrink-0" aria-hidden />
        </Link>
      </div>
    </div>
  );
};
