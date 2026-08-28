/**
 * Structured logging behind a thin interface.
 *
 * Deliberately vendor-neutral: production observability should be a config
 * change, not a refactor. Point `reportError` at Sentry/Axiom/whatever by
 * implementing one function, and nothing else in the codebase moves.
 */

type Level = "debug" | "info" | "warn" | "error";

export type LogContext = Record<string, unknown>;

const isProduction = process.env.NODE_ENV === "production";
const isTest = process.env.NODE_ENV === "test";

/** Never let a secret or a farmer's phone number ride along into a log. */
const REDACTED_KEYS = new Set([
  "password",
  "token",
  "access_token",
  "refresh_token",
  "authorization",
  "apikey",
  "service_role_key",
  "phone",
  "email",
]);

function redact(context: LogContext): LogContext {
  const safe: LogContext = {};
  for (const [key, value] of Object.entries(context)) {
    safe[key] = REDACTED_KEYS.has(key.toLowerCase()) ? "[redacted]" : value;
  }
  return safe;
}

function emit(level: Level, message: string, context?: LogContext) {
  if (isTest) return;

  const payload = {
    level,
    message,
    ...(context ? redact(context) : {}),
    timestamp: new Date().toISOString(),
  };

  if (isProduction) {
    // One JSON line per event -- Vercel's log drains parse this directly.
    const line = JSON.stringify(payload);
    if (level === "error") console.error(line);
    else if (level === "warn") console.warn(line);
    else console.log(line);
    return;
  }

  const prefix = `[layerflow:${level}]`;
  if (level === "error") console.error(prefix, message, context ?? "");
  else if (level === "warn") console.warn(prefix, message, context ?? "");
  else if (level === "debug") console.debug(prefix, message, context ?? "");
  else console.info(prefix, message, context ?? "");
}

export const logger = {
  debug: (message: string, context?: LogContext) => emit("debug", message, context),
  info: (message: string, context?: LogContext) => emit("info", message, context),
  warn: (message: string, context?: LogContext) => emit("warn", message, context),
  error: (message: string, context?: LogContext) => emit("error", message, context),
};

/**
 * Hand an exception to the error tracker.
 *
 * Today it logs. Swap the body for your provider's capture call in one place
 * when you add one -- see docs/architecture.md.
 */
export function reportError(error: unknown, context?: LogContext) {
  logger.error(error instanceof Error ? error.message : String(error), {
    ...context,
    stack: error instanceof Error ? error.stack : undefined,
  });
}
