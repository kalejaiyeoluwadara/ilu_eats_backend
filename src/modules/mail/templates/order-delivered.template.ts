import { renderButton, renderEmailLayout } from './base-layout';
import { escapeHtml, formatNaira } from './format.util';

export interface OrderDeliveredEmailInput {
  customerName: string;
  orderCode: string;
  storeName: string;
  total: number;
  siteUrl: string;
  supportEmail: string;
}

export function renderOrderDeliveredEmail(input: OrderDeliveredEmailInput): {
  subject: string;
  html: string;
  text: string;
} {
  const firstName =
    input.customerName.trim().split(/\s+/)[0] || input.customerName;
  const safeName = escapeHtml(firstName);
  const safeStore = escapeHtml(input.storeName);

  const bodyHtml = `
    <h1 style="margin:0 0 12px 0;font-size:20px;color:#231512;">Enjoy your meal, ${safeName}!</h1>
    <p style="margin:0 0 16px 0;">
      Your order <strong>${input.orderCode}</strong> from <strong>${safeStore}</strong>
      (${formatNaira(input.total)}) has just been delivered. We hope it hits the spot.
    </p>
    <p style="margin:0 0 16px 0;">
      Craving more? Your town has plenty to offer, and we're always ready to bring it.
    </p>
    ${renderButton('Order again', input.siteUrl)}
  `;

  const html = renderEmailLayout({
    previewText: `Order ${input.orderCode} from ${input.storeName} has been delivered.`,
    bodyHtml,
    supportEmail: input.supportEmail,
    siteUrl: input.siteUrl,
  });

  const text = [
    `Enjoy your meal, ${firstName}!`,
    '',
    `Your order ${input.orderCode} from ${input.storeName} (${formatNaira(input.total)}) has just been delivered.`,
    '',
    `Craving more? Order again: ${input.siteUrl}`,
    '',
    `Questions? Contact ${input.supportEmail}`,
  ].join('\n');

  return {
    subject: `Delivered — your ${input.storeName} order has arrived`,
    html,
    text,
  };
}
