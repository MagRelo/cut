/** Normalize tournament / DataGolf event titles for conservative alignment checks. */
export function normalizeEventTitle(s: string): string {
  return s
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim();
}

export function eventsAlign(tournamentName: string, datagolfEventName: string): boolean {
  return normalizeEventTitle(tournamentName) === normalizeEventTitle(datagolfEventName);
}
