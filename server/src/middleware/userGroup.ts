import { Context, Next } from "hono";
import { isUserGroupMember, isUserGroupAdmin } from "../utils/userGroup.js";

/**
 * Middleware to verify user is a member of the specified userGroup
 * Expects userGroupId in route params as :id
 */
export const requireUserGroupMember = async (c: Context, next: Next): Promise<Response | void> => {
  try {
    const user = c.get("user");
    const userGroupId = c.req.param("id");

    if (!userGroupId) {
      return c.json({ error: "UserGroup ID is required" }, 400);
    }

    const isMember = await isUserGroupMember(user.userId, userGroupId);

    if (!isMember) {
      return c.json({ error: "You are not a member of this userGroup" }, 403);
    }

    await next();
  } catch (error) {
    console.error("Error in requireUserGroupMember middleware:", error);
    return c.json({ error: "Failed to verify userGroup membership" }, 500);
  }
};

/**
 * Middleware to verify user is an ADMIN of the specified userGroup
 * Expects userGroupId in route params as :id
 */
export const requireUserGroupAdmin = async (c: Context, next: Next): Promise<Response | void> => {
  try {
    const user = c.get("user");
    const userGroupId = c.req.param("id");

    if (!userGroupId) {
      return c.json({ error: "UserGroup ID is required" }, 400);
    }

    const isAdmin = await isUserGroupAdmin(user.userId, userGroupId);

    if (!isAdmin) {
      return c.json({ error: "You must be an admin of this userGroup" }, 403);
    }

    await next();
  } catch (error) {
    console.error("Error in requireUserGroupAdmin middleware:", error);
    return c.json({ error: "Failed to verify userGroup admin status" }, 500);
  }
};

/**
 * Middleware to verify user can access a userGroup (member or public)
 * This is mainly for consistency but doesn't enforce restrictions
 * Expects userGroupId in route params as :id
 */
export const requireUserGroupAccess = async (c: Context, next: Next): Promise<Response | void> => {
  try {
    const userGroupId = c.req.param("id");

    if (!userGroupId) {
      return c.json({ error: "UserGroup ID is required" }, 400);
    }

    // For now, this just validates the ID exists
    // Access control is handled at the route level
    await next();
  } catch (error) {
    console.error("Error in requireUserGroupAccess middleware:", error);
    return c.json({ error: "Failed to verify userGroup access" }, 500);
  }
};
