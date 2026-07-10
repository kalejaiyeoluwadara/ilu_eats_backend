import { renderButton, renderEmailLayout } from './base-layout';
import { escapeHtml, formatNaira } from './format.util';

export interface AdminNewOrderEmailInput {
  orderCode: string;
  storeName: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  paymentLabel: string;
  lineItems: { name: string; qty: number; unitPrice: number }[];
  total: number;
  adminUrl: string;
  siteUrl: string;
  supportEmail: string;
}

export function renderAdminNewOrderEmail(input: AdminNewOrderEmailInput): {
  subject: string;
  html: string;
  text: string;
} {
  const safeStore = escapeHtml(input.storeName);
  const safeCustomer = escapeHtml(input.customerName);

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

  const detailRow = (label: string, value: string) => `
    <tr>
      <td style="padding:4px 0;font-size:13px;color:#6f625c;width:130px;">${label}</td>
      <td style="padding:4px 0;font-size:13px;color:#231512;">${escapeHtml(value)}</td>
    </tr>`;

  const bodyHtml = `
    <h1 style="margin:0 0 12px 0;font-size:20px;color:#231512;">New order &mdash; ${escapeHtml(input.orderCode)}</h1>
    <p style="margin:0 0 16px 0;">
      ${safeCustomer} just placed an order from <strong>${safeStore}</strong>.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px 0;background-color:#fcfaf7;border-radius:8px;">
      <tr>
        <td style="padding:16px 18px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            ${detailRow('Customer', input.customerName)}
            ${detailRow('Phone', input.customerPhone)}
            ${detailRow('Deliver to', input.deliveryAddress)}
            ${detailRow('Payment', input.paymentLabel)}
          </table>
        </td>
      </tr>
    </table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px 0;">
      ${rowsHtml}
      <tr>
        <td style="padding:10px 0 0 0;font-size:15px;font-weight:700;color:#231512;">Total</td>
        <td align="right" style="padding:10px 0 0 0;font-size:15px;font-weight:700;color:#231512;">${formatNaira(input.total)}</td>
      </tr>
    </table>
    ${renderButton('Open admin dashboard', input.adminUrl)}
  `;

  const html = renderEmailLayout({
    previewText: `New order ${input.orderCode} from ${input.storeName} — ${formatNaira(input.total)}.`,
    bodyHtml,
    heroImageUrl: null,
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
    `New order — ${input.orderCode}`,
    '',
    `${input.customerName} just placed an order from ${input.storeName}.`,
    '',
    `Customer: ${input.customerName}`,
    `Phone: ${input.customerPhone}`,
    `Deliver to: ${input.deliveryAddress}`,
    `Payment: ${input.paymentLabel}`,
    '',
    itemLines,
    `Total: ${formatNaira(input.total)}`,
    '',
    `Open admin dashboard: ${input.adminUrl}`,
  ].join('\n');

  return {
    subject: `New order — ${input.orderCode} · ${input.storeName} · ${formatNaira(input.total)}`,
    html,
    text,
  };
}
