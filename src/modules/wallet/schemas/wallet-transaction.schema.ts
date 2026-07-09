import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum WalletTransactionType {
  Topup = 'topup',
  OrderPayment = 'order_payment',
  Refund = 'refund',
}

export enum WalletTransactionStatus {
  Pending = 'pending',
  Success = 'success',
  Failed = 'failed',
}

@Schema({ timestamps: true })
export class WalletTransaction {
  _id: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  userId: Types.ObjectId;

  @Prop({ required: true, enum: WalletTransactionType })
  type: WalletTransactionType;

  /** Absolute amount in whole naira; `type` determines credit vs debit. */
  @Prop({ required: true, min: 1 })
  amount: number;

  @Prop({
    required: true,
    enum: WalletTransactionStatus,
    default: WalletTransactionStatus.Pending,
  })
  status: WalletTransactionStatus;

  @Prop({ required: true, unique: true })
  reference: string;

  /** Wallet balance after this transaction settled (null while pending/failed). */
  @Prop({ default: null, type: Number })
  balanceAfter: number | null;

  @Prop({ default: null, type: String })
  orderCode: string | null;

  createdAt: Date;
}

export type WalletTransactionDocument = WalletTransaction & Document;
export const WalletTransactionSchema =
  SchemaFactory.createForClass(WalletTransaction);
WalletTransactionSchema.index({ userId: 1, createdAt: -1 });
