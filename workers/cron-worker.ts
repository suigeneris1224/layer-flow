// The generated worker only exists after `opennextjs-cloudflare build` runs,
// so a fresh checkout has nothing to resolve here yet. The "expect an error"
// directive is deliberately not used here since whether this errors flips
// depending on build state, and that stricter directive fails typecheck the
// moment it stops seeing an error (i.e. right after a real build).
// @ts-ignore
import { default as handler } from "../.open-next/worker.js";

interface CronEnv {
  NEXT_PUBLIC_APP_URL: string;
  CRON_SECRET: string;
}

interface CronExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
}

/**
 * Custom Worker entry (see OpenNext's "Custom Worker" howto): re-exports the
 * generated Next.js `fetch` handler unchanged, and adds a `scheduled()`
 * handler for the daily subscription-email sweep -- Cloudflare's replacement
 * for vercel.json's cron declaration.
 *
 * The scheduled handler does nothing itself; it just calls the same route
 * Vercel Cron used to hit (`app/api/cron/subscription-emails/route.ts`),
 * carrying the same bearer secret. That route only ever cared about the
 * header, not who's calling it, so it needed zero changes for this move.
 *
 * The route is invoked through the Next.js handler directly rather than with
 * an outbound `fetch()` to this Worker's own public URL: a Worker's subrequest
 * to its own workers.dev hostname is not routed back into the Worker, and
 * came back as a 404 before ever reaching the route.
 */
export default {
  fetch: handler.fetch,

  async scheduled(_event: unknown, env: CronEnv, ctx: CronExecutionContext) {
    const path = "/api/cron/subscription-emails";
    const request = new Request(`${env.NEXT_PUBLIC_APP_URL}${path}`, {
      headers: { Authorization: `Bearer ${env.CRON_SECRET}` },
    });

    ctx.waitUntil(
      handler
        .fetch(request, env, ctx)
        .then(async (response: Response) => {
          if (!response.ok) {
            const body = (await response.text()).slice(0, 200);
            console.error(`subscription-emails cron failed: ${response.status} ${path} ${body}`);
          }
        })
        .catch((error: unknown) => {
          console.error(
            `subscription-emails cron threw: ${error instanceof Error ? error.message : String(error)}`
          );
        })
    );
  },
};
