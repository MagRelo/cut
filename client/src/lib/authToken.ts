type TokenFn = () => Promise<string | null>;
type ChainFn = () => number | undefined;

let getToken: TokenFn | null = null;
let getChainId: ChainFn | null = null;

export function registerAuthTokenHandlers(tokenFn: TokenFn, chainIdFn?: ChainFn): void {
  getToken = tokenFn;
  getChainId = chainIdFn ?? null;
}

export async function getBearerForApi(): Promise<string | null> {
  return getToken ? await getToken() : null;
}

export function getOptionalChainIdForApi(): number | undefined {
  return getChainId ? getChainId() : undefined;
}
