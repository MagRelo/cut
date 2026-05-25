const DEFAULT_APP_URL = "https://playthecut.com";

export function getAppPublicUrl(): string {
  const raw = process.env.APP_PUBLIC_URL?.trim() || process.env.PUBLIC_APP_URL?.trim();
  return (raw || DEFAULT_APP_URL).replace(/\/$/, "");
}

export function appPath(path: string): string {
  const base = getAppPublicUrl();
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}
