import React from "react";
import { PageHeader } from "../components/common/PageHeader";
import { Breadcrumbs } from "../components/common/Breadcrumbs";
import { CreateContestForm } from "../components/contest/CreateContestForm";

const CreateContestPage: React.FC = () => {
  return (
    <>
      <Breadcrumbs
        items={[
          { label: "Contests", path: "/contests" },
          { label: "Create Contest", path: "/contests/create" },
        ]}
      />
      <PageHeader title="Create Contest" className="mb-3" />
      <CreateContestForm />
    </>
  );
};

export default CreateContestPage;
