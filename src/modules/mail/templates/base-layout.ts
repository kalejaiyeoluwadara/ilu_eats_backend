const BRAND_ORANGE = '#e64e0e';
const BRAND_GOLD = '#efa00b';
const CREAM = '#fcfaf7';
const INK = '#231512';
const MUTED = '#6f625c';

/**
 * Shared banner shown at the top of every customer-facing email. Used as the
 * default hero so all user emails carry the same branding as the welcome email.
 */
export const USER_EMAIL_BANNER_URL =
  'https://res.cloudinary.com/diccn7l1x/image/upload/v1783584702/banner_aqap7o.png';

export interface EmailLayoutOptions {
  /** Short hidden preview text shown next to the subject line in inbox lists. */
  previewText: string;
  /** Inner content as a raw HTML string (already escaped by the caller). */
  bodyHtml: string;
  /**
   * Full-width hero image shown under the header bar. Omit to get the shared
   * customer banner; pass `null` for internal/ops emails that shouldn't carry it.
   */
  heroImageUrl?: string | null;
  heroImageAlt?: string;
  supportEmail: string;
  siteUrl: string;
}

/**
 * Table-based, inline-styled layout so it renders consistently across
 * Gmail/Outlook/Apple Mail. Keeping markup simple and text-to-image ratio
 * high (real HTML copy, no image-only content) is deliberate for spam-filter friendliness.
 */
export function renderEmailLayout(options: EmailLayoutOptions): string {
  const { previewText, bodyHtml, heroImageAlt, supportEmail, siteUrl } =
    options;
  // Default every customer-facing email to the shared branded banner; an
  // explicit `null` opts out (internal emails).
  const heroImageUrl =
    options.heroImageUrl === undefined
      ? USER_EMAIL_BANNER_URL
      : options.heroImageUrl;

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light" />
    <title>ìlúEats</title>
  </head>
  <body style="margin:0;padding:0;background-color:${CREAM};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
      ${previewText}
      ${'&#8203;'.repeat(40)}
    </div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${CREAM};padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #f0e6df;">
            <tr>
              <td style="background:linear-gradient(135deg,#f96e22,${BRAND_ORANGE} 55%,#c43e04);padding:20px 24px;">
                <span style="font-size:20px;font-weight:700;color:#ffffff;letter-spacing:0.2px;">ìlúEats</span>
              </td>
            </tr>
            ${
              heroImageUrl
                ? `<tr>
              <td>
                <img src="${heroImageUrl}" alt="${heroImageAlt ?? 'ìlúEats'}" width="600" style="display:block;width:100%;max-width:600px;height:auto;" />
              </td>
            </tr>`
                : ''
            }
            <tr>
              <td style="padding:32px 28px;color:${INK};font-size:15px;line-height:1.6;">
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:20px 28px;background-color:${CREAM};border-top:1px solid #f0e6df;">
                <p style="margin:0 0 6px 0;font-size:12px;color:${MUTED};">
                  Your town. Your taste. &mdash; ìlúEats
                </p>
                <p style="margin:0 0 6px 0;font-size:12px;color:${MUTED};">
                  Questions about this email? Reach us at
                  <a href="mailto:${supportEmail}" style="color:${BRAND_GOLD};text-decoration:none;">${supportEmail}</a>.
                </p>
                <p style="margin:0;font-size:12px;color:${MUTED};">
                  You're receiving this because it relates to your ìlúEats account or a recent order at
                  <a href="${siteUrl}" style="color:${BRAND_GOLD};text-decoration:none;">${siteUrl}</a>.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function renderButton(label: string, href: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
    <tr>
      <td style="border-radius:8px;background-color:${BRAND_ORANGE};">
        <a href="${href}" style="display:inline-block;padding:12px 24px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">${label}</a>
      </td>
    </tr>
  </table>`;
}

export const brandColors = { BRAND_ORANGE, BRAND_GOLD, CREAM, INK, MUTED };
