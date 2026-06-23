export function getRequestChainId(c: {
  req: { header: (n: string) => string | undefined };
}): number | null {
  const raw = c.req.header("x-cut-chain-id");
  if (!raw) return null;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? n : null;
}
