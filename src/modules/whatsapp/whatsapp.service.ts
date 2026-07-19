import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WhatsappProvider } from './providers/whatsapp-provider.interface';
import { MetaWhatsappConfig, MetaWhatsappProvider } from './providers/meta.provider';

interface WhatsappTemplates {
  orderPrepared: string;
  riderAssigned: string;
  orderDelivered: string;
}

/**
 * App-facing WhatsApp entry point. Resolves a concrete driver from config and
 * hides it from callers, so orders depend on this, never on Meta directly.
 *
 * Every send is fire-and-forget and never throws — matches MailService and
 * SmsService: a failed notification must not break the order flow. Order
 * updates are business-initiated, so they go out as approved templates.
 */
@Injectable()
export class WhatsappService implements OnModuleInit {
  private readonly logger = new Logger(WhatsappService.name);
  private provider!: WhatsappProvider;
  private templates!: WhatsappTemplates;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const providerName = this.config.get<string>('whatsapp.provider') ?? 'meta';
    switch (providerName) {
      case 'meta':
      default:
        this.provider = new MetaWhatsappProvider(
          this.config.get<MetaWhatsappConfig>('whatsapp.meta')!,
        );
    }
    this.templates = this.config.get<WhatsappTemplates>('whatsapp.templates')!;

    if (!this.provider.isConfigured()) {
      this.logger.warn(
        `WhatsApp provider "${this.provider.name}" is not configured (missing token/phone id) — order notifications will be skipped.`,
      );
    }
  }

  /** "Your order is being prepared." */
  async sendOrderPrepared(
    phone: string,
    params: { customerName: string; orderCode: string; storeName: string },
  ): Promise<void> {
    await this.send(phone, this.templates.orderPrepared, [
      params.customerName,
      params.orderCode,
      params.storeName,
    ]);
  }

  /** "A rider has been assigned and is on the way." */
  async sendRiderAssigned(
    phone: string,
    params: { customerName: string; riderName: string; orderCode: string },
  ): Promise<void> {
    await this.send(phone, this.templates.riderAssigned, [
      params.customerName,
      params.riderName,
      params.orderCode,
    ]);
  }

  /** "Your order has been delivered." */
  async sendOrderDelivered(
    phone: string,
    params: { customerName: string; orderCode: string },
  ): Promise<void> {
    await this.send(phone, this.templates.orderDelivered, [
      params.customerName,
      params.orderCode,
    ]);
  }

  private async send(
    phone: string,
    templateName: string,
    bodyParams: string[],
  ): Promise<void> {
    if (!this.provider.isConfigured()) {
      this.logger.warn(`WhatsApp skipped (unconfigured) to ${phone}`);
      return;
    }
    if (!phone) {
      this.logger.warn('WhatsApp skipped — no recipient phone on order');
      return;
    }
    try {
      await this.provider.sendTemplate(phone, templateName, bodyParams);
    } catch (err) {
      this.logger.error(
        `WhatsApp "${templateName}" to ${phone} failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
