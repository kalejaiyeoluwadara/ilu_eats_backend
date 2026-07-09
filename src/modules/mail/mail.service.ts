import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { renderWelcomeEmail } from './templates/welcome.template';
import {
  OrderConfirmationEmailInput,
  renderOrderConfirmationEmail,
} from './templates/order-confirmation.template';
import { renderOrderDeliveredEmail } from './templates/order-delivered.template';
import { renderRiderAssignedEmail } from './templates/rider-assigned.template';

export interface SendMailInput {
  to: string;
  subject: string;
  html: string;
  text: string;
}

@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter | null = null;
  private fromAddress = '';
  private replyTo = '';

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const host = this.config.get<string>('mail.host');
    const port = this.config.get<number>('mail.port');
    const user = this.config.get<string>('mail.user');
    const pass = this.config.get<string>('mail.pass');
    const fromName = this.config.get<string>('mail.fromName');
    // Gmail/Google Workspace SMTP rejects or flags a From address that
    // doesn't match the authenticated account (or a verified "Send As" alias),
    // so default the From address to the SMTP user unless one is explicitly set.
    const fromEmail = this.config.get<string>('mail.fromEmail') || user;
    this.replyTo = this.config.get<string>('mail.replyTo') || fromEmail || '';
    this.fromAddress = fromEmail ? `"${fromName}" <${fromEmail}>` : '';

    if (!host || !user || !pass) {
      this.logger.warn(
        'SMTP is not configured (SMTP_HOST/SMTP_USER/SMTP_PASS missing) — emails will be skipped.',
      );
      return;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      requireTLS: port !== 465,
      auth: { user, pass },
    });

    this.transporter.verify((err) => {
      if (err) {
        this.logger.error(`SMTP connection failed: ${err.message}`);
      } else {
        this.logger.log('SMTP connection ready');
      }
    });
  }

  /**
   * Fire-and-forget from the caller's perspective: failures are logged, not
   * thrown, so a broken mail server never breaks signup/checkout/delivery flows.
   */
  async send(input: SendMailInput): Promise<void> {
    if (!this.transporter) {
      this.logger.warn(`Skipped email to ${input.to}: SMTP not configured`);
      return;
    }

    try {
      await this.transporter.sendMail({
        from: this.fromAddress,
        replyTo: this.replyTo,
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text,
      });
    } catch (err) {
      this.logger.error(
        `Failed to send email to ${input.to}: ${(err as Error).message}`,
      );
    }
  }

  private get siteUrl(): string {
    return this.config.get<string>('mail.siteUrl') ?? 'https://ilueats.com';
  }

  private get supportEmail(): string {
    return this.config.get<string>('mail.supportEmail') ?? this.replyTo;
  }

  async sendWelcomeEmail(to: string, name: string): Promise<void> {
    const { subject, html, text } = renderWelcomeEmail({
      name,
      siteUrl: this.siteUrl,
      supportEmail: this.supportEmail,
    });
    await this.send({ to, subject, html, text });
  }

  async sendOrderConfirmationEmail(
    to: string,
    order: Omit<
      OrderConfirmationEmailInput,
      'trackingUrl' | 'siteUrl' | 'supportEmail'
    >,
  ): Promise<void> {
    const { subject, html, text } = renderOrderConfirmationEmail({
      ...order,
      trackingUrl: `${this.siteUrl}/orders/${order.orderCode}`,
      siteUrl: this.siteUrl,
      supportEmail: this.supportEmail,
    });
    await this.send({ to, subject, html, text });
  }

  async sendOrderDeliveredEmail(
    to: string,
    order: {
      customerName: string;
      orderCode: string;
      storeName: string;
      total: number;
    },
  ): Promise<void> {
    const { subject, html, text } = renderOrderDeliveredEmail({
      ...order,
      siteUrl: this.siteUrl,
      supportEmail: this.supportEmail,
    });
    await this.send({ to, subject, html, text });
  }

  async sendRiderAssignedEmail(
    to: string,
    order: {
      customerName: string;
      orderCode: string;
      storeName: string;
      riderName: string;
      riderPhone: string | null;
    },
  ): Promise<void> {
    const { subject, html, text } = renderRiderAssignedEmail({
      ...order,
      trackingUrl: `${this.siteUrl}/orders/${order.orderCode}`,
      siteUrl: this.siteUrl,
      supportEmail: this.supportEmail,
    });
    await this.send({ to, subject, html, text });
  }
}
