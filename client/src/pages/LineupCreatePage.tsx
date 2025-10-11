import React from "react";
import { useParams } from "react-router-dom";
// import { PageHeader } from "../components/util/PageHeader";
import { Breadcrumbs } from "../components/util/Breadcrumbs";
import { TournamentLineupForm } from "../components/team/TournamentLineupForm";
// import { useLineup } from "../contexts/LineupContext";

const LineupCreatePage: React.FC = () => {
  const { lineupId } = useParams<{ lineupId: string }>();
  const isEditMode = Boolean(lineupId);
  // const { getLineupFromCache } = useLineup();

  // Get lineup data for edit mode
  // const currentLineup = isEditMode ? getLineupFromCache(lineupId!) : null;

  /*// Generate title based on mode
  const getPageTitle = () => {
    if (isEditMode && currentLineup) {
      const lineupName = currentLineup.name || `Lineup ${currentLineup.id.slice(-6)}`;
      return `Edit ${lineupName}`;
    } else if (!isEditMode) {
      // For create mode, we'll use a generic title since we don't know the name yet
      return "Create Lineup";
    }
    return isEditMode ? "Edit Lineup" : "Create Lineup";
  };*/

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
      {/* <PageHeader title={getPageTitle()} className="mb-3" /> */}
      <div className="bg-white rounded-lg shadow">
        <TournamentLineupForm lineupId={lineupId} />
      </div>
    </div>
  );
};

export default LineupCreatePage;
