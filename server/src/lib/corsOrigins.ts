const DEV_DEFAULT_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:3000",
];

function isLocalhostOrigin(origin: string): boolean {
  try {
    const hostname = new URL(origin).hostname;
    return hostname === "localhost" || hostname === "127.0.0.1";
  } catch {
    return /localhost|127\.0\.0\.1/i.test(origin);
  }
}

/**
 * CORS allowlist. Production fails closed: ALLOWED_ORIGINS is required and
 * must not include localhost / 127.0.0.1.
 */
export function resolveAllowedOrigins(env: NodeJS.ProcessEnv = process.env): string[] {
  const isProd = env.NODE_ENV === "production";
  const raw = env.ALLOWED_ORIGINS?.trim();

  if (!raw) {
    if (isProd) {
      throw new Error("Missing required environment variable: ALLOWED_ORIGINS");
    }
    return [...DEV_DEFAULT_ORIGINS];
  }

  const origins = raw
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (origins.length === 0) {
    throw new Error("ALLOWED_ORIGINS is empty");
  }

  if (isProd) {
    const localhost = origins.filter(isLocalhostOrigin);
    if (localhost.length > 0) {
      throw new Error(
        `ALLOWED_ORIGINS must not include localhost in production: ${localhost.join(", ")}`,
      );
    }
  }

  return origins;
}

const PAYMASTER_PATH = "/api/paymaster";

/** Local Vite origins. Production `ALLOWED_ORIGINS` still cannot list these. */
const PAYMASTER_LOCAL_ORIGINS = ["http://localhost:5173", "http://127.0.0.1:5173"];

/**
 * Origin echoed as `Access-Control-Allow-Origin`, or null when the browser
 * must not read the response. Localhost is limited to the paymaster route.
 */
export function resolveRequestOrigin(
  origin: string,
  path: string,
  env: NodeJS.ProcessEnv = process.env,
): string | null {
  if (resolveAllowedOrigins(env).includes(origin)) return origin;
  if (path === PAYMASTER_PATH && PAYMASTER_LOCAL_ORIGINS.includes(origin)) return origin;
  return null;
}
