import { refreshOpenSideBetQuotes } from "../../../services/sideBets/refreshOpenSideBetQuotes.js";

/** Golf-owned cron entry for open side-bet quote refresh. */
export async function refreshSideBetQuotes(): ReturnType<
  typeof refreshOpenSideBetQuotes
> {
  return refreshOpenSideBetQuotes();
}
