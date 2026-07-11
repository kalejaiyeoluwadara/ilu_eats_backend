import { Logger, ServiceUnavailableException } from '@nestjs/common';
import {
  SendOtpResult,
  SmsProvider,
  VerifyOtpResult,
} from './sms-provider.interface';

export interface TermiiConfig {
  apiKey: string;
  baseUrl: string;
  senderId: string;
  channel: string;
  otpTtlMinutes: number;
  otpLength: number;
}

/**
 * Termii driver. Uses the Token API for OTP (Termii generates and verifies the
 * code) and the SMS API for plain messages. Both go out on the configured
 * sender/channel — with the defaults (`N-Alert` / `dnd`) that's the shared
 * DND-bypass corridor, which needs no CAC or sender-ID registration.
 *
 * Docs: https://developer.termii.com
 */
export class TermiiProvider implements SmsProvider {
  readonly name = 'termii';
  private readonly logger = new Logger(TermiiProvider.name);

  constructor(private readonly config: TermiiConfig) {}

  isConfigured(): boolean {
    return Boolean(this.config.apiKey);
  }

  async sendOtp(phone: string): Promise<SendOtpResult> {
    const to = this.normalizePhone(phone);
    const body = {
      api_key: this.config.apiKey,
      message_type: 'NUMERIC',
      to,
      from: this.config.senderId,
      channel: this.config.channel,
      pin_attempts: 3,
      pin_time_to_live: this.config.otpTtlMinutes,
      pin_length: this.config.otpLength,
      pin_placeholder: '< 1234 >',
      message_text: `Your ilueats verification code is < 1234 >. It expires in ${this.config.otpTtlMinutes} minutes.`,
      pin_type: 'NUMERIC',
    };

    const data = await this.post<{ pinId?: string; smsStatus?: string }>(
      '/api/sms/otp/send',
      body,
    );
    if (!data.pinId) {
      this.logger.error(
        `Termii OTP send returned no pinId: ${JSON.stringify(data)}`,
      );
      throw new ServiceUnavailableException('Failed to send verification code');
    }
    return { pinId: data.pinId };
  }

  async verifyOtp(pinId: string, pin: string): Promise<VerifyOtpResult> {
    const data = await this.post<{ verified?: boolean | string; msisdn?: string }>(
      '/api/sms/otp/verify',
      { api_key: this.config.apiKey, pin_id: pinId, pin },
    );
    // Termii returns `verified: true` on success but `"False"`/error text on
    // wrong or expired codes — coerce both shapes to a boolean.
    const verified = data.verified === true || data.verified === 'True';
    return { verified, phone: data.msisdn };
  }

  async sendSms(phone: string, message: string): Promise<void> {
    await this.post('/api/sms/send', {
      api_key: this.config.apiKey,
      to: this.normalizePhone(phone),
      from: this.config.senderId,
      sms: message,
      type: 'plain',
      channel: this.config.channel,
    });
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${this.config.baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    // Termii answers auth/validation failures with HTTP 4xx AND a
    // `{status:"error", message}` envelope; surface whichever is present.
    if (!res.ok || data.status === 'error') {
      const message =
        (typeof data.message === 'string' && data.message) ||
        `HTTP ${res.status}`;
      this.logger.error(`Termii ${path} failed: ${message}`);
      throw new ServiceUnavailableException(`SMS provider error: ${message}`);
    }
    return data as T;
  }

  /**
   * Termii expects msisdn in international format without a leading '+'
   * (e.g. 2348030000000). Best-effort normalization for Nigerian numbers;
   * anything already in 234... or other-country format is left intact.
   */
  private normalizePhone(phone: string): string {
    const digits = phone.replace(/[^\d+]/g, '').replace(/^\+/, '');
    if (digits.startsWith('234')) return digits;
    if (digits.startsWith('0')) return `234${digits.slice(1)}`;
    return digits;
  }
}
