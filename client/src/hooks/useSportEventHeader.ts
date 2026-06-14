import { useActiveEventQuery } from "./useSportData";
import { useSportContext } from "../contexts/SportContext";
import { useSportUIPlugin } from "./useSportUI";

export function useSportEventHeader() {
  const { sportId } = useSportContext();
  const activeQuery = useActiveEventQuery(sportId);
  const plugin = useSportUIPlugin();

  return {
    sportId,
    event: activeQuery.data?.event,
    isLoading: activeQuery.isLoading,
    isFetching: activeQuery.isFetching,
    error: activeQuery.error,
    EventSummary: plugin?.EventSummary,
  };
}
