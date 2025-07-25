import { PageHeader } from "../components/util/PageHeader";
import { Transfer } from "../components/user/Transfer";
import { Breadcrumbs } from "../components/util/Breadcrumbs";

export function TransferPage() {
  return (
    <div className="p-4">
      <Breadcrumbs
        items={[{ label: "Account", path: "/user" }, { label: "Transfer CUT" }]}
        className="mb-3"
      />
      <PageHeader title="Transfer CUT" className="mb-3" />
      <div className="bg-white rounded-lg shadow p-4">
        <Transfer />
      </div>
    </div>
  );
}
