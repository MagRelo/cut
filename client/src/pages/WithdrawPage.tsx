import { PageHeader } from "../components/util/PageHeader";
import { Withdraw } from "../components/user/Withdraw";
import { Breadcrumbs } from "../components/util/Breadcrumbs";

export function WithdrawPage() {
  return (
    <div className="p-4">
      <Breadcrumbs
        items={[{ label: "Account", path: "/user" }, { label: "Withdraw" }]}
        className="mb-3"
      />
      <PageHeader title="Withdraw" className="mb-3" />
      <Withdraw />
    </div>
  );
}
