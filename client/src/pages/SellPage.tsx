import { Sell } from "../components/user/Sell";
import { PageHeader } from "../components/util/PageHeader";
import { Breadcrumbs } from "../components/util/Breadcrumbs";

export function SellPage() {
  return (
    <div className="p-4">
      <Breadcrumbs
        items={[{ label: "Account", path: "/user" }, { label: "Sell" }]}
        className="mb-3"
      />
      <PageHeader title="Sell CUT" className="mb-3" />
      <Sell />
    </div>
  );
}
