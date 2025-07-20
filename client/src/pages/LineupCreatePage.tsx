import React from "react";
import { useParams } from "react-router-dom";
import { PageHeader } from "../components/util/PageHeader";
import { Breadcrumbs } from "../components/util/Breadcrumbs";
import { TournamentLineupForm } from "../components/team/TournamentLineupForm";

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
      <PageHeader title={isEditMode ? "Edit Lineup" : "Create Lineup"} className="mb-3" />
      <div className="bg-white rounded-lg shadow">
        <TournamentLineupForm lineupId={lineupId} />
      </div>
    </div>
  );
};

export default LineupCreatePage;
