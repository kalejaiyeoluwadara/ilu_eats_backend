import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as crypto from 'crypto';
import { Wallet, WalletDocument } from './schemas/wallet.schema';
import {
  WalletTransaction,
  WalletTransactionDocument,
  WalletTransactionStatus,
  WalletTransactionType,
} from './schemas/wallet-transaction.schema';
import {
  PaystackService,
  PaystackVerifyResponse,
} from '../paystack/paystack.service';
import { paginate } from '../../common/dto/paginated-result.dto';

/** Reference prefix that lets the shared Paystack webhook route top-ups here. */
export const WALLET_TOPUP_PREFIX = 'WTU-';

export const MIN_TOPUP_NAIRA = 100;
export const MAX_TOPUP_NAIRA = 500_000;

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(
    @InjectModel(Wallet.name)
    private readonly walletModel: Model<WalletDocument>,
    @InjectModel(WalletTransaction.name)
    private readonly txnModel: Model<WalletTransactionDocument>,
    private readonly paystack: PaystackService,
    private readonly config: ConfigService,
  ) {}

  async getBalance(userId: string) {
    const wallet = await this.walletModel.findOne({ userId });
    return { balance: wallet?.balance ?? 0 };
  }

  async getTransactions(userId: string, page: number, pageSize: number) {
    const filter = { userId };
    const [items, totalItems] = await Promise.all([
      this.txnModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize),
      this.txnModel.countDocuments(filter),
    ]);
    return paginate(
      items.map((t) => ({
        id: String(t._id),
        type: t.type,
        amount: t.amount,
        status: t.status,
        reference: t.reference,
        orderCode: t.orderCode,
        balanceAfter: t.balanceAfter,
        createdAt: t.createdAt,
      })),
      totalItems,
      page,
      pageSize,
    );
  }

  async initializeTopup(userId: string, email: string, amount: number) {
    if (!Number.isInteger(amount)) {
      throw new BadRequestException('Top-up amount must be a whole amount');
    }
    if (amount < MIN_TOPUP_NAIRA || amount > MAX_TOPUP_NAIRA) {
      throw new BadRequestException(
        `Top-up amount must be between ₦${MIN_TOPUP_NAIRA} and ₦${MAX_TOPUP_NAIRA.toLocaleString()}`,
      );
    }

    const reference = `${WALLET_TOPUP_PREFIX}${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

    // Record the pending transaction first so webhook/verify always find it.
    const txn = await this.txnModel.create({
      userId,
      type: WalletTransactionType.Topup,
      amount,
      status: WalletTransactionStatus.Pending,
      reference,
    });

    const callbackUrl =
      this.config.get<string>('paystack.walletCallbackUrl') || undefined;

    try {
      const response = await this.paystack.initializeTransaction({
        email,
        amount: amount * 100,
        reference,
        callbackUrl,
        metadata: { purpose: 'wallet_topup', userId },
      });

      return {
        authorizationUrl: response.data.authorization_url,
        accessCode: response.data.access_code,
        reference: response.data.reference,
        publicKey: this.paystack.publicKey,
      };
    } catch (err) {
      await this.txnModel.updateOne(
        { _id: txn._id, status: WalletTransactionStatus.Pending },
        { status: WalletTransactionStatus.Failed },
      );
      throw err;
    }
  }

  async verifyTopup(userId: string, reference: string) {
    const txn = await this.txnModel.findOne({
      reference,
      userId,
      type: WalletTransactionType.Topup,
    });
    if (!txn) throw new NotFoundException('Top-up reference not found');

    if (txn.status === WalletTransactionStatus.Pending) {
      const response = await this.paystack.verifyTransaction(reference);
      await this.settleTopup(reference, response.data);
    }

    const settled = await this.txnModel.findOne({ reference });
    const { balance } = await this.getBalance(userId);
    return { status: settled?.status ?? txn.status, balance };
  }

  /**
   * Settle a pending top-up from a verified Paystack result. Idempotent and
   * safe under races between the webhook and client-side verification: the
   * pending→success flip is a single atomic update, so the wallet is credited
   * exactly once no matter how many times this runs.
   */
  async settleTopup(
    reference: string,
    data: PaystackVerifyResponse['data'],
  ): Promise<void> {
    if (data.status !== 'success') {
      if (data.status === 'failed' || data.status === 'abandoned') {
        await this.txnModel.updateOne(
          { reference, status: WalletTransactionStatus.Pending },
          { status: WalletTransactionStatus.Failed },
        );
      }
      return;
    }

    const pending = await this.txnModel.findOne({
      reference,
      type: WalletTransactionType.Topup,
    });
    if (!pending) {
      this.logger.warn(`Top-up settle for unknown reference ${reference}`);
      return;
    }

    // Never credit more (or less) than what Paystack actually collected.
    const amountMatches = data.amount === pending.amount * 100;
    const currencyOk = !data.currency || data.currency === 'NGN';
    if (!amountMatches || !currencyOk) {
      this.logger.error(
        `Top-up ${reference} amount mismatch: expected ${pending.amount * 100} kobo, Paystack reports ${data.amount} ${data.currency}. Marking failed — requires manual review.`,
      );
      await this.txnModel.updateOne(
        { reference, status: WalletTransactionStatus.Pending },
        { status: WalletTransactionStatus.Failed },
      );
      return;
    }

    const claimed = await this.txnModel.findOneAndUpdate(
      { reference, status: WalletTransactionStatus.Pending },
      { status: WalletTransactionStatus.Success },
      { new: true },
    );
    if (!claimed) return; // already settled by the other path

    const wallet = await this.walletModel.findOneAndUpdate(
      { userId: claimed.userId },
      { $inc: { balance: claimed.amount } },
      { new: true, upsert: true },
    );
    await this.txnModel.updateOne(
      { _id: claimed._id },
      { balanceAfter: wallet.balance },
    );
    this.logger.log(
      `Wallet credited ₦${claimed.amount} for user ${String(claimed.userId)} (${reference})`,
    );
  }

  /**
   * Atomically debit the wallet to pay for an order. The `balance >= amount`
   * guard inside the update makes overdraft impossible even under concurrent
   * requests. Throws if funds are insufficient.
   */
  async debitForOrder(userId: string, orderCode: string, amount: number) {
    if (!Number.isInteger(amount) || amount <= 0) {
      throw new BadRequestException('Invalid debit amount');
    }

    const wallet = await this.walletModel.findOneAndUpdate(
      { userId, balance: { $gte: amount } },
      { $inc: { balance: -amount } },
      { new: true },
    );
    if (!wallet) {
      throw new BadRequestException(
        'Insufficient wallet balance. Please top up your wallet and try again.',
      );
    }

    const reference = `WPY-${orderCode}-${crypto.randomBytes(3).toString('hex')}`;
    await this.txnModel.create({
      userId,
      type: WalletTransactionType.OrderPayment,
      amount,
      status: WalletTransactionStatus.Success,
      reference,
      orderCode,
      balanceAfter: wallet.balance,
    });
    return { reference, balanceAfter: wallet.balance };
  }

  /** Credit funds back (e.g. order creation failed after a wallet debit). */
  async creditRefund(userId: string, orderCode: string, amount: number) {
    const wallet = await this.walletModel.findOneAndUpdate(
      { userId },
      { $inc: { balance: amount } },
      { new: true, upsert: true },
    );
    const reference = `WRF-${orderCode}-${crypto.randomBytes(3).toString('hex')}`;
    await this.txnModel.create({
      userId,
      type: WalletTransactionType.Refund,
      amount,
      status: WalletTransactionStatus.Success,
      reference,
      orderCode,
      balanceAfter: wallet.balance,
    });
    return { reference, balanceAfter: wallet.balance };
  }
}
