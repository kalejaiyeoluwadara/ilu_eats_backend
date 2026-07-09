import { renderButton, renderEmailLayout } from './base-layout';
import { escapeHtml } from './format.util';

const WELCOME_BANNER_URL =
  'https://res.cloudinary.com/diccn7l1x/image/upload/v1783584702/banner_aqap7o.png';

export interface WelcomeEmailInput {
  name: string;
  siteUrl: string;
  supportEmail: string;
}

export function renderWelcomeEmail(input: WelcomeEmailInput): {
  subject: string;
  html: string;
  text: string;
} {
  const firstName = input.name.trim().split(/\s+/)[0] || input.name;
  const safeName = escapeHtml(firstName);

  const bodyHtml = `
    <h1 style="margin:0 0 12px 0;font-size:20px;color:#231512;">Welcome to ìlúEats, ${safeName}!</h1>
    <p style="margin:0 0 16px 0;">
      Your town. Your taste. You're in — your account is ready and your favourite local
      spots are just a few taps away.
    </p>
    <p style="margin:0 0 16px 0;">
      Browse restaurants near you, save your delivery addresses, and place your first
      order whenever you're ready. Crave it, and we'll bring it.
    </p>
    ${renderButton('Start ordering', input.siteUrl)}
    <p style="margin:16px 0 0 0;color:#6f625c;font-size:13px;">
      If you didn't create an ìlúEats account, you can safely ignore this email.
    </p>
  `;

  const html = renderEmailLayout({
    previewText: `Welcome to ìlúEats, ${firstName} — your account is ready.`,
    bodyHtml,
    heroImageUrl: WELCOME_BANNER_URL,
    heroImageAlt: 'Welcome to ìlúEats',
    supportEmail: input.supportEmail,
    siteUrl: input.siteUrl,
  });

  const text = [
    `Welcome to ìlúEats, ${firstName}!`,
    '',
    `Your town. Your taste. Your account is ready and your favourite local spots are just a few taps away.`,
    '',
    `Start ordering: ${input.siteUrl}`,
    '',
    `If you didn't create an ìlúEats account, you can safely ignore this email.`,
    '',
    `Questions? Contact ${input.supportEmail}`,
  ].join('\n');

  return { subject: 'Welcome to ìlúEats — your account is ready', html, text };
}
