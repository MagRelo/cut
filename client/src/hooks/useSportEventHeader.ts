import { useSportContext } from "../contexts/SportContext";
import { useSportActiveEvent } from "./useSportActiveEvent";
import { useSportUIPlugin } from "./useSportUI";

export function useSportEventHeader() {
  const { sportId } = useSportContext();
  const state = useSportActiveEvent(sportId);
  const plugin = useSportUIPlugin();

  return {
    sportId,
    event: state.event,
    isLoading: state.isLoading,
    isFetching: state.isFetching,
    error: state.error,
    EventSummary: plugin?.EventSummary,
  };
}
