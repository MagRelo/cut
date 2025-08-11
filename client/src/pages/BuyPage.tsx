import { PageHeader } from "../components/util/PageHeader";
import { Buy } from "../components/user/Buy";
import { Breadcrumbs } from "../components/util/Breadcrumbs";

export function BuyPage() {
  return (
    <div className="p-4">
      <Breadcrumbs
        items={[{ label: "Account", path: "/user" }, { label: "Buy" }]}
        className="mb-3"
      />
      <PageHeader title="Buy CUT Tokens" className="mb-3" />
      <Buy />
    </div>
  );
}
