function errorText(error: unknown): string {
  if (error == null) return "";
  if (typeof error === "string") return error;
  if (error instanceof Error) {
    const extra =
      typeof error === "object"
        ? [
            "details" in error ? String((error as { details?: unknown }).details ?? "") : "",
            "shortMessage" in error
              ? String((error as { shortMessage?: unknown }).shortMessage ?? "")
              : "",
          ].join("\n")
        : "";
    const cause =
      "cause" in error && error.cause !== undefined ? `\n${errorText(error.cause)}` : "";
    return `${error.message}\n${extra}${cause}`;
  }
  if (typeof error === "object") {
    const record = error as { message?: unknown; details?: unknown; shortMessage?: unknown };
    return [record.message, record.details, record.shortMessage].map((v) => String(v ?? "")).join("\n");
  }
  return String(error);
}

/** Coinbase / viem historical eth_call before the RPC has indexed the block. */
export function isRpcBlockNotFoundError(error: unknown): boolean {
  const haystack = errorText(error).toLowerCase();
  return haystack.includes("block not found") || haystack.includes("requested resource not found");
}
