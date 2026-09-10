import "server-only";

import { publicEnv } from "@/lib/config/env";

/**
 * Layer Flow's transactional-email visual system.
 *
 * Every builder in lib/email/templates.ts composes its HTML through
 * `renderEmailHtml` below, so every email -- welcome, receipt, payment
 * confirmation, cancellation -- shares one header, hero, card, button and
 * footer language rather than each template inventing its own markup.
 *
 * Table-based and inline-styled throughout: Outlook's Word rendering engine
 * ignores flexbox/grid and most of a <style> block, so the layout has to
 * survive on tables + inline styles alone. The <style> block that does exist
 * is progressive enhancement (mobile padding, base resets) -- never
 * load-bearing.
 *
 * Icons are inline SVG line-glyphs (see ICONS below) inside a soft circular
 * badge, rather than a hosted image: this app has no image CDN for email
 * assets, and most mail clients block remote images by default until the
 * recipient opts in, which would leave a "real" illustration broken on first
 * open. Inline SVG needs no network request and renders crisp at any size --
 * with one real gap: Outlook desktop's Word rendering engine strips <svg>
 * entirely, so those readers see an empty badge rather than a broken image.
 * Gmail, Apple Mail and Outlook.com all render it fine. This is the same
 * tradeoff Stripe, Linear and Notion accept in their own transactional mail.
 */

export const EMAIL_COLORS = {
  // A blend of the brief's original forest green (#164F3B) and the app's own
  // --primary token (#11883D, see scripts/contrast.mjs): richer than the
  // brighter app green, warmer than the original's darker, more muted tone.
  primary: "#146C3C",
  deepGreen: "#0F5E36",
  medium: "#327258",
  pale: "#EEF6F1",
  light: "#DCEFDC",
  muted: "#496A62",
  bg: "#F3F6F4",
  white: "#FFFFFF",
  border: "#E1E8E3",
  text: "#12261D",
} as const;

const FONT_STACK =
  "-apple-system,BlinkMacSystemFont,'Inter','Segoe UI',Helvetica,Arial,sans-serif";

/**
 * The icon set. One cohesive line-icon language: 24x24 viewBox, ~1.75 stroke,
 * round caps/joins, no fill (dots that need a fill say so explicitly). Keep
 * new icons to a couple of primitives each -- this is a small glyph set, not
 * an illustration.
 */
const ICONS: Record<string, string> = {
  egg: `<path d="M12 4c-3.2 4-5 8.3-5 11.2C7 18.8 9.2 21 12 21s5-2.2 5-5.8C17 12.3 15.2 8 12 4z"/>`,
  "check-circle": `<circle cx="12" cy="12" r="9"/><path d="M8 12.3l2.5 2.5L16 9"/>`,
  "alert-circle": `<circle cx="12" cy="12" r="9"/><line x1="12" y1="7.5" x2="12" y2="13"/><circle cx="12" cy="16.3" r="1" fill="currentColor" stroke="none"/>`,
  "alert-triangle": `<path d="M12 4.2L21 19H3L12 4.2z"/><line x1="12" y1="9.7" x2="12" y2="14.2"/><circle cx="12" cy="16.8" r="1" fill="currentColor" stroke="none"/>`,
  refresh: `<path d="M4 12a8 8 0 0114-5.3M20 4v5h-5"/><path d="M20 12a8 8 0 01-14 5.3M4 20v-5h5"/>`,
  box: `<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z"/><path d="M4 7.5l8 4.5 8-4.5"/><line x1="12" y1="12" x2="12" y2="21"/>`,
  card: `<rect x="3" y="6" width="18" height="13" rx="2.5"/><line x1="3" y1="10.3" x2="21" y2="10.3"/>`,
  calendar: `<rect x="4" y="5" width="16" height="16" rx="2.5"/><line x1="4" y1="10" x2="20" y2="10"/><line x1="8.5" y1="3" x2="8.5" y2="7"/><line x1="15.5" y1="3" x2="15.5" y2="7"/>`,
  receipt: `<path d="M6 3h12v17l-1.8-1.2-1.8 1.2-1.8-1.2-1.8 1.2-1.8-1.2-1.8 1.2V3z"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="9" y1="12.3" x2="15" y2="12.3"/>`,
  note: `<path d="M4 20l.9-3.8L15.5 5.6l2.9 2.9L7.8 19.1 4 20z"/><line x1="13.7" y1="7.4" x2="16.6" y2="10.3"/>`,
  clipboard: `<rect x="6" y="4.3" width="12" height="16.7" rx="2"/><rect x="9" y="2.3" width="6" height="3" rx="1"/><path d="M9 12.3l2 2 4-4.3"/>`,
  chart: `<line x1="5" y1="19" x2="5" y2="12"/><line x1="12" y1="19" x2="12" y2="6"/><line x1="19" y1="19" x2="19" y2="14"/><line x1="3" y1="19.5" x2="21" y2="19.5"/>`,
  users: `<circle cx="9" cy="8" r="3"/><path d="M3.5 20c0-3.3 2.5-6 5.5-6s5.5 2.7 5.5 6"/><circle cx="17" cy="9" r="2.3"/><path d="M15.3 20c.2-2.6 1.8-4.8 4.2-4.8"/>`,
  mail: `<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3.5 6.5L12 13l8.5-6.5"/>`,
  chat: `<rect x="3" y="5" width="18" height="12.3" rx="2.5"/><path d="M8 17.3l-1.8 3.2v-3.2"/>`,
  "log-out": `<path d="M13.5 4.5H17a2 2 0 012 2v11a2 2 0 01-2 2h-3.5"/><path d="M10 8l-4 4 4 4"/><line x1="6" y1="12" x2="15.5" y2="12"/>`,
  leaf: `<path d="M4.5 19.5c7.5-1 13-6.5 14-14-7.5 1-13 6.5-14 14z"/><path d="M9 15c2-2 4-4 7.5-7.5"/>`,
};

/**
 * `size` in px (viewBox is fixed at 24, so it just scales); `color` an inline
 * hex/rgba, since currentColor inheritance through table cells is unreliable
 * across mail clients. Renders nothing (not a broken-image icon) in clients
 * that strip <svg>, i.e. Outlook desktop -- see the file docblock.
 */
function icon(
  name: string,
  { size = 20, color = EMAIL_COLORS.primary as string, strokeWidth = 1.75 }: {
    size?: number;
    color?: string;
    strokeWidth?: number;
  } = {}
): string {
  const inner = ICONS[name];
  if (!inner) return "";
  // A couple of icons (alert dots) carry their own `fill="currentColor"` for
  // the solid dot; resolved here rather than left to CSS inheritance, which
  // mail clients apply inconsistently across table cells.
  const resolved = inner.replace(/currentColor/g, color);
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">${resolved}</svg>`;
}

export interface EmailInfoRow {
  /** A key from the icon set (see ICONS in this file), e.g. "box". */
  icon?: string;
  label: string;
  value: string;
}

export interface EmailFeature {
  /** A key from the icon set (see ICONS in this file), e.g. "chart". */
  icon: string;
  title: string;
  text: string;
}

export interface EmailCta {
  label: string;
  href: string;
}

export interface RenderEmailOptions {
  /** Shown by the inbox list/preview pane; hidden in the rendered body. */
  preheader: string;
  eyebrow: string;
  headline: string;
  heroMessage?: string;
  /** A key from the icon set (see ICONS in this file), e.g. "egg". */
  heroIcon: string;
  greetingName?: string;
  /** Paragraphs after the greeting, before any card. */
  intro?: string[];
  infoCard?: { title?: string; rows: EmailInfoRow[] };
  cta?: EmailCta;
  features?: EmailFeature[];
  /** A short note under the CTA -- a reactivate link, a "changed your mind?" line. */
  secondaryNote?: string;
  showSupport?: boolean;
  showBrandMessage?: boolean;
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function paragraph(html: string, extraStyle = ""): string {
  return `<p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:${EMAIL_COLORS.text};${extraStyle}">${html}</p>`;
}

function headerBlock(): string {
  return `
  <tr>
    <td class="lf-px" style="padding:24px 40px;background:${EMAIL_COLORS.white};">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td valign="middle">
            <table role="presentation" cellpadding="0" cellspacing="0">
              <tr>
                <td width="28" height="28" align="center" valign="middle" style="width:28px;height:28px;border-radius:8px;background:${EMAIL_COLORS.primary};font-size:14px;line-height:28px;color:${EMAIL_COLORS.white};font-weight:800;text-align:center;">L</td>
                <td style="padding-left:9px;font-size:16px;font-weight:800;color:${EMAIL_COLORS.primary};">Layer Flow</td>
              </tr>
            </table>
          </td>
          <td align="right" valign="middle" style="font-size:11px;font-weight:600;letter-spacing:0.4px;text-transform:uppercase;color:${EMAIL_COLORS.muted};">Smart Poultry Management</td>
        </tr>
      </table>
    </td>
  </tr>`;
}

function heroBlock(opts: RenderEmailOptions): string {
  return `
  <tr>
    <td class="lf-px" style="background:${EMAIL_COLORS.pale};padding:40px 40px 36px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td valign="top" style="padding-right:20px;">
            <p style="margin:0 0 10px;font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:${EMAIL_COLORS.medium};">${escapeHtml(opts.eyebrow)}</p>
            <h1 style="margin:0 0 12px;font-size:26px;line-height:1.3;font-weight:800;color:${EMAIL_COLORS.primary};">${escapeHtml(opts.headline)}</h1>
            ${opts.heroMessage ? `<p style="margin:0;font-size:15px;line-height:1.6;color:${EMAIL_COLORS.muted};">${escapeHtml(opts.heroMessage)}</p>` : ""}
          </td>
          <td valign="top" width="64" style="width:64px;">
            <table role="presentation" cellpadding="0" cellspacing="0">
              <tr>
                <td width="64" height="64" align="center" valign="middle" style="width:64px;height:64px;border-radius:32px;background:${EMAIL_COLORS.light};text-align:center;">${icon(opts.heroIcon, { size: 28, color: EMAIL_COLORS.primary, strokeWidth: 1.6 })}</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>`;
}

function infoCardBlock(card: NonNullable<RenderEmailOptions["infoCard"]>): string {
  const rows = card.rows
    .map(
      (row, i) => `
      <tr>
        <td style="padding:${i === 0 ? "0" : "10px"} 0 0;font-size:14px;color:${EMAIL_COLORS.muted};">${row.icon ? `<span style="display:inline-block;vertical-align:-3px;margin-right:7px;">${icon(row.icon, { size: 15, color: EMAIL_COLORS.medium, strokeWidth: 1.9 })}</span>` : ""}${escapeHtml(row.label)}</td>
        <td align="right" style="padding:${i === 0 ? "0" : "10px"} 0 0;font-size:14px;font-weight:700;color:${EMAIL_COLORS.text};">${escapeHtml(row.value)}</td>
      </tr>`
    )
    .join("");

  return `
  <tr>
    <td class="lf-px" style="padding:4px 40px 8px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${EMAIL_COLORS.pale};border-radius:12px;">
        <tr>
          <td style="padding:22px 24px;">
            ${card.title ? `<p style="margin:0 0 12px;font-size:13px;font-weight:700;color:${EMAIL_COLORS.primary};">${escapeHtml(card.title)}</p>` : ""}
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>
          </td>
        </tr>
      </table>
    </td>
  </tr>`;
}

function ctaBlock(cta: EmailCta, secondaryNote?: string): string {
  return `
  <tr>
    <td align="center" class="lf-px" style="padding:28px 40px 8px;">
      <table role="presentation" cellpadding="0" cellspacing="0">
        <tr>
          <td align="center" style="border-radius:999px;background:${EMAIL_COLORS.primary};">
            <a href="${cta.href}" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:700;color:${EMAIL_COLORS.white};text-decoration:none;border-radius:999px;">${escapeHtml(cta.label)} &rarr;</a>
          </td>
        </tr>
      </table>
      ${secondaryNote ? `<p style="margin:16px 0 0;font-size:13px;color:${EMAIL_COLORS.muted};">${escapeHtml(secondaryNote)}</p>` : ""}
    </td>
  </tr>`;
}

function featuresBlock(features: EmailFeature[]): string {
  const width = Math.floor(100 / features.length);
  const cells = features
    .map(
      (f) => `
      <td valign="top" width="${width}%" style="padding:0 8px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${EMAIL_COLORS.white};border:1px solid ${EMAIL_COLORS.border};border-radius:10px;">
          <tr>
            <td style="padding:16px;">
              <div style="margin-bottom:10px;">${icon(f.icon, { size: 22, color: EMAIL_COLORS.primary, strokeWidth: 1.6 })}</div>
              <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:${EMAIL_COLORS.text};">${escapeHtml(f.title)}</p>
              <p style="margin:0;font-size:12.5px;line-height:1.5;color:${EMAIL_COLORS.muted};">${escapeHtml(f.text)}</p>
            </td>
          </tr>
        </table>
      </td>`
    )
    .join("");

  return `
  <tr>
    <td class="lf-px" style="padding:20px 32px 8px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>${cells}</tr></table>
    </td>
  </tr>`;
}

function supportBlock(): string {
  return `
  <tr>
    <td class="lf-px" style="padding:24px 40px 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid ${EMAIL_COLORS.border};">
        <tr>
          <td style="padding:20px 0 0;font-size:13px;line-height:1.6;color:${EMAIL_COLORS.muted};">
            Need a hand? Reach out any time at
            <a href="mailto:hello@layerflow.local" style="color:${EMAIL_COLORS.medium};font-weight:600;text-decoration:none;">hello@layerflow.local</a>
            or visit the <a href="${publicEnv.appUrl}/support" style="color:${EMAIL_COLORS.medium};font-weight:600;text-decoration:none;">Help Center</a>.
          </td>
        </tr>
      </table>
    </td>
  </tr>`;
}

function brandMessageBlock(): string {
  return `
  <tr>
    <td class="lf-px" style="padding:18px 40px 32px;">
      <table role="presentation" cellpadding="0" cellspacing="0">
        <tr>
          <td valign="top" width="20" style="width:20px;padding-top:1px;">${icon("leaf", { size: 15, color: EMAIL_COLORS.medium, strokeWidth: 1.8 })}</td>
          <td style="font-size:12.5px;line-height:1.6;color:${EMAIL_COLORS.muted};">
            Every farm on Layer Flow is one less spreadsheet and one clearer picture of what the flock actually earns.
          </td>
        </tr>
      </table>
    </td>
  </tr>`;
}

function footerBlock(): string {
  return `
  <tr>
    <td class="lf-px" align="center" style="background:${EMAIL_COLORS.deepGreen};padding:28px 40px;text-align:center;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr><td align="center" style="font-size:13px;font-weight:700;color:${EMAIL_COLORS.white};text-align:center;">Layer Flow</td></tr>
        <tr><td align="center" style="padding-top:2px;font-size:11px;color:rgba(255,255,255,0.65);text-align:center;">Smart Poultry Management</td></tr>
        <tr><td style="padding-top:16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="border-top:1px solid rgba(255,255,255,0.15);font-size:1px;line-height:1px;">&nbsp;</td></tr></table>
        </td></tr>
        <tr>
          <td align="center" style="padding-top:14px;font-size:11px;line-height:1.6;color:rgba(255,255,255,0.55);text-align:center;">
            &copy; ${new Date().getFullYear()} Layer Flow. All rights reserved.<br />
            <a href="${publicEnv.appUrl}/privacy" style="color:rgba(255,255,255,0.65);text-decoration:underline;">Privacy</a>
            &nbsp;&middot;&nbsp;
            <a href="${publicEnv.appUrl}/terms" style="color:rgba(255,255,255,0.65);text-decoration:underline;">Terms</a>
          </td>
        </tr>
      </table>
    </td>
  </tr>`;
}

export function renderEmailHtml(opts: RenderEmailOptions): string {
  const introHtml = (opts.intro ?? []).map((line) => paragraph(escapeHtml(line))).join("");
  const greeting = opts.greetingName
    ? paragraph(`Hi ${escapeHtml(opts.greetingName)},`, "font-weight:600;")
    : "";

  const body = `
${headerBlock()}
${heroBlock(opts)}
<tr>
  <td class="lf-px" style="padding:28px 40px 4px;">
    ${greeting}${introHtml}
  </td>
</tr>
${opts.infoCard ? infoCardBlock(opts.infoCard) : ""}
${opts.cta ? ctaBlock(opts.cta, opts.secondaryNote) : ""}
${opts.features ? featuresBlock(opts.features) : ""}
${opts.showSupport === false ? "" : supportBlock()}
${opts.showBrandMessage === false ? "" : brandMessageBlock()}
${footerBlock()}`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="color-scheme" content="light" />
<meta name="x-apple-disable-message-reformatting" />
<title>${escapeHtml(opts.headline)}</title>
<style>
  body,table,td,a { -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
  table,td { mso-table-lspace:0pt; mso-table-rspace:0pt; }
  img { -ms-interpolation-mode:bicubic; border:0; line-height:100%; outline:none; text-decoration:none; }
  body { margin:0; padding:0; width:100% !important; background:${EMAIL_COLORS.bg}; font-family:${FONT_STACK}; }
  @media screen and (max-width:600px) {
    .lf-container { width:100% !important; border-radius:0 !important; }
    .lf-px { padding-left:22px !important; padding-right:22px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:${EMAIL_COLORS.bg};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${escapeHtml(opts.preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${EMAIL_COLORS.bg};">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" class="lf-container" style="width:600px;max-width:600px;background:${EMAIL_COLORS.white};border-radius:12px;overflow:hidden;border:1px solid ${EMAIL_COLORS.border};">${body}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
