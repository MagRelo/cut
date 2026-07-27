/**
 * Single-flight lock so overview + feed worker never run two Cursor prompts at once.
 */
let llmBusy = false;
const waiters: Array<() => void> = [];

export function isCommentaryLlmBusy(): boolean {
  return llmBusy;
}

export async function withCommentaryLlmLock<T>(
  task: () => Promise<T>,
): Promise<T> {
  while (llmBusy) {
    await new Promise<void>((resolve) => {
      waiters.push(resolve);
    });
  }
  llmBusy = true;
  try {
    return await task();
  } finally {
    llmBusy = false;
    const next = waiters.shift();
    if (next) next();
  }
}

/** Try to acquire without waiting. Returns null if busy. */
export async function tryWithCommentaryLlmLock<T>(
  task: () => Promise<T>,
): Promise<T | null> {
  if (llmBusy) return null;
  return withCommentaryLlmLock(task);
}
