export interface SideBetBatchOperationResult {
  success: boolean;
  marketId: string;
  error?: string;
}

export interface SideBetBatchOperationSummary {
  total: number;
  succeeded: number;
  failed: number;
  results: SideBetBatchOperationResult[];
}

export function summarizeSideBetBatch(results: SideBetBatchOperationResult[]): SideBetBatchOperationSummary {
  const succeeded = results.filter((r) => r.success).length;
  return {
    total: results.length,
    succeeded,
    failed: results.length - succeeded,
    results,
  };
}
