import { prisma } from "../../prisma.js";
import { getAnyActiveEvent, loadEventForEmail } from "./event.js";
import { getSportEmailContent } from "../../../sports/emailContentRegistry.js";
import type { WelcomeEmailData } from "../emails/welcome.js";

export async function loadWelcomeEmailData(userId: string): Promise<WelcomeEmailData | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });
  if (!user?.email?.trim()) return null;

  const data: WelcomeEmailData = {};
  const active = await getAnyActiveEvent();
  if (active) {
    const event = await loadEventForEmail(active.id);
    if (event?.name) {
      data.tournamentName = event.name;
      data.sportId = event.sportId;
      const adapter = getSportEmailContent(event.sportId);
      const blurb = adapter?.welcomeProductBlurb?.({ eventName: event.name });
      if (blurb) data.productBlurb = blurb;
    }
  }

  return data;
}
