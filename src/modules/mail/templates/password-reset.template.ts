import { renderButton, renderEmailLayout } from './base-layout';
import { escapeHtml } from './format.util';

export interface PasswordResetEmailInput {
  name: string;
  resetUrl: string;
  /** How long the link stays valid, e.g. "1 hour" — shown to the reader. */
  expiresInLabel: string;
  siteUrl: string;
  supportEmail: string;
}

export function renderPasswordResetEmail(input: PasswordResetEmailInput): {
  subject: string;
  html: string;
  text: string;
} {
  const firstName = input.name.trim().split(/\s+/)[0] || input.name;
  const safeName = escapeHtml(firstName);

  const bodyHtml = `
    <h1 style="margin:0 0 12px 0;font-size:20px;color:#231512;">Reset your password, ${safeName}</h1>
    <p style="margin:0 0 16px 0;">
      We received a request to reset the password for your ìlúEats account. Tap the
      button below to choose a new one. This link stays valid for ${escapeHtml(input.expiresInLabel)}.
    </p>
    ${renderButton('Reset my password', input.resetUrl)}
    <p style="margin:16px 0 0 0;color:#6f625c;font-size:13px;">
      Don't see this email in your inbox? Please check your spam or junk folder, and
      mark it as "not spam" so you always hear from us.
    </p>
    <p style="margin:12px 0 0 0;color:#6f625c;font-size:13px;">
      If you didn't ask to reset your password, you can safely ignore this email &mdash;
      your password stays the same.
    </p>
  `;

  const html = renderEmailLayout({
    previewText: `Reset your ìlúEats password — link valid for ${input.expiresInLabel}.`,
    bodyHtml,
    heroImageAlt: 'ìlúEats',
    supportEmail: input.supportEmail,
    siteUrl: input.siteUrl,
  });

  const text = [
    `Reset your password, ${firstName}`,
    '',
    `We received a request to reset the password for your ìlúEats account.`,
    `Use the link below to choose a new one. It stays valid for ${input.expiresInLabel}.`,
    '',
    input.resetUrl,
    '',
    `Don't see this email? Please check your spam or junk folder.`,
    '',
    `If you didn't ask to reset your password, you can safely ignore this email — your password stays the same.`,
    '',
    `Questions? Contact ${input.supportEmail}`,
  ].join('\n');

  return { subject: 'Reset your ìlúEats password', html, text };
}
