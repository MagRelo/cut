import { Context, Next } from "hono";
import { getPrivyClient } from "../lib/privyClient.js";
import {
  ensureCutUserFromPrivy,
  PrivyWalletIdentityConflictError,
} from "../lib/privyUserProvisioning.js";

declare module "hono" {
  interface ContextVariableMap {
    user: {
      userId: string;
      address: string;
      chainId: number;
      userType: string;
    };
  }
}

function parsePreferredChainId(c: Context): number | undefined {
  const raw = c.req.header("x-cut-chain-id");
  if (!raw) return undefined;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? n : undefined;
}

export const requireAuth = async (c: Context, next: Next): Promise<Response | void> => {
  try {
    const authHeader = c.req.header("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return c.json({ error: "No token provided" }, 401);
    }
    const token = authHeader.split(" ")[1];
    if (!token) {
      return c.json({ error: "No token provided" }, 401);
    }

    const preferredChainId = parsePreferredChainId(c);

    const privy = getPrivyClient();
    const access = await privy.utils().auth().verifyAccessToken(token);
    const privyUser = await privy.users()._get(access.user_id);
    const resolved = await ensureCutUserFromPrivy(privyUser, preferredChainId);

    c.set("user", {
      userId: resolved.userId,
      address: resolved.address,
      chainId: resolved.chainId,
      userType: resolved.userType,
    });

    await next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    if (error instanceof PrivyWalletIdentityConflictError) {
      return c.json({ error: error.message }, 403);
    }
    return c.json({ error: "Invalid or expired token" }, 401);
  }
};
