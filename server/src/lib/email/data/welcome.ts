import { prisma } from "../../prisma.js";
import { getActiveEventId, loadEventForEmail } from "./event.js";
import type { WelcomeEmailData } from "../emails/welcome.js";

export async function loadWelcomeEmailData(userId: string): Promise<WelcomeEmailData | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });
  if (!user?.email?.trim()) return null;

  let tournamentName: string | undefined;
  const activeId = await getActiveEventId();
  if (activeId) {
    const event = await loadEventForEmail(activeId);
    tournamentName = event?.name;
  }

  const data: WelcomeEmailData = {};
  if (tournamentName) data.tournamentName = tournamentName;
  return data;
}
