import React from "react";
import { useParams } from "react-router-dom";
import { Breadcrumbs } from "../components/common/Breadcrumbs";
import { LineupForm } from "../components/lineup/LineupForm";

const LineupCreatePage: React.FC = () => {
  const { lineupId } = useParams<{ lineupId: string }>();
  const isEditMode = Boolean(lineupId);

  return (
    <div className="space-y-2 p-4">
      <Breadcrumbs
        items={[
          { label: "Lineups", path: "/lineups" },
          {
            label: isEditMode ? "Edit Lineup" : "Create Lineup",
            path: isEditMode ? `/lineups/edit/${lineupId}` : "/lineups/create",
          },
        ]}
      />
      <div className="bg-white rounded-sm shadow">
        <LineupForm lineupId={lineupId} />
      </div>
    </div>
  );
};

export default LineupCreatePage;
