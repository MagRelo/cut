import { useEffect, useRef } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { LoadingSpinner } from "../components/common/LoadingSpinner";
import { ErrorMessage } from "../components/common/ErrorMessage";
import { useJoinLeague } from "../hooks/useUserGroupMutations";
import { isApiError } from "../utils/apiError";
import {
  clearPendingLeagueInviteCode,
  setPendingLeagueInviteCode,
} from "../lib/leagueInviteCapture";

export const UserGroupJoinPage = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { mutateAsync, isPending, isError, error } = useJoinLeague();
  const attemptedCodeRef = useRef<string | null>(null);

  useEffect(() => {
    if (code) {
      setPendingLeagueInviteCode(code);
    }
  }, [code]);

  useEffect(() => {
    if (!code || attemptedCodeRef.current === code) {
      return;
    }
    attemptedCodeRef.current = code;

    void mutateAsync({ inviteCode: code })
      .then((league) => {
        clearPendingLeagueInviteCode();
        navigate(`/leagues/${league.id}`, { replace: true });
      })
      .catch((joinError) => {
        if (isApiError(joinError) && joinError.statusCode === 409) {
          clearPendingLeagueInviteCode();
          const userGroupId = joinError.context?.userGroupId;
          if (typeof userGroupId === "string") {
            navigate(`/leagues/${userGroupId}`, { replace: true });
          }
        }
      });
  }, [code, mutateAsync, navigate]);

  if (!code) {
    return (
      <>
        <ErrorMessage message="Invalid referral link" />
        <Link to="/leagues" className="text-sm text-blue-600 hover:text-blue-700 font-display">
          Go to Leagues
        </Link>
      </>
    );
  }

  if (isPending) {
    return (
      <>
        <h1 className="font-display text-xl font-semibold text-gray-900">Joining league...</h1>
        <div className="flex justify-center items-center py-12">
          <LoadingSpinner />
        </div>
      </>
    );
  }

  if (isError) {
    const message =
      error && isApiError(error) && error.statusCode === 404
        ? "Referral link not found or expired"
        : error instanceof Error
          ? error.message
          : "Failed to join league";

    return (
      <>
        <h1 className="font-display text-xl font-semibold text-gray-900">Join League</h1>
        <ErrorMessage message={message} />
        <Link to="/leagues" className="text-sm text-blue-600 hover:text-blue-700 font-display">
          Go to Leagues
        </Link>
      </>
    );
  }

  return (
    <div className="flex justify-center items-center py-12">
      <LoadingSpinner />
    </div>
  );
};
