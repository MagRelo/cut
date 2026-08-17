import fs from "node:fs";
import path from "node:path";

const PUBLIC_DIR_NAME = "public";
const MAX_URI_DECODE_PASSES = 5;

export const REJECTED_STATIC_PATH = path.join("__cut_static_rejected__", "x");

export type ResolvePublicStaticOptions = {
  /** Absolute or cwd-relative directory to treat as the public root. Defaults to `<cwd>/public`. */
  publicRoot?: string;
};

function fullyDecodeUriPath(input: string): string | null {
  let current = input;
  for (let i = 0; i < MAX_URI_DECODE_PASSES; i++) {
    let next: string;
    try {
      next = decodeURIComponent(current);
    } catch {
      return null;
    }
    if (next === current) {
      return current;
    }
    current = next;
  }
  return null;
}

function isInsideRoot(resolvedPath: string, resolvedRoot: string): boolean {
  const relative = path.relative(resolvedRoot, resolvedPath);
  return relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative);
}

export function resolvePublicRoot(options?: ResolvePublicStaticOptions): string | null {
  const root = path.resolve(options?.publicRoot ?? path.join(process.cwd(), PUBLIC_DIR_NAME));
  try {
    const stats = fs.statSync(root);
    if (!stats.isDirectory()) {
      return null;
    }
    return fs.realpathSync.native(root);
  } catch {
    return null;
  }
}

/**
 * Map a request path to a regular file that realpath-resolves inside `public/`.
 * Rejects `..`, NUL, backslashes, directories, and any segment that starts with `.`.
 */
export function resolvePublicStaticFile(
  requestPath: string,
  options?: ResolvePublicStaticOptions,
): string | null {
  const decoded = fullyDecodeUriPath(requestPath);
  if (decoded == null || decoded.includes("\0") || decoded.includes("\\")) {
    return null;
  }

  const relative = decoded.replace(/^\/+/, "");
  const segments = relative.split("/").filter((segment) => segment !== "" && segment !== ".");
  if (segments.length === 0) {
    return null;
  }
  if (segments.some((segment) => segment === ".." || segment.startsWith("."))) {
    return null;
  }

  const publicRoot = resolvePublicRoot(options);
  if (!publicRoot) {
    return null;
  }

  const candidate = path.resolve(publicRoot, ...segments);
  if (!isInsideRoot(candidate, publicRoot)) {
    return null;
  }

  let resolved: string;
  try {
    resolved = fs.realpathSync.native(candidate);
  } catch {
    return null;
  }

  if (!isInsideRoot(resolved, publicRoot)) {
    return null;
  }

  try {
    const stats = fs.statSync(resolved);
    if (!stats.isFile()) {
      return null;
    }
  } catch {
    return null;
  }

  return resolved;
}

/**
 * Relative path under `public/` for `@hono/node-server` `rewriteRequestPath`.
 * Unsafe or missing files map to {@link REJECTED_STATIC_PATH} so the middleware cannot join onto cwd.
 */
export function rewritePublicStaticRequestPath(
  requestPath: string,
  options?: ResolvePublicStaticOptions,
): string {
  const resolved = resolvePublicStaticFile(requestPath, options);
  if (!resolved) {
    return REJECTED_STATIC_PATH;
  }
  const publicRoot = resolvePublicRoot(options);
  if (!publicRoot) {
    return REJECTED_STATIC_PATH;
  }
  const relative = path.relative(publicRoot, resolved);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    return REJECTED_STATIC_PATH;
  }
  return relative;
}
