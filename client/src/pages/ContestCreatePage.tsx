import React from "react";
import { PageHeader } from "../components/common/PageHeader";
import { Breadcrumbs } from "../components/common/Breadcrumbs";
import { CreateContestForm } from "../components/contest/CreateContestForm";

const CreateContestPage: React.FC = () => {
  return (
    <div className="space-y-2 p-4">
      <Breadcrumbs
        items={[
          { label: "Contests", path: "/contests" },
          { label: "Create Contest", path: "/contests/create" },
        ]}
      />
      <PageHeader title="Create Contest" className="mb-3" />
      <div className="bg-white rounded-lg shadow">
        <CreateContestForm />
      </div>
    </div>
  );
};

export default CreateContestPage;
