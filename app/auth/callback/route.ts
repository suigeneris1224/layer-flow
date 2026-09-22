import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logger } from "@/lib/observability/logger";

/**
 * Exchanges the one-time code from a confirmation or recovery email for a
 * session cookie, then forwards the user on.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const requestedNext = searchParams.get("next") ?? "/dashboard";

  // Open-redirect guard: only same-origin paths are honoured.
  const next =
    requestedNext.startsWith("/") && !requestedNext.startsWith("//")
      ? requestedNext
      : "/dashboard";

  // Carried into every /login?error=... redirect below so a failed
  // confirmation doesn't lose track of where the user was actually headed
  // (e.g. back to accept a pending invite) -- signInAction/signUpAction
  // (app/auth/actions.ts) both read this same `next` off the login form.
  // rememberPendingInviteIfAny (lib/auth/session.ts) is the more durable
  // fallback for when even this gets lost (tab closed, link never revisited).
  const nextParam = `&next=${encodeURIComponent(next)}`;

  if (!code) {
    // GoTrue redirects here with no `code` in two very different cases: a
    // genuinely malformed/truncated link, or a verification failure on its
    // own end (expired token, already-used token, or -- very commonly on
    // Gmail's Android app specifically -- a link-safety prescan "clicking"
    // the one-time confirmation link before the human taps it, burning its
    // single use). Those failures carry `error`/`error_code`/
    // `error_description` instead of `code`; without checking for them, both
    // cases produced the same misleading "link was incomplete" message, when
    // the accurate "expired or already used" one already exists one branch
    // below for exactly this.
    const authError = searchParams.get("error") ?? searchParams.get("error_code");
    if (authError) {
      logger.warn("auth confirmation link rejected by Supabase", {
        error: authError,
        description: searchParams.get("error_description"),
      });
      return NextResponse.redirect(`${origin}/login?error=invalid_link${nextParam}`);
    }
    return NextResponse.redirect(`${origin}/login?error=missing_code${nextParam}`);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    logger.warn("auth code exchange failed", { reason: error.message });
    return NextResponse.redirect(`${origin}/login?error=invalid_link${nextParam}`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
