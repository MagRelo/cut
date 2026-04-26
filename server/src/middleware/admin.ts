import { Context, Next } from "hono";

const STAFF_USER_TYPES = new Set<string>(["ADMIN", "SUPER_ADMIN"]);

export function isStaffUserType(userType: string): boolean {
  return STAFF_USER_TYPES.has(userType);
}

/**
 * After `requireAuth` — allow only app staff (`ADMIN`, `SUPER_ADMIN`).
 */
export const requireAdmin = async (c: Context, next: Next): Promise<Response | void> => {
  const user = c.get("user");
  if (!isStaffUserType(user.userType)) {
    return c.json({ error: "Forbidden" }, 403);
  }
  await next();
};
