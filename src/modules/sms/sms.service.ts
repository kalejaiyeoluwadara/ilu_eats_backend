import {
  Injectable,
  Logger,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SmsProvider } from './providers/sms-provider.interface';
import { TermiiConfig, TermiiProvider } from './providers/termii.provider';

/**
 * App-facing SMS/OTP entry point. Resolves a concrete driver from config and
 * hides it from callers, so auth and orders depend on this, never on Termii.
 */
@Injectable()
export class SmsService implements OnModuleInit {
  private readonly logger = new Logger(SmsService.name);
  private provider!: SmsProvider;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const providerName = this.config.get<string>('sms.provider') ?? 'termii';
    switch (providerName) {
      case 'termii':
      default:
        this.provider = new TermiiProvider(
          this.config.get<TermiiConfig>('sms.termii')!,
        );
    }

    if (!this.provider.isConfigured()) {
      this.logger.warn(
        `SMS provider "${this.provider.name}" is not configured (missing API key) — OTP sends will be rejected and plain SMS skipped.`,
      );
    }
  }

  /** Send a verification code; returns the pinId the caller stores to verify later. */
  async sendOtp(phone: string): Promise<{ pinId: string }> {
    if (!this.provider.isConfigured()) {
      throw new ServiceUnavailableException(
        'SMS is not configured; cannot send verification code',
      );
    }
    return this.provider.sendOtp(phone);
  }

  /** Verify a code against the pinId issued by sendOtp. */
  async verifyOtp(pinId: string, pin: string): Promise<boolean> {
    if (!this.provider.isConfigured()) {
      throw new ServiceUnavailableException(
        'SMS is not configured; cannot verify code',
      );
    }
    const result = await this.provider.verifyOtp(pinId, pin);
    return result.verified;
  }

  /**
   * Fire-and-forget transactional SMS (order updates). Never throws to the
   * caller — matches MailService: a failed notification must not break the flow.
   */
  async sendSms(phone: string, message: string): Promise<void> {
    if (!this.provider.isConfigured()) {
      this.logger.warn(`SMS skipped (unconfigured) to ${phone}`);
      return;
    }
    try {
      await this.provider.sendSms(phone, message);
    } catch (err) {
      this.logger.error(
        `SMS to ${phone} failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
