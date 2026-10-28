/**
 * Only allow same-origin relative redirects ("/path"), never "//evil.com" or
 * absolute URLs — prevents open-redirects via ?callbackUrl=.
 */
export function safeRedirectPath(value: string | null | undefined, fallback = "/"): string {
  if (!value) return fallback;
  try {
    // Accept absolute URLs only if they point at our own origin.
    const base = "http://internal.invalid";
    const url = new URL(value, base);
    const appOrigin = process.env.NEXT_PUBLIC_APP_URL ? new URL(process.env.NEXT_PUBLIC_APP_URL).origin : null;
    if (url.origin !== base && url.origin !== appOrigin) return fallback;
    const path = `${url.pathname}${url.search}${url.hash}`;
    return path.startsWith("/") && !path.startsWith("//") ? path : fallback;
  } catch {
    return fallback;
  }
}
