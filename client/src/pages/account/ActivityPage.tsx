import { ClockIcon } from "@heroicons/react/24/outline";
import { Breadcrumbs } from "../../components/common/Breadcrumbs";
import { ActivityList } from "../../components/account/ActivityList";

export function ActivityPage() {
  return (
    <>
      <Breadcrumbs
        items={[{ label: "Account", path: "/account" }, { label: "Activity" }]}
        className="mb-2"
      />
      <div className="rounded-lg border border-slate-300 bg-white p-6 font-display shadow-sm">
        <h1 className="mb-4 flex items-center gap-2 text-xl font-semibold text-gray-900">
          <ClockIcon className="h-6 w-6 shrink-0" aria-hidden />
          Activity
        </h1>
        <ActivityList />
      </div>
    </>
  );
}
