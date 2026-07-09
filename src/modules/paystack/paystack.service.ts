import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

const PAYSTACK_BASE_URL = 'https://api.paystack.co';

export interface PaystackInitializeResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

export interface PaystackVerifyResponse {
  status: boolean;
  message: string;
  data: {
    status: 'success' | 'failed' | 'abandoned';
    reference: string;
    amount: number;
    currency: string;
  };
}

export interface InitializeTransactionInput {
  email: string;
  /** Amount in kobo. */
  amount: number;
  reference: string;
  callbackUrl?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Thin HTTP client for the Paystack API, shared by order payments and wallet
 * top-ups. Owns the secret key and webhook signature verification.
 */
@Injectable()
export class PaystackService {
  private readonly logger = new Logger(PaystackService.name);

  constructor(private readonly config: ConfigService) {}

  private get secretKey(): string {
    const key = this.config.get<string>('paystack.secretKey');
    if (!key) {
      throw new BadRequestException('Paystack is not configured');
    }
    return key;
  }

  get publicKey(): string | undefined {
    return this.config.get<string>('paystack.publicKey');
  }

  private async paystackFetch<T extends { status: boolean }>(
    path: string,
    init?: RequestInit,
  ): Promise<T> {
    let res: Response;
    try {
      res = await fetch(`${PAYSTACK_BASE_URL}${path}`, {
        ...init,
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json',
          ...init?.headers,
        },
      });
    } catch (err) {
      this.logger.error(`Paystack request to ${path} failed: ${err}`);
      throw new BadRequestException(
        'Could not reach Paystack. Please try again shortly.',
      );
    }

    const body = (await res.json()) as T & { message?: string };
    if (!res.ok || !body?.status) {
      this.logger.error(
        `Paystack request to ${path} returned an error: ${body?.message ?? 'unknown error'}`,
      );
      throw new BadRequestException(
        body?.message ?? 'Paystack request failed',
      );
    }
    return body;
  }

  initializeTransaction(input: InitializeTransactionInput) {
    return this.paystackFetch<PaystackInitializeResponse>(
      '/transaction/initialize',
      {
        method: 'POST',
        body: JSON.stringify({
          email: input.email,
          amount: input.amount,
          reference: input.reference,
          ...(input.callbackUrl && { callback_url: input.callbackUrl }),
          ...(input.metadata && { metadata: input.metadata }),
        }),
      },
    );
  }

  verifyTransaction(reference: string) {
    return this.paystackFetch<PaystackVerifyResponse>(
      `/transaction/verify/${encodeURIComponent(reference)}`,
    );
  }

  verifyWebhookSignature(rawBody: Buffer, signature: string | undefined) {
    if (!signature) return false;
    const hash = crypto
      .createHmac('sha512', this.secretKey)
      .update(rawBody)
      .digest('hex');
    const hashBuf = Buffer.from(hash);
    const sigBuf = Buffer.from(signature);
    if (hashBuf.length !== sigBuf.length) return false;
    return crypto.timingSafeEqual(hashBuf, sigBuf);
  }
}
