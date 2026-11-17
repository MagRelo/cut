const URL_OR_SECRET = /https?:\/\/|apikey=|api_key=|api-key=|pimlico\.io/i;

function errorText(error: unknown): string {
  if (error == null) return "";
  if (typeof error === "string") return error;
  if (error instanceof Error) {
    const extra = [
      "details" in error ? String((error as { details?: unknown }).details ?? "") : "",
      "shortMessage" in error
        ? String((error as { shortMessage?: unknown }).shortMessage ?? "")
        : "",
      "url" in error ? String((error as { url?: unknown }).url ?? "") : "",
      "metaMessages" in error && Array.isArray((error as { metaMessages?: unknown }).metaMessages)
        ? (error as { metaMessages: unknown[] }).metaMessages.map((line) => String(line ?? "")).join("\n")
        : "",
    ].join("\n");
    const cause =
      "cause" in error && error.cause !== undefined ? `\n${errorText(error.cause)}` : "";
    return `${error.message}\n${extra}${cause}`;
  }
  if (typeof error === "object") {
    const record = error as {
      message?: unknown;
      details?: unknown;
      shortMessage?: unknown;
      url?: unknown;
    };
    return [record.message, record.details, record.shortMessage, record.url]
      .map((value) => String(value ?? ""))
      .join("\n");
  }
  return String(error);
}

/** Drop RPC URLs and query credentials before anything is written to a log. */
export function redactSecrets(text: string): string {
  return text
    .replace(/https?:\/\/[^\s"'<>]+/gi, "[redacted-url]")
    .replace(/\b((?:api[_-]?key|apikey)=)[^\s&"'<>]+/gi, "$1[redacted]");
}

/**
 * Bundler and paymaster clients put the RPC URL, API key included, on the Error.
 * Callers get the fallback. The key never leaves the process.
 */
export function clientSafeErrorMessage(error: unknown, fallback: string): string {
  const raw = errorText(error);
  if (URL_OR_SECRET.test(raw)) {
    console.error(`${fallback}: ${redactSecrets(raw)}`);
    return fallback;
  }
  if (typeof error === "string" && error.trim()) return error;
  if (error instanceof Error && error.message.trim()) return error.message;
  return fallback;
}
