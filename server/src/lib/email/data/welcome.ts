import { prisma } from "../../prisma.js";
import { getManualActiveTournamentId, loadTournamentForEmail } from "./tournament.js";
import type { WelcomeEmailData } from "../emails/welcome.js";

export async function loadWelcomeEmailData(userId: string): Promise<WelcomeEmailData | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true },
  });
  if (!user?.email?.trim()) return null;

  let tournamentName: string | undefined;
  const activeId = await getManualActiveTournamentId();
  if (activeId) {
    const tournament = await loadTournamentForEmail(activeId);
    tournamentName = tournament?.name;
  }

  const data: WelcomeEmailData = { userName: user.name };
  if (tournamentName) data.tournamentName = tournamentName;
  return data;
}
