import { renderButton, renderEmailLayout } from './base-layout';
import { escapeHtml } from './format.util';

export interface PasswordChangedEmailInput {
  name: string;
  siteUrl: string;
  supportEmail: string;
}

export function renderPasswordChangedEmail(input: PasswordChangedEmailInput): {
  subject: string;
  html: string;
  text: string;
} {
  const firstName = input.name.trim().split(/\s+/)[0] || input.name;
  const safeName = escapeHtml(firstName);

  const bodyHtml = `
    <h1 style="margin:0 0 12px 0;font-size:20px;color:#231512;">Your password was changed, ${safeName}</h1>
    <p style="margin:0 0 16px 0;">
      This is a confirmation that the password for your ìlúEats account was just
      updated. You can sign in with your new password right away.
    </p>
    ${renderButton('Sign in', input.siteUrl)}
    <p style="margin:16px 0 0 0;color:#6f625c;font-size:13px;">
      Didn't make this change? Please contact us straight away at
      <a href="mailto:${escapeHtml(input.supportEmail)}" style="color:#efa00b;text-decoration:none;">${escapeHtml(input.supportEmail)}</a>
      so we can help secure your account.
    </p>
  `;

  const html = renderEmailLayout({
    previewText: 'Your ìlúEats password was just changed.',
    bodyHtml,
    heroImageAlt: 'ìlúEats',
    supportEmail: input.supportEmail,
    siteUrl: input.siteUrl,
  });

  const text = [
    `Your password was changed, ${firstName}`,
    '',
    `This is a confirmation that the password for your ìlúEats account was just updated.`,
    `You can sign in with your new password right away: ${input.siteUrl}`,
    '',
    `Didn't make this change? Please contact us straight away at ${input.supportEmail} so we can help secure your account.`,
  ].join('\n');

  return { subject: 'Your ìlúEats password was changed', html, text };
}
