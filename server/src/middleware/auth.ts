import { Context, Next } from "hono";
import { getCookie } from "hono/cookie";
import jwt from "jsonwebtoken";

// Extend Hono's context to include user information
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

export const requireAuth = async (c: Context, next: Next): Promise<Response | void> => {
  try {
    // Check for token in Authorization header first
    let token: string | undefined;

    const authHeader = c.req.header("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }

    // If no token in header, check for cookie
    if (!token) {
      token = getCookie(c, "auth");
    }

    if (!token) {
      return c.json({ error: "No token provided" }, 401);
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "temporary-secret-key") as {
        userId: string;
        address: string;
        chainId: number;
        userType: string;
      };

      // Debug logging for production issues
      console.log("JWT Decoded:", {
        userId: decoded.userId,
        address: decoded.address,
        chainId: decoded.chainId,
        userType: decoded.userType,
        hasAddress: !!decoded.address,
        hasChainId: decoded.chainId !== undefined,
      });

      // Add user information to context
      c.set("user", {
        userId: decoded.userId,
        address: decoded.address,
        chainId: decoded.chainId,
        userType: decoded.userType,
      });

      await next();
    } catch (error) {
      return c.json({ error: "Invalid token" }, 401);
    }
  } catch (error) {
    console.error("Auth middleware error:", error);
    return c.json({ error: "Authentication failed" }, 500);
  }
};
