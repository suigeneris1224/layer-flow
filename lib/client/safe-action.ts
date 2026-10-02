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
 *
 * A dropped/weak connection doesn't always throw, though -- `navigator.onLine`
 * only reports whether a network interface is connected, not whether it can
 * actually reach the server, so a request can go out and just never come
 * back. Without a timeout, `call()` never settles, the caller's `pending`
 * state never clears, and the form looks stuck forever with no error and no
 * way to retry short of reloading the whole app. Racing it against a timeout
 * guarantees this always resolves one way or another.
 */
const TIMEOUT_MS = 20_000;

export async function safeAction<T extends { ok: boolean }>(
  call: () => Promise<T>
): Promise<T | ActionFailure> {
  try {
    return await Promise.race([
      call(),
      new Promise<ActionFailure>((resolve) => {
        setTimeout(
          () =>
            resolve({
              ok: false,
              error: "Taking too long. Check your connection and try again.",
            }),
          TIMEOUT_MS
        );
      }),
    ]);
  } catch {
    return {
      ok: false,
      error: "Something went wrong sending that. Check your connection and try again.",
    };
  }
}
