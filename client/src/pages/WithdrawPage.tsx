import { Withdraw } from "../components/user/Withdraw";
import { PageHeader } from "../components/util/PageHeader";
import { Breadcrumbs } from "../components/util/Breadcrumbs";

export function WithdrawPage() {
  return (
    <div className="p-4">
      <Breadcrumbs
        items={[{ label: "Account", path: "/user" }, { label: "Sell" }]}
        className="mb-3"
      />
      <PageHeader title="Sell CUT Tokens" className="mb-3" />
      <Withdraw />
    </div>
  );
}
