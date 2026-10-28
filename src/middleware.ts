import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "./auth.config";

const { auth } = NextAuth(authConfig);

function contentSecurityPolicy(nonce: string): string {
  const isDev = process.env.NODE_ENV === "development";
  return [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    // Recharts and Radix set inline style attributes.
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: blob: https://lh3.googleusercontent.com`,
    `font-src 'self' data:`,
    `connect-src 'self'${isDev ? " ws:" : ""}`,
    `frame-ancestors 'none'`,
    `base-uri 'self'`,
    `object-src 'none'`,
    // Google OAuth sign-in redirects after a form POST.
    `form-action 'self' https://accounts.google.com`,
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

/**
 * 1. Route protection (via `authorized` in auth.config.ts) — edge-fast JWT check.
 *    Fine-grained org/role checks happen server-side in every page and action.
 * 2. Per-request CSP nonce, read by the root layout via the `x-nonce` header.
 */
export default auth((req) => {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = contentSecurityPolicy(nonce);

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
});

export const config = {
  // Skip API routes (ingestion has its own auth + CORS), Next internals and static files.
  matcher: ["/((?!api/|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml)$).*)"],
};
