import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as crypto from 'crypto';
import { Order, OrderDocument } from '../orders/schemas/order.schema';
import {
  PaymentMethod,
  PaymentStatus,
} from '../../common/enums/order-status.enum';

const PAYSTACK_BASE_URL = 'https://api.paystack.co';

interface PaystackInitializeResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

interface PaystackVerifyResponse {
  status: boolean;
  message: string;
  data: {
    status: 'success' | 'failed' | 'abandoned';
    reference: string;
    amount: number;
    currency: string;
  };
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
    private readonly config: ConfigService,
  ) {}

  private get secretKey(): string {
    const key = this.config.get<string>('paystack.secretKey');
    if (!key) {
      throw new BadRequestException('Paystack is not configured');
    }
    return key;
  }

  private async paystackFetch<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${PAYSTACK_BASE_URL}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
        ...init?.headers,
      },
    });
    const body = (await res.json()) as T & { message?: string };
    if (!res.ok) {
      throw new BadRequestException(
        body?.message ?? 'Paystack request failed',
      );
    }
    return body;
  }

  async initializePayment(userId: string, email: string, orderId: string) {
    const order = await this.orderModel.findOne({
      orderCode: orderId,
      userId,
    });
    if (!order) throw new NotFoundException('Order not found');

    if (order.paymentMethod === PaymentMethod.Cash) {
      throw new BadRequestException(
        'Cash on delivery orders do not require online payment',
      );
    }
    if (order.paymentStatus === PaymentStatus.Paid) {
      throw new BadRequestException('Order has already been paid for');
    }

    const reference = `${order.orderCode}-${Date.now()}`;
    const callbackUrl = this.config.get<string>('paystack.callbackUrl');

    const response = await this.paystackFetch<PaystackInitializeResponse>(
      '/transaction/initialize',
      {
        method: 'POST',
        body: JSON.stringify({
          email,
          amount: Math.round(order.total * 100),
          reference,
          ...(callbackUrl && { callback_url: callbackUrl }),
          metadata: { orderId: order.orderCode, userId },
        }),
      },
    );

    order.paymentReference = reference;
    await order.save();

    return {
      authorizationUrl: response.data.authorization_url,
      accessCode: response.data.access_code,
      reference: response.data.reference,
      publicKey: this.config.get<string>('paystack.publicKey'),
    };
  }

  async verifyPayment(userId: string, reference: string) {
    const order = await this.orderModel.findOne({
      paymentReference: reference,
      userId,
    });
    if (!order) throw new NotFoundException('Payment reference not found');

    if (order.paymentStatus === PaymentStatus.Paid) {
      return { status: order.paymentStatus, order: order.orderCode };
    }

    const response = await this.paystackFetch<PaystackVerifyResponse>(
      `/transaction/verify/${encodeURIComponent(reference)}`,
    );

    await this.applyVerificationResult(order, response.data);
    return { status: order.paymentStatus, order: order.orderCode };
  }

  private async applyVerificationResult(
    order: OrderDocument,
    data: PaystackVerifyResponse['data'],
  ) {
    const amountMatches = data.amount === Math.round(order.total * 100);

    if (data.status === 'success' && amountMatches) {
      order.paymentStatus = PaymentStatus.Paid;
      order.paidAt = new Date();
    } else if (data.status === 'failed' || data.status === 'abandoned') {
      order.paymentStatus = PaymentStatus.Failed;
    }
    await order.save();
  }

  verifyWebhookSignature(rawBody: Buffer, signature: string | undefined) {
    if (!signature) return false;
    const hash = crypto
      .createHmac('sha512', this.secretKey)
      .update(rawBody)
      .digest('hex');
    return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(signature));
  }

  async handleWebhookEvent(rawBody: Buffer, signature: string | undefined) {
    if (!this.verifyWebhookSignature(rawBody, signature)) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    const event = JSON.parse(rawBody.toString('utf8')) as {
      event: string;
      data: PaystackVerifyResponse['data'];
    };

    if (event.event !== 'charge.success' && event.event !== 'charge.failed') {
      return;
    }

    const order = await this.orderModel.findOne({
      paymentReference: event.data.reference,
    });
    if (!order) {
      this.logger.warn(
        `Webhook received for unknown reference ${event.data.reference}`,
      );
      return;
    }

    await this.applyVerificationResult(order, event.data);
  }
}
