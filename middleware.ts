import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { buildContentSecurityPolicy } from "@/lib/security/csp";

export async function middleware(request: NextRequest) {
  // A fresh nonce per request, not per build -- see lib/security/csp.ts for
  // why this can't live in next.config.ts's static headers() instead.
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = buildContentSecurityPolicy(nonce);

  // updateSession() may return a redirect or a plain "continue" response;
  // either way, the CSP (with this request's nonce) needs to ride along on
  // whatever it hands back. x-nonce is forwarded too, matching Next.js's
  // documented CSP-nonce recipe, for any future Server Component that wants
  // to read it via headers() -- nothing does today (no custom inline
  // <script>/dangerouslySetInnerHTML exists anywhere in this codebase), so
  // Next's own automatic nonce detection on its hydration scripts is all
  // this needs to work.
  const response = await updateSession(request);
  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("x-nonce", nonce);
  return response;
}

export const config = {
  matcher: [
    /*
     * Everything except static assets and the PWA shell files, which must stay
     * reachable offline without a session check.
     */
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
