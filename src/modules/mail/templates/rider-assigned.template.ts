import { renderButton, renderEmailLayout } from './base-layout';
import { escapeHtml } from './format.util';

export interface RiderAssignedEmailInput {
  customerName: string;
  orderCode: string;
  storeName: string;
  riderName: string;
  riderPhone: string | null;
  trackingUrl: string;
  siteUrl: string;
  supportEmail: string;
}

export function renderRiderAssignedEmail(input: RiderAssignedEmailInput): {
  subject: string;
  html: string;
  text: string;
} {
  const firstName =
    input.customerName.trim().split(/\s+/)[0] || input.customerName;
  const safeName = escapeHtml(firstName);
  const safeStore = escapeHtml(input.storeName);
  const safeRiderName = escapeHtml(input.riderName);

  const phoneHtml = input.riderPhone
    ? `<p style="margin:4px 0 0 0;font-size:14px;color:#6f625c;">
         <a href="tel:${escapeHtml(input.riderPhone)}" style="color:#6f625c;text-decoration:none;">${escapeHtml(input.riderPhone)}</a>
       </p>`
    : '';

  const bodyHtml = `
    <h1 style="margin:0 0 12px 0;font-size:20px;color:#231512;">A rider is on the way, ${safeName}!</h1>
    <p style="margin:0 0 16px 0;">
      Your order <strong>${input.orderCode}</strong> from <strong>${safeStore}</strong>
      has been picked up by a rider and is being prepped for delivery.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 16px 0;width:100%;background-color:#fcfaf7;border-radius:8px;">
      <tr>
        <td style="padding:16px 18px;">
          <p style="margin:0;font-size:12px;font-weight:700;letter-spacing:0.4px;text-transform:uppercase;color:#a2968f;">Your rider</p>
          <p style="margin:4px 0 0 0;font-size:16px;font-weight:700;color:#231512;">${safeRiderName}</p>
          ${phoneHtml}
        </td>
      </tr>
    </table>
    ${renderButton('Track your order', input.trackingUrl)}
  `;

  const html = renderEmailLayout({
    previewText: `${input.riderName} is bringing your order ${input.orderCode} from ${input.storeName}.`,
    bodyHtml,
    supportEmail: input.supportEmail,
    siteUrl: input.siteUrl,
  });

  const text = [
    `A rider is on the way, ${firstName}!`,
    '',
    `Your order ${input.orderCode} from ${input.storeName} has been picked up by a rider.`,
    '',
    `Rider: ${input.riderName}${input.riderPhone ? ` · ${input.riderPhone}` : ''}`,
    '',
    `Track your order: ${input.trackingUrl}`,
    '',
    `Questions? Contact ${input.supportEmail}`,
  ].join('\n');

  return {
    subject: `Your rider is on the way — order ${input.orderCode}`,
    html,
    text,
  };
}
