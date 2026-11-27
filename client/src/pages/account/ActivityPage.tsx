import { ClockIcon } from "@heroicons/react/24/outline";
import { Breadcrumbs } from "../../components/common/Breadcrumbs";
import { ActivityList } from "../../components/account/ActivityList";
import {
  AccountPanelHeading,
  accountPanelIconClassName,
} from "../../components/account/AccountPanel";

export function ActivityPage() {
  return (
    <>
      <Breadcrumbs
        items={[{ label: "Account", path: "/account" }, { label: "Activity" }]}
        className="mb-2"
      />
      <AccountPanelHeading icon={<ClockIcon className={accountPanelIconClassName} aria-hidden />}>
        Activity
      </AccountPanelHeading>
      <ActivityList />
    </>
  );
}
