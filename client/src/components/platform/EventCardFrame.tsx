import type { CompetitionEventShell } from "@cut/sport-sdk";
import { useSportUIPlugin } from "../../hooks/useSportUI";
import { cn } from "../../lib/tabStyles";

/** Photo strip that caps an event card. Pairs with {@link eventCardBodyClassName}. */
export const eventCardImageFrameClassName =
  "overflow-hidden rounded-t-md border-x border-t border-slate-500";

/** White body under a photo. Bottom corners only — the image owns the top. */
export const eventCardBodyClassName =
  "overflow-hidden rounded-b-md border-x border-b border-slate-300 bg-white";

/** White card when the event has no photo above it. */
export const eventCardSoloClassName =
  "overflow-hidden rounded-md border border-slate-300 bg-white";

export function useEventCardHeroImage(
  sportId: string | undefined,
  event: CompetitionEventShell | null | undefined,
): string | null {
  const plugin = useSportUIPlugin(sportId);
  if (!sportId || !event || !plugin?.resolveEventHeroImage) return null;
  return plugin.resolveEventHeroImage(event);
}

export function EventCardImage({
  sportId,
  event,
}: {
  sportId: string;
  event: CompetitionEventShell;
}) {
  const plugin = useSportUIPlugin(sportId);
  const heroImage = useEventCardHeroImage(sportId, event);
  if (!heroImage) return null;

  return (
    <div className={eventCardImageFrameClassName}>
      <div
        className={cn("h-36 bg-cover bg-center sm:h-44", plugin?.eventHeroImageClassName)}
        style={{ backgroundImage: `url(${heroImage})` }}
        aria-hidden
      />
    </div>
  );
}
