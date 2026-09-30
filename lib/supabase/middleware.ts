import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/types/database";
import { publicEnv } from "@/lib/config/env";
import { ALERT_SYNC_COOKIE, REMEMBER_ME_COOKIE } from "@/lib/supabase/cookies";

/**
 * Raw cookie name, not imported from lib/auth/session.ts -- that module pulls
 * in next/headers (cookies()/headers()), which isn't usable in middleware.
 * Must match ACTIVE_FARM_COOKIE there.
 */
const ACTIVE_FARM_COOKIE_NAME = "lf_active_farm";

/**
 * How long `syncFarmAlerts` (lib/data/dashboard.ts) stays "done" for the
 * active farm before app/(app)/layout.tsx is told to run it again. Short
 * enough that a badge update after recording something stays close to
 * instant; long enough to skip the expensive 9-query alert sync on the
 * rapid back-to-back navigation this exists to help.
 */
const ALERT_SYNC_STALE_MS = 60_000;

/** Routes reachable without a session. Everything else requires login. */
const PUBLIC_PATHS = [
  "/",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/pricing",
  "/how-it-works",
  "/features",
  "/faq",
  "/docs",
  "/about",
  "/contact",
  "/privacy",
  "/terms",
  // Crawler-facing metadata routes (app/robots.ts, app/sitemap.ts) -- an
  // anonymous request to either was being redirected to /login before this,
  // which meant no crawler could ever actually read either file.
  "/robots.txt",
  "/sitemap.xml",
  "/auth/callback",
  "/auth/confirm",
  // An invitee may have no account yet, so the landing page has to be
  // reachable signed out. It exposes only farm name, role and expiry.
  "/invite",
  // Vercel Cron calls this with no user session at all -- it authenticates
  // itself via a bearer CRON_SECRET inside the route handler
  // (app/api/cron/subscription-emails/route.ts), not via login. Without this
  // exemption every invocation would get redirected to /login before the
  // handler ever ran.
  "/api/cron",
  // Third-party webhooks (app/api/webhooks/brevo/route.ts) carry no Supabase
  // session either -- they authenticate via their own shared secret inside
  // the handler. Same reasoning as /api/cron above; without this exemption
  // every delivery would get redirected to /login before the handler, and
  // its secret check, ever ran.
  "/api/webhooks",
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );
}

/**
 * Paths where calling getUser() buys nothing -- building a Supabase client
 * for the auth check is pure CPU cost, which matters on Workers' capped
 * per-request CPU time. Covers routes that authenticate by shared secret or
 * need no auth at all (/api/cron, /api/webhooks, /robots.txt, /sitemap.xml),
 * plus static marketing pages that never read session state. /login/
 * /signup stay excluded since they still need the redirect-if-logged-in
 * check.
 */
const NO_SESSION_CHECK_PATHS = [
  "/",
  "/api/cron",
  "/api/webhooks",
  "/robots.txt",
  "/sitemap.xml",
  "/pricing",
  "/features",
  "/how-it-works",
  "/faq",
  "/docs",
  "/about",
  "/contact",
  "/privacy",
  "/terms",
];

function needsNoSessionCheck(pathname: string): boolean {
  return NO_SESSION_CHECK_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );
}

/**
 * Refreshes the Supabase session cookie and bounces anonymous users away from
 * app routes.
 *
 * This is a UX layer, not the security boundary -- RLS is. A redirect here
 * saves a wasted render; it is not what stops a user reading another farm's
 * data.
 */
export async function updateSession(request: NextRequest) {
  if (needsNoSessionCheck(request.nextUrl.pathname)) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  // "Remember me" was unchecked at sign-in. Without this, refreshing the
  // token here -- which happens on effectively every request -- would
  // rewrite the auth cookie with Supabase's default (persistent) options and
  // silently undo that choice on the very next navigation.
  const sessionOnly = request.cookies.get(REMEMBER_ME_COOKIE)?.value === "1";

  const supabase = createServerClient<Database>(
    publicEnv.supabaseUrl,
    publicEnv.supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            const finalOptions = { ...options };
            if (sessionOnly) {
              delete finalOptions.maxAge;
              delete finalOptions.expires;
            }
            response.cookies.set(name, value, finalOptions);
          }
        },
      },
    }
  );

  // getUser() revalidates the token with Supabase. Do not swap this for
  // getSession(), which trusts whatever the cookie claims.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (!user && !isPublicPath(pathname)) {
    const redirect = request.nextUrl.clone();
    redirect.pathname = "/login";
    redirect.searchParams.set("next", pathname);
    return NextResponse.redirect(redirect);
  }

  if (user && (pathname === "/login" || pathname === "/signup")) {
    const redirect = request.nextUrl.clone();
    redirect.pathname = "/dashboard";
    redirect.search = "";
    return NextResponse.redirect(redirect);
  }

  if (!user) return response;

  /*
   * Forward the already-verified user to the render step, so
   * lib/auth/session.ts's getSessionUser() doesn't have to call getUser()
   * a second time -- that's a second JWT-revalidation round trip to Supabase
   * for a check this one already did. Must use the `request: { headers }`
   * form (not response.headers.set, which only reaches the browser -- see
   * middleware.ts's x-nonce comment) so it's actually visible to headers()
   * in a Server Component. A client can't spoof this: requestHeaders.set()
   * unconditionally overwrites anything sent under this name before the
   * render step ever sees it.
   */
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(
    "x-lf-user",
    JSON.stringify({
      id: user.id,
      email: user.email ?? "",
      fullName: (user.user_metadata?.full_name as string | undefined) ?? "",
    })
  );

  /*
   * Tell app/(app)/layout.tsx whether its alert sync is actually due.
   * ALERT_SYNC_COOKIE is "<farmId>:<epochMs>" of the last time it ran for the
   * active farm; stale (missing, expired, or a different farm than the one
   * lf_active_farm now names -- e.g. switchFarmAction just ran) means it's
   * due again, and this request is the one that both tells the layout to run
   * it and refreshes the marker for next time.
   */
  const activeFarmId = request.cookies.get(ACTIVE_FARM_COOKIE_NAME)?.value ?? "";
  const [markerFarmId, markerAt] = (request.cookies.get(ALERT_SYNC_COOKIE)?.value ?? "").split(":");
  const alertSyncDue =
    markerFarmId !== activeFarmId ||
    !markerAt ||
    Date.now() - Number(markerAt) > ALERT_SYNC_STALE_MS;

  if (alertSyncDue) {
    requestHeaders.set("x-lf-sync-alerts", "1");
  }

  const finalResponse = NextResponse.next({ request: { headers: requestHeaders } });
  // Carry over any cookies the Supabase client queued onto `response` above
  // (its token-refresh path) -- rebuilding the response for the header must
  // not silently drop a session-cookie refresh.
  for (const cookie of response.cookies.getAll()) {
    finalResponse.cookies.set(cookie);
  }

  if (alertSyncDue && activeFarmId) {
    finalResponse.cookies.set(ALERT_SYNC_COOKIE, `${activeFarmId}:${Date.now()}`, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      // Cleanup only -- ALERT_SYNC_STALE_MS above is what actually governs
      // freshness, not this expiry.
      maxAge: 60 * 10,
    });
  }

  return finalResponse;
}
