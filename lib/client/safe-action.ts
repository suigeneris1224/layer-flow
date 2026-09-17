import type { ActionFailure } from "@/lib/errors";

/**
 * Guards a Server Action call against a network-level failure -- no
 * connection, the connection drops mid-request, or anything else that throws
 * before the action ever gets a chance to return its own `{ ok: false, ... }`.
 *
 * Without this, calling a Server Action while offline throws an uncaught
 * fetch error on the client, which crashes the whole page ("Application
 * error: a client-side exception has occurred") instead of showing a message
 * a farmer can act on. The fallback is shaped as a full `ActionFailure` (not
 * just `{ ok, error }`) so every form's existing
 * `if (!result.ok) { ...; setFieldErrors(result.fieldErrors ?? {}); }`
 * handling keeps compiling and working unchanged.
 */
export async function safeAction<T extends { ok: boolean }>(
  call: () => Promise<T>
): Promise<T | ActionFailure> {
  try {
    return await call();
  } catch {
    return {
      ok: false,
      error: "Something went wrong sending that. Check your connection and try again.",
    };
  }
}
