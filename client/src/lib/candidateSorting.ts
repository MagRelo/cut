import type { Candidate } from "@cut/sport-sdk";

export { golfCandidateHasDisplayName as candidateHasDisplayName } from "@cut/sport-pga-golf";

export function participantLastName(candidate: Candidate): string {
  if (!candidate.metadata || typeof candidate.metadata !== "object" || Array.isArray(candidate.metadata)) {
    return candidate.displayName;
  }
  const participant = (candidate.metadata as Record<string, unknown>).participant;
  if (participant && typeof participant === "object" && !Array.isArray(participant)) {
    const lastName = (participant as { lastName?: string | null }).lastName;
    if (typeof lastName === "string" && lastName.trim()) {
      return lastName.trim();
    }
  }
  return candidate.displayName;
}

export function externalIdFromCandidate(candidate: Candidate): string | undefined {
  if (!candidate.metadata || typeof candidate.metadata !== "object" || Array.isArray(candidate.metadata)) {
    return undefined;
  }
  const externalId = (candidate.metadata as Record<string, unknown>).externalId;
  return typeof externalId === "string" ? externalId : undefined;
}
