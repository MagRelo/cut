import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { Link } from "react-router-dom";
import type { Tournament } from "../../types/tournament";

type TournamentContextDetailsVariant = "default" | "overlay";

interface TournamentContextDetailsProps {
  tournament: Tournament;
  /** When false, tournament name is plain text (e.g. inside a link wrapper). */
  linkTitle?: boolean;
  className?: string;
  variant?: TournamentContextDetailsVariant;
}

function detailSeparatorClass(variant: TournamentContextDetailsVariant) {
  return variant === "overlay" ? "text-white/60" : "text-gray-300";
}

function titleClass(variant: TournamentContextDetailsVariant) {
  return variant === "overlay"
    ? "font-display text-2xl sm:text-3xl font-bold leading-snug tracking-tight text-white [text-shadow:_0_1px_2px_rgb(0_0_0_/_40%)]"
    : "font-display text-base font-bold leading-snug tracking-tight text-gray-900";
}

function titleLinkClass(variant: TournamentContextDetailsVariant) {
  return variant === "overlay"
    ? "hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80 rounded-sm"
    : "hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/40 rounded-sm";
}

function courseClass(variant: TournamentContextDetailsVariant) {
  return variant === "overlay"
    ? "font-medium text-white/95 [text-shadow:_0_1px_1px_rgb(0_0_0_/_35%)]"
    : "font-medium text-gray-700";
}

function locationClass(variant: TournamentContextDetailsVariant) {
  return variant === "overlay"
    ? "text-white/80 [text-shadow:_0_1px_1px_rgb(0_0_0_/_35%)]"
    : "text-gray-500";
}

function roundClass(variant: TournamentContextDetailsVariant) {
  return variant === "overlay"
    ? "font-medium text-white/95 [text-shadow:_0_1px_1px_rgb(0_0_0_/_35%)]"
    : "font-medium text-gray-600";
}

export function TournamentContextDetails({
  tournament,
  linkTitle = true,
  className = "",
  variant = "default",
}: TournamentContextDetailsProps) {
  const locationLine = [tournament.city?.trim(), tournament.state?.trim()]
    .filter(Boolean)
    .join(", ");
  const roundDisplay = tournament.roundDisplay || "R1";
  const roundStatusDisplay = tournament.roundStatusDisplay || tournament.status;
  const isSuspended = tournament.roundStatusDisplay === "Suspended";

  const separatorClass = detailSeparatorClass(variant);

  const detailSeparator = (
    <span className={["text-[9px] leading-none", separatorClass].join(" ")} aria-hidden>
      ●
    </span>
  );

  const title = (
    <h1 className={titleClass(variant)}>
      {linkTitle ? (
        <Link to="/leaderboard" className={titleLinkClass(variant)}>
          {tournament.name}
        </Link>
      ) : (
        tournament.name
      )}
    </h1>
  );

  return (
    <div className={["font-display text-sm leading-snug", className].filter(Boolean).join(" ")}>
      {title}

      {tournament.course || locationLine ? (
        <div className="mt-0.5 flex w-full flex-wrap items-center gap-x-2 gap-y-0.5">
          {tournament.course ? (
            <span className={courseClass(variant)}>{tournament.course}</span>
          ) : null}
          {tournament.course && locationLine ? detailSeparator : null}
          {locationLine ? <span className={locationClass(variant)}>{locationLine}</span> : null}
        </div>
      ) : null}

      <div className={["mt-0.5 flex w-full items-center gap-x-2", roundClass(variant)].join(" ")}>
        <span>{roundDisplay}</span>
        {detailSeparator}
        {isSuspended ? (
          <span
            className={[
              "inline-flex items-center gap-1",
              variant === "overlay" ? "text-yellow-300" : "text-amber-700",
            ].join(" ")}
          >
            <ExclamationTriangleIcon
              className={[
                "h-3.5 w-3.5 shrink-0",
                variant === "overlay" ? "text-yellow-300" : "",
              ].join(" ")}
              aria-hidden
            />
            <span>{roundStatusDisplay}</span>
          </span>
        ) : (
          <span>{roundStatusDisplay}</span>
        )}
      </div>
    </div>
  );
}
