import { useMemo } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Breadcrumbs } from "../components/common/Breadcrumbs";
import { PageSection } from "../components/layout/PageSection";
import { LeagueCreateContestForm } from "../components/userGroup/LeagueCreateContestForm";
import { useContestDirectory } from "../hooks/useContestDirectory";
import { useUserGroupQuery } from "../hooks/useUserGroupQuery";
import { findDirectoryEvent } from "../lib/contestGroups";
import { isEventEditableFromMetadata } from "../lib/eventMetadata";
import { LoadingSpinner } from "../components/common/LoadingSpinner";
import { ErrorMessage } from "../components/common/ErrorMessage";
import { isApiError } from "../utils/apiError";

export const UserGroupCreateContestPage = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const eventId = searchParams.get("eventId");
  const { data: userGroup, isLoading, error } = useUserGroupQuery(id);
  const { data: directory, isLoading: isDirectoryLoading } = useContestDirectory("all");

  const directoryEvent = useMemo(
    () => (eventId ? findDirectoryEvent(directory, eventId) : null),
    [directory, eventId],
  );

  const lockedEvent = useMemo(() => {
    if (!directoryEvent) return null;
    return {
      eventId: directoryEvent.id,
      eventName: directoryEvent.name,
      sportName: directoryEvent.sportName,
      startDate: directoryEvent.startDate ?? "",
      endDate: directoryEvent.endDate ?? "",
      isEditable: isEventEditableFromMetadata(directoryEvent.metadata),
    };
  }, [directoryEvent]);

  const errorMessage =
    error && isApiError(error) && error.statusCode === 404
      ? "League not found"
      : error instanceof Error
        ? error.message
        : error
          ? String(error)
          : null;

  if (isLoading || (eventId && isDirectoryLoading && !directory)) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !userGroup) {
    return <ErrorMessage message={errorMessage || "Failed to load league"} />;
  }

  const isAdmin = userGroup.currentUserRole === "ADMIN";
  const leaguePath = `/leagues/${userGroup.id}`;
  const createPath = eventId
    ? `${leaguePath}/contests/create?eventId=${encodeURIComponent(eventId)}`
    : `${leaguePath}/contests/create`;

  if (!isAdmin) {
    return (
      <>
        <Breadcrumbs
          items={[
            { label: "Leagues", path: "/leagues" },
            { label: userGroup.name, path: leaguePath },
            { label: "Create Contest", path: createPath },
          ]}
        />
        <ErrorMessage message="You must be a league admin to create contests" />
        <Link to={leaguePath} className="font-display text-sm text-blue-600 hover:text-blue-700">
          Back to league
        </Link>
      </>
    );
  }

  if (!eventId || !lockedEvent) {
    return (
      <>
        <Breadcrumbs
          items={[
            { label: "Leagues", path: "/leagues" },
            { label: userGroup.name, path: leaguePath },
            { label: "Create Contest", path: createPath },
          ]}
        />
        <ErrorMessage message="Pick an event from the league page to create a contest" />
        <Link to={leaguePath} className="font-display text-sm text-blue-600 hover:text-blue-700">
          Back to league
        </Link>
      </>
    );
  }

  return (
    <>
      <Breadcrumbs
        items={[
          { label: "Leagues", path: "/leagues" },
          { label: userGroup.name, path: leaguePath },
          { label: "Create Contest", path: createPath },
        ]}
      />
      <PageSection variant="card" className="!shadow">
        <h1 className="mb-1 font-display text-xl font-semibold text-gray-900">
          Create a New Contest
        </h1>

        <LeagueCreateContestForm userGroupId={userGroup.id} event={lockedEvent} />
      </PageSection>
    </>
  );
};
