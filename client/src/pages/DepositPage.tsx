import { PageHeader } from "../components/util/PageHeader";
import { Deposit } from "../components/user/Deposit";
import { Breadcrumbs } from "../components/util/Breadcrumbs";

export function DepositPage() {
  return (
    <div className="p-4">
      <Breadcrumbs
        items={[{ label: "Account", path: "/user" }, { label: "Buy" }]}
        className="mb-3"
      />
      <PageHeader title="Buy CUT Tokens" className="mb-3" />
      <Deposit />
    </div>
  );
}
