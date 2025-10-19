import React from "react";
import { useParams } from "react-router-dom";
import { Breadcrumbs } from "../components/common/Breadcrumbs";
import { LineupForm } from "../components/lineup/LineupForm";
import { TournamentInfoPanel } from "../components/tournament/TournamentInfoPanel";
import { useTournament } from "../contexts/TournamentContext";

const LineupCreatePage: React.FC = () => {
  const { lineupId } = useParams<{ lineupId: string }>();
  const isEditMode = Boolean(lineupId);
  const { isTournamentEditable } = useTournament();
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

      {/* Tournament Info Panel - only show when editable */}
      {isTournamentEditable && <TournamentInfoPanel />}

      <div className="bg-white rounded-sm shadow">
        <LineupForm lineupId={lineupId} />
      </div>
    </div>
  );
};

export default LineupCreatePage;
