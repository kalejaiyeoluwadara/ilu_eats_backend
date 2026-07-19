import { Logger, ServiceUnavailableException } from '@nestjs/common';
import { WhatsappProvider } from './whatsapp-provider.interface';

export interface MetaWhatsappConfig {
  accessToken: string;
  phoneNumberId: string;
  graphVersion: string;
  languageCode: string;
}

/**
 * Meta WhatsApp Cloud API driver. Sends through the Graph API:
 *   POST https://graph.facebook.com/{version}/{phoneNumberId}/messages
 *
 * Business-initiated notifications (order updates) go out as approved
 * templates; free-form text is only accepted by Meta inside the 24-hour
 * customer-service window, so `sendText` is for testing/replies only.
 *
 * Docs: https://developers.facebook.com/docs/whatsapp/cloud-api
 */
export class MetaWhatsappProvider implements WhatsappProvider {
  readonly name = 'meta';
  private readonly logger = new Logger(MetaWhatsappProvider.name);

  constructor(private readonly config: MetaWhatsappConfig) {}

  isConfigured(): boolean {
    return Boolean(this.config.accessToken && this.config.phoneNumberId);
  }

  async sendTemplate(
    phone: string,
    templateName: string,
    bodyParams: string[],
  ): Promise<void> {
    await this.post({
      messaging_product: 'whatsapp',
      to: this.normalizePhone(phone),
      type: 'template',
      template: {
        name: templateName,
        language: { code: this.config.languageCode },
        components: bodyParams.length
          ? [
              {
                type: 'body',
                parameters: bodyParams.map((text) => ({ type: 'text', text })),
              },
            ]
          : [],
      },
    });
  }

  async sendText(phone: string, message: string): Promise<void> {
    await this.post({
      messaging_product: 'whatsapp',
      to: this.normalizePhone(phone),
      type: 'text',
      text: { preview_url: false, body: message },
    });
  }

  private async post(body: unknown): Promise<void> {
    const url = `https://graph.facebook.com/${this.config.graphVersion}/${this.config.phoneNumberId}/messages`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = (await res.json().catch(() => ({}))) as {
      error?: { message?: string; code?: number };
    };
    // Meta answers failures with HTTP 4xx AND an `{error:{message,code}}`
    // envelope; surface whichever is present.
    if (!res.ok || data.error) {
      const message = data.error?.message ?? `HTTP ${res.status}`;
      this.logger.error(`Meta WhatsApp send failed: ${message}`);
      throw new ServiceUnavailableException(`WhatsApp provider error: ${message}`);
    }
  }

  /**
   * The Cloud API expects the recipient in international format without a
   * leading '+' (e.g. 2348030000000). Best-effort normalization for Nigerian
   * numbers; anything already in 234... or other-country format is left intact.
   */
  private normalizePhone(phone: string): string {
    const digits = phone.replace(/[^\d+]/g, '').replace(/^\+/, '');
    if (digits.startsWith('234')) return digits;
    if (digits.startsWith('0')) return `234${digits.slice(1)}`;
    return digits;
  }
}
