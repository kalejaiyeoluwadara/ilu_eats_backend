import { renderButton, renderEmailLayout } from './base-layout';
import { escapeHtml, formatNaira } from './format.util';

export interface OrderConfirmationEmailInput {
  customerName: string;
  orderCode: string;
  storeName: string;
  lineItems: { name: string; qty: number; unitPrice: number }[];
  subtotal: number;
  deliveryFee: number;
  serviceFee: number;
  total: number;
  estimatedDeliveryWindow: number[];
  trackingUrl: string;
  siteUrl: string;
  supportEmail: string;
}

export function renderOrderConfirmationEmail(
  input: OrderConfirmationEmailInput,
): {
  subject: string;
  html: string;
  text: string;
} {
  const firstName =
    input.customerName.trim().split(/\s+/)[0] || input.customerName;
  const safeName = escapeHtml(firstName);
  const safeStore = escapeHtml(input.storeName);
  const [minWindow, maxWindow] = input.estimatedDeliveryWindow;
  const windowLabel =
    minWindow && maxWindow ? `${minWindow}-${maxWindow} minutes` : 'shortly';

  const rowsHtml = input.lineItems
    .map(
      (item) => `
      <tr>
        <td style="padding:8px 0;font-size:14px;color:#231512;border-bottom:1px solid #f0e6df;">
          ${escapeHtml(item.name)} &times; ${item.qty}
        </td>
        <td align="right" style="padding:8px 0;font-size:14px;color:#231512;border-bottom:1px solid #f0e6df;">
          ${formatNaira(item.unitPrice * item.qty)}
        </td>
      </tr>`,
    )
    .join('');

  const bodyHtml = `
    <h1 style="margin:0 0 12px 0;font-size:20px;color:#231512;">Order confirmed, ${safeName}!</h1>
    <p style="margin:0 0 16px 0;">
      We've received your order from <strong>${safeStore}</strong> and it's being sent to the
      kitchen. Estimated delivery time is ${windowLabel}.
    </p>
    <p style="margin:0 0 16px 0;font-size:13px;color:#6f625c;">
      Order <strong style="color:#231512;">${input.orderCode}</strong>
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px 0;">
      ${rowsHtml}
      <tr>
        <td style="padding:10px 0 2px 0;font-size:13px;color:#6f625c;">Subtotal</td>
        <td align="right" style="padding:10px 0 2px 0;font-size:13px;color:#6f625c;">${formatNaira(input.subtotal)}</td>
      </tr>
      <tr>
        <td style="padding:2px 0;font-size:13px;color:#6f625c;">Delivery fee</td>
        <td align="right" style="padding:2px 0;font-size:13px;color:#6f625c;">${formatNaira(input.deliveryFee)}</td>
      </tr>
      <tr>
        <td style="padding:2px 0;font-size:13px;color:#6f625c;">Service fee</td>
        <td align="right" style="padding:2px 0;font-size:13px;color:#6f625c;">${formatNaira(input.serviceFee)}</td>
      </tr>
      <tr>
        <td style="padding:10px 0 0 0;font-size:15px;font-weight:700;color:#231512;">Total</td>
        <td align="right" style="padding:10px 0 0 0;font-size:15px;font-weight:700;color:#231512;">${formatNaira(input.total)}</td>
      </tr>
    </table>
    ${renderButton('Track your order', input.trackingUrl)}
  `;

  const html = renderEmailLayout({
    previewText: `Order ${input.orderCode} from ${input.storeName} is confirmed.`,
    bodyHtml,
    supportEmail: input.supportEmail,
    siteUrl: input.siteUrl,
  });

  const itemLines = input.lineItems
    .map(
      (item) =>
        `- ${item.name} x${item.qty}: ${formatNaira(item.unitPrice * item.qty)}`,
    )
    .join('\n');

  const text = [
    `Order confirmed, ${firstName}!`,
    '',
    `We've received your order from ${input.storeName} and it's being sent to the kitchen.`,
    `Estimated delivery time: ${windowLabel}.`,
    '',
    `Order ${input.orderCode}`,
    itemLines,
    '',
    `Subtotal: ${formatNaira(input.subtotal)}`,
    `Delivery fee: ${formatNaira(input.deliveryFee)}`,
    `Service fee: ${formatNaira(input.serviceFee)}`,
    `Total: ${formatNaira(input.total)}`,
    '',
    `Track your order: ${input.trackingUrl}`,
    '',
    `Questions? Contact ${input.supportEmail}`,
  ].join('\n');

  return {
    subject: `Order confirmed — ${input.orderCode} from ${input.storeName}`,
    html,
    text,
  };
}
