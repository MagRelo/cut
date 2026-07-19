import React, { useMemo } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useLineupsQuery } from "../hooks/useLineupQueries";
import type { PlatformLineupListItem } from "../types/lineup";
import { PageHeader } from "../components/common/PageHeader";
import { PageSection } from "../components/layout/PageSection";
import { LoadingSpinner } from "../components/common/LoadingSpinner";
import { ErrorMessage } from "../components/common/ErrorMessage";
import { SideBetPanel } from "../components/lineup/sideBet/SideBetPanel";
import { getLineupNumberLabel, resolveUserBorderColor } from "../lib/lineupDisplay";
import { lineupPickLastNames } from "../lib/lineupUtils";

export const EventParlaysPage: React.FC = () => {
  const { eventId } = useParams<{ sportId: string; eventId: string }>();
  const { user, loading: authLoading } = useAuth();

  const {
    data: lineups = [],
    isLoading: isLineupsLoading,
    error,
  } = useLineupsQuery(eventId, !authLoading, user?.id);

  const userLabel = useMemo(() => {
    return user?.name || user?.email || "Unknown User";
  }, [user?.name, user?.email]);

  const borderColor = useMemo(() => {
    return resolveUserBorderColor(user?.settings?.color);
  }, [user?.settings]);

  const renderLineupHeader = (lineup: PlatformLineupListItem) => {
    const lineupNumberLabel = getLineupNumberLabel(lineup.name);
    const playerLastNamesLine = lineupPickLastNames(lineup).join(", ");

    return (
      <div
        className="px-3 py-4 font-display"
        style={{
          borderLeftColor: borderColor,
          borderLeftWidth: "5px",
          borderLeftStyle: "solid",
        }}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1 text-left font-display">
            <div className="truncate text-xl font-semibold leading-tight text-gray-900">
              {userLabel}
            </div>
            <div className="truncate text-sm leading-tight text-gray-700">
              {lineupNumberLabel ? `Lineup ${lineupNumberLabel}` : `Lineup ${lineup.id.slice(-6)}`}
            </div>
            {playerLastNamesLine ? (
              <div className="mt-1 truncate text-xs leading-tight text-gray-500">
                {playerLastNamesLine}
              </div>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-2 text-right">
            <div className="text-xl font-bold leading-none text-gray-900">{lineup.score}</div>
            <div className="mt-0.5 text-[10px] font-semibold uppercase leading-none tracking-wide text-gray-500">
              PTS
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (authLoading || isLineupsLoading) {
    return (
      <>
        <PageHeader title="Lineup Parlays" />
        <PageSection>
          <div className="text-center min-h-[200px] flex items-center justify-center">
            <LoadingSpinner />
          </div>
        </PageSection>
      </>
    );
  }

  if (error) {
    const message = error instanceof Error ? error.message : "Failed to load lineups";
    return (
      <>
        <PageHeader title="Lineup Parlays" />
        <PageSection>
          <ErrorMessage message={message} />
        </PageSection>
      </>
    );
  }

  if (!lineups || lineups.length === 0) {
    return (
      <>
        <PageHeader title="Lineup Parlays" />
        <PageSection>
          <div className="text-center my-8">
            <p className="text-gray-400 font-semibold font-display mb-2">
              No lineups found
            </p>
            <p className="text-sm text-gray-500">
              Build a lineup for this event to place parlay tickets.
            </p>
          </div>
        </PageSection>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Lineup Parlays" className="mb-2" />
      <PageSection>
        <div className="flex flex-col gap-3">
          {lineups.map((lineup) => {
            const lineupNumberLabel = getLineupNumberLabel(lineup.name);
            const playerLastNamesLine = lineupPickLastNames(lineup).join(", ");

            return (
              <div key={lineup.id} className="bg-white">
                {renderLineupHeader(lineup)}
                <div className="px-3 pb-3 pt-0">
                  <SideBetPanel
                    borderColor={borderColor}
                    userLabel={userLabel}
                    lineupNumberLabel={lineupNumberLabel}
                    playerLastNamesLine={playerLastNamesLine}
                    lineupId={lineup.id}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </PageSection>
    </>
  );
};

