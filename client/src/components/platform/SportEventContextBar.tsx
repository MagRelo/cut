import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { showSportEventContext } from "../../lib/sportEventContextRoutes";
import { useGlobalError } from "../../contexts/GlobalErrorContext";
import { useSportEventHeader } from "../../hooks/useSportEventHeader";
import { SportEventHeader } from "./SportEventHeader";

const GLOBAL_ERROR_ID = "sport-event-header";

export const SportEventContextBar: React.FC = () => {
  const location = useLocation();
  const visible = showSportEventContext(location.pathname);
  const { error: queryError } = useSportEventHeader();
  const { showError, clearError } = useGlobalError();

  useEffect(() => {
    if (!visible) {
      clearError(GLOBAL_ERROR_ID);
      return;
    }

    if (queryError) {
      showError({
        id: GLOBAL_ERROR_ID,
        title: "Something is wrong...",
        message: "Failed to load event data.",
        retryLabel: "Try Again",
        onRetry: () => window.location.reload(),
      });
    } else {
      clearError(GLOBAL_ERROR_ID);
    }
  }, [visible, queryError, showError, clearError]);

  if (!visible) {
    return null;
  }

  return <SportEventHeader variant="context" />;
};
