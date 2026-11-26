import { BotDelegationSettings } from "../../components/account/BotDelegationSettings";
import { Breadcrumbs } from "../../components/common/Breadcrumbs";

export function AgentsPage() {
  return (
    <>
      <Breadcrumbs
        items={[{ label: "Account", path: "/account" }, { label: "Agents" }]}
        className="mb-2"
      />
      <BotDelegationSettings />
    </>
  );
}
