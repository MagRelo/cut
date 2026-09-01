import React from "react";
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
      <h1 className="mb-3 font-display text-xl font-semibold text-gray-900">Create Contest</h1>
      <CreateContestForm />
    </>
  );
};

export default CreateContestPage;
