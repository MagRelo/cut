import { AsyncLocalStorage } from "node:async_hooks";
import type { SideBetDataGolfSnapshot } from "../../services/sideBets/fetchSideBetDataGolfSnapshot.js";

const snapshotStorage = new AsyncLocalStorage<SideBetDataGolfSnapshot>();

export function getSharedGolfPropBetSnapshot(): SideBetDataGolfSnapshot | undefined {
  return snapshotStorage.getStore();
}

export function runWithGolfPropBetSnapshot<T>(
  snapshot: SideBetDataGolfSnapshot | undefined,
  fn: () => Promise<T>,
): Promise<T> {
  if (!snapshot) {
    return fn();
  }
  return snapshotStorage.run(snapshot, fn);
}
