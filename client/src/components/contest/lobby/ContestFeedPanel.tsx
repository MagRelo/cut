import React, { useMemo } from "react";
import { parseContestCommentaryFeedDocument } from "@cut/sport-pga-golf";
import { type Contest } from "../../../types/contest";
import { CutbotPost } from "./CutbotPost";

export interface ContestFeedPanelProps {
  contest: Contest;
}

export const ContestFeedPanel: React.FC<ContestFeedPanelProps> = ({ contest }) => {
  const items = useMemo(
    () => parseContestCommentaryFeedDocument(contest.commentaryFeed).items,
    [contest.commentaryFeed],
  );

  if (items.length === 0) {
    return (
      <div className="rounded-sm border border-slate-200 bg-slate-50 p-6 text-center font-display">
        <p className="text-sm text-slate-600">Cutbot hasn&apos;t posted any updates yet.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-sm border border-slate-200 bg-white font-display">
      <ul className="divide-y divide-slate-200">
        {items.map((item) => (
          <li key={item.id}>
            <CutbotPost text={item.text} generatedAt={item.generatedAt} />
          </li>
        ))}
      </ul>
    </div>
  );
};
