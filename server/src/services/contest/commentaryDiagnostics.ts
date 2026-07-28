export interface ContestCommentaryDiagnostics {
  eventExternalId: string;
  contestStatus: string;
  entryCount: number;
  fieldCount: number;
  pickRatesLocked: boolean;
  calibration: {
    eventParticipantCount: number;
    holeSampleCount: number;
  };
  warnings: string[];
  scoreDrift: Array<{
    entryId: string;
    persisted: number;
    recomputed: number;
  }>;
}
