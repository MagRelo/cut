import { buildTestEmailHtml } from "../templates.js";
import { buildBehindTheScenesHtml } from "../emails/behindTheScenes.js";
import { buildNewTournamentHtml } from "../emails/newTournament.js";
import { buildReminderNoContestHtml } from "../emails/reminderNoContest.js";
import { buildTournamentRecapHtml } from "../emails/tournamentRecap.js";
import { buildWelcomeHtml } from "../emails/welcome.js";
import {
  fixtureBehindTheScenes,
  fixtureNewTournament,
  fixtureRecap,
  fixtureReminder,
  fixtureWelcome,
  type PreviewKind,
} from "./fixtures.js";

export { PREVIEW_KINDS, type PreviewKind } from "./fixtures.js";

export async function buildPreviewHtmlByKind(kind: PreviewKind): Promise<string> {
  switch (kind) {
    case "welcome":
      return buildWelcomeHtml(fixtureWelcome());
    case "new-tournament":
      return buildNewTournamentHtml(await fixtureNewTournament());
    case "reminder":
      return buildReminderNoContestHtml(fixtureReminder());
    case "recap":
      return buildTournamentRecapHtml(fixtureRecap());
    case "behind-the-scenes":
      return buildBehindTheScenesHtml(fixtureBehindTheScenes());
    case "minimal":
      return buildTestEmailHtml();
    default:
      throw new Error(`Unknown preview kind: ${kind}`);
  }
}
