/** Prefer `isPrimary` wallet for a chain; stable tie-break by publicKey. */
export function pickWalletForChain<
  T extends { publicKey: string; chainId: number; isPrimary: boolean },
>(wallets: T[], chainId: number): T | null {
  const forChain = wallets.filter((w) => w.chainId === chainId);
  if (forChain.length === 0) return null;
  forChain.sort((a, b) => {
    const primaryDiff = Number(b.isPrimary) - Number(a.isPrimary);
    if (primaryDiff !== 0) return primaryDiff;
    return a.publicKey.localeCompare(b.publicKey);
  });
  return forChain[0]!;
}

export function pickWalletPublicKeyForChain(
  wallets: Array<{ publicKey: string; chainId: number; isPrimary: boolean }>,
  chainId: number,
): string | null {
  return pickWalletForChain(wallets, chainId)?.publicKey.toLowerCase() ?? null;
}
