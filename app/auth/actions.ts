"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import type { Route } from "next";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseServerClient, REMEMBER_ME_COOKIE } from "@/lib/supabase/server";
import { publicEnv } from "@/lib/config/env";
import { describeAuthError, describeUnknownError, failure, type ActionFailure } from "@/lib/errors";
import { logger } from "@/lib/observability/logger";

/** Shape returned to every auth form. `undefined` means "not submitted yet". */
export type AuthState = ActionFailure | { ok: true; message?: string } | undefined;

const emailField = z.string().trim().min(1, "Enter your email").email("Enter a valid email");

// 8 chars is the floor Supabase enforces; we state it up front rather than
// letting the farmer discover it from a server round trip.
const passwordField = z.string().min(8, "Use at least 8 characters");

const signupSchema = z.object({
  fullName: z.string().trim().min(1, "Enter your name").max(120),
  email: emailField,
  password: passwordField,
});

const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, "Enter your password"),
});

function fieldErrorsFrom(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    errors[key] ??= issue.message;
  }
  return errors;
}

/**
 * Keep a `?next=` inside the app.
 *
 * A crafted value must never bounce somebody to another origin carrying a
 * freshly minted session, so anything that is not a plain relative path falls
 * back to the dashboard. The cast is safe because of that check; typedRoutes
 * cannot know a runtime-validated string is in-app.
 */
function safeRedirect(next: string): Route {
  return (next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard") as Route;
}

export async function signUpAction(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const parsed = signupSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return failure("Please check the form below.", fieldErrorsFrom(parsed.error));
  }

  const next = String(formData.get("next") ?? "");

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        data: { full_name: parsed.data.fullName },
        emailRedirectTo: `${publicEnv.appUrl}/auth/callback`,
      },
    });

    if (error) return describeAuthError(error.message);
  } catch (error) {
    return describeUnknownError(error, "signUpAction");
  }

  /*
   * With local email confirmation off the user already has a session. Where
   * they land depends on why they signed up: somebody following an invitation
   * is joining an existing farm and must NOT be sent to onboarding, which
   * would have them create a second one. Everyone else starts onboarding.
   */
  redirect(next ? safeRedirect(next) : "/onboarding");
}

export async function signInAction(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return failure("Please check the form below.", fieldErrorsFrom(parsed.error));
  }

  const next = String(formData.get("next") ?? "/dashboard");
  const rememberMe = formData.get("rememberMe") === "on";

  try {
    const supabase = await createSupabaseServerClient({ persistSession: rememberMe });
    const { error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });

    if (error) return describeAuthError(error.message);
  } catch (error) {
    return describeUnknownError(error, "signInAction");
  }

  /*
   * Only this action knows the farmer's actual choice -- every other call to
   * createSupabaseServerClient() uses the default persistSession:true, so the
   * marker is set here explicitly rather than as a side effect of the
   * generic client, which would otherwise clear or set it on unrelated
   * requests.
   */
  const cookieStore = await cookies();
  if (rememberMe) {
    cookieStore.delete(REMEMBER_ME_COOKIE);
  } else {
    cookieStore.set(REMEMBER_ME_COOKIE, "1");
  }

  redirect(safeRedirect(next));
}

export async function signOutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  (await cookies()).delete(REMEMBER_ME_COOKIE);
  revalidatePath("/", "layout");
  redirect("/login");
}

export async function requestPasswordResetAction(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const parsed = z.object({ email: emailField }).safeParse({
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return failure("Please check the form below.", fieldErrorsFrom(parsed.error));
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: `${publicEnv.appUrl}/auth/callback?next=/reset-password`,
    });

    // Logged, not shown. Telling the visitor whether an email exists would
    // turn this form into an account-enumeration oracle.
    if (error) logger.warn("password reset request failed", { reason: error.message });
  } catch (error) {
    logger.warn("password reset threw", { context: "requestPasswordResetAction" });
  }

  return {
    ok: true,
    message:
      "If an account exists for that email, we've sent a link to reset the password.",
  };
}

export async function updatePasswordAction(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const parsed = z
    .object({
      password: passwordField,
      confirmPassword: z.string(),
    })
    .refine((value) => value.password === value.confirmPassword, {
      message: "Both passwords must match",
      path: ["confirmPassword"],
    })
    .safeParse({
      password: formData.get("password"),
      confirmPassword: formData.get("confirmPassword"),
    });

  if (!parsed.success) {
    return failure("Please check the form below.", fieldErrorsFrom(parsed.error));
  }

  try {
    const supabase = await createSupabaseServerClient();

    // The recovery link established a session; without one this is an
    // unauthenticated password change attempt.
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return failure("Your reset link has expired. Please request a new one.");
    }

    const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
    if (error) return describeAuthError(error.message);
  } catch (error) {
    return describeUnknownError(error, "updatePasswordAction");
  }

  redirect("/dashboard");
}
