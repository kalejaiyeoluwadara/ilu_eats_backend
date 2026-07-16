import {
  BadRequestException,
  ForbiddenException,
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
import {
  PaystackService,
  PaystackVerifyResponse,
} from '../paystack/paystack.service';
import { WalletService, WALLET_TOPUP_PREFIX } from '../wallet/wallet.service';
import { CacheService } from '../../common/redis/cache.service';

/**
 * How long a processed webhook reference is remembered. Comfortably covers
 * Paystack's retry window (~72h) so retries/replays are short-circuited before
 * they touch Mongo. This is a fast-path only — the DB-level atomic claim in the
 * settle logic remains the authority on "credited exactly once".
 */
const WEBHOOK_DEDUP_TTL = 60 * 60 * 72; // 72 hours, in seconds

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
    private readonly config: ConfigService,
    private readonly paystack: PaystackService,
    private readonly walletService: WalletService,
    private readonly cache: CacheService,
  ) {}

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
    if (order.paymentMethod === PaymentMethod.Wallet) {
      throw new BadRequestException(
        'Wallet orders are settled from your wallet balance',
      );
    }
    if (order.paymentStatus === PaymentStatus.Paid) {
      throw new BadRequestException('Order has already been paid for');
    }

    const reference = `${order.orderCode}-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    const callbackUrl = this.config.get<string>('paystack.callbackUrl');

    const response = await this.paystack.initializeTransaction({
      email,
      amount: Math.round(order.total * 100),
      reference,
      callbackUrl: callbackUrl || undefined,
      metadata: { orderId: order.orderCode, userId },
    });

    order.paymentReference = response.data.reference;
    await order.save();

    return {
      authorizationUrl: response.data.authorization_url,
      accessCode: response.data.access_code,
      reference: response.data.reference,
      publicKey: this.paystack.publicKey,
    };
  }

  async verifyPayment(userId: string, reference: string) {
    const order = await this.orderModel.findOne({
      paymentReference: reference,
    });
    if (!order) throw new NotFoundException('Payment reference not found');
    if (String(order.userId) !== userId) {
      throw new ForbiddenException('You do not have access to this payment');
    }

    if (order.paymentStatus === PaymentStatus.Paid) {
      return { status: order.paymentStatus, order: order.orderCode };
    }

    const response = await this.paystack.verifyTransaction(reference);

    await this.applyVerificationResult(order, response.data);

    if (response.data.status !== 'success') {
      this.logger.warn(
        `Verification for ${reference} resolved to '${response.data.status}' (amount ${response.data.amount}, expected ${Math.round(order.total * 100)})`,
      );
    }

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

  async handleWebhookEvent(rawBody: Buffer, signature: string | undefined) {
    if (!this.paystack.verifyWebhookSignature(rawBody, signature)) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    const event = JSON.parse(rawBody.toString('utf8')) as {
      event: string;
      data: PaystackVerifyResponse['data'];
    };

    if (event.event !== 'charge.success' && event.event !== 'charge.failed') {
      return;
    }

    const reference = event.data.reference;
    if (!reference) return;

    // Fast path: Paystack retries a webhook until it gets a 200 and can replay
    // deliveries, so duplicates are routine. Skipping them here avoids burning
    // Mongo round-trips (and a connection from the size-1 serverless pool) on
    // work whose outcome is already settled. Keying on the reference alone is
    // sufficient: a reference has exactly one terminal outcome, and the settle
    // logic's status guards already refuse to move a settled record anyway.
    const dedupKey = `paystack:webhook:${reference}`;
    if (await this.cache.get(dedupKey)) {
      this.logger.log(
        `Duplicate Paystack webhook skipped · ${event.event} ${reference}`,
      );
      return;
    }

    // Wallet top-ups share the Paystack account; route them by reference.
    if (reference.startsWith(WALLET_TOPUP_PREFIX)) {
      await this.walletService.settleTopup(reference, event.data);
    } else {
      const order = await this.orderModel.findOne({
        paymentReference: reference,
      });
      if (!order) {
        // Deliberately NOT marked as processed: the order record may simply not
        // exist yet, and a later retry should still be able to settle it.
        this.logger.warn(`Webhook received for unknown reference ${reference}`);
        return;
      }
      await this.applyVerificationResult(order, event.data);
    }

    // Marked only after processing succeeded. If anything above threw, the key
    // is never written, so Paystack's retry re-runs the work rather than being
    // silently swallowed — the failure mode that makes "mark before processing"
    // dangerous for money.
    await this.cache.set(dedupKey, Date.now(), WEBHOOK_DEDUP_TTL);
  }
}
