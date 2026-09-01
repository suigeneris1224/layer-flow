import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/types/database";
import { publicEnv } from "@/lib/config/env";
import { REMEMBER_ME_COOKIE } from "@/lib/supabase/cookies";

/** Routes reachable without a session. Everything else requires login. */
const PUBLIC_PATHS = [
  "/",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/pricing",
  "/about",
  "/contact",
  "/privacy",
  "/terms",
  "/auth/callback",
  "/auth/confirm",
  // An invitee may have no account yet, so the landing page has to be
  // reachable signed out. It exposes only farm name, role and expiry.
  "/invite",
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
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

  return response;
}
