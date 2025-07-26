import { PageHeader } from "../components/util/PageHeader";
import { Add } from "../components/user/Add";
import { Breadcrumbs } from "../components/util/Breadcrumbs";

export function AddPage() {
  return (
    <div className="p-4">
      <Breadcrumbs
        items={[{ label: "Account", path: "/user" }, { label: "Add" }]}
        className="mb-3"
      />
      <PageHeader title="Add" className="mb-3" />
      <Add />
    </div>
  );
}
