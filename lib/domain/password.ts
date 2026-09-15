/**
 * Password strength.
 *
 * Length + character-type variety, not a dictionary attack -- a zxcvbn-style
 * scorer would need a wordlist payload this app doesn't want to ship (see
 * components/charts/lazy.tsx's whole reason for existing). Good enough to
 * reliably catch "long but trivial" (e.g. "aaaaaaaa") without a dependency.
 *
 * Pure module: no React, no I/O, so it's directly testable and safe to use
 * from both a client component (the live meter) and a server action (the
 * enforced minimum) without pulling either world into the other.
 */

export const PASSWORD_MIN_LENGTH = 8;
/** A product choice, not a technical ceiling -- see securePasswordField in lib/validation/schemas.ts. */
export const PASSWORD_MAX_LENGTH = 15;

export type PasswordStrengthLabel = "Weak" | "Fair" | "Good" | "Strong";

export interface PasswordStrength {
  /** Index into the 4 levels below -- also drives the meter's fill. */
  score: 0 | 1 | 2 | 3;
  label: PasswordStrengthLabel;
}

const LABELS: readonly PasswordStrengthLabel[] = ["Weak", "Fair", "Good", "Strong"];

/**
 * Up to 6 points: length crosses 8/11/14 (all reachable under the 15-char
 * cap -- "Strong" must stay achievable within the field's own max length, or
 * the meter has a top tier nobody can ever type their way into), plus mixed
 * case, a digit, and a symbol each worth one. Bucketed into 4 levels rather
 * than shown as a raw count, since "4 out of 6" means nothing to a farmer
 * filling in a form.
 */
export function passwordStrength(password: string): PasswordStrength {
  let points = 0;

  if (password.length >= PASSWORD_MIN_LENGTH) points += 1;
  if (password.length >= 11) points += 1;
  if (password.length >= 14) points += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) points += 1;
  if (/\d/.test(password)) points += 1;
  if (/[^A-Za-z0-9]/.test(password)) points += 1;

  const score = (points <= 1 ? 0 : points <= 3 ? 1 : points <= 5 ? 2 : 3) as PasswordStrength["score"];
  return { score, label: LABELS[score] };
}

/** The bar `securePasswordField` actually enforces: long enough, and not "Weak". */
export function isPasswordSecure(password: string): boolean {
  return password.length >= PASSWORD_MIN_LENGTH && passwordStrength(password).score >= 1;
}
