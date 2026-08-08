import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum PromoDiscountType {
  FIXED_AMOUNT = 'FIXED_AMOUNT',
  PERCENTAGE = 'PERCENTAGE',
  FREE_DELIVERY = 'FREE_DELIVERY',
}

export enum PromoScope {
  GLOBAL = 'GLOBAL',
  VERTICAL = 'VERTICAL',
  STORE = 'STORE',
}

@Schema({ timestamps: true })
export class PromoCode {
  _id: Types.ObjectId;

  @Prop({ required: true, unique: true, uppercase: true, trim: true })
  code: string;

  @Prop({ required: true })
  title: string;

  @Prop({ default: '' })
  description: string;

  @Prop({
    required: true,
    enum: PromoDiscountType,
    default: PromoDiscountType.FIXED_AMOUNT,
  })
  discountType: PromoDiscountType;

  /** Amount in Naira for FIXED_AMOUNT, or percentage 1-100 for PERCENTAGE. 0 for FREE_DELIVERY */
  @Prop({ required: true, default: 0 })
  discountValue: number;

  /** Maximum discount cap in Naira when discountType is PERCENTAGE. Null means uncapped. */
  @Prop({ default: null, type: Number })
  maxDiscountAmount: number | null;

  /** Minimum subtotal in Naira required to apply this promo code. */
  @Prop({ default: 0 })
  minOrderSubtotal: number;

  @Prop({ required: true, enum: PromoScope, default: PromoScope.GLOBAL })
  scope: PromoScope;

  /** Target vertical slug (e.g. 'restaurants', 'farms', 'shops') if scope is VERTICAL. */
  @Prop({ default: null, type: String })
  targetVertical: string | null;

  /** Target store ID if scope is STORE. */
  @Prop({ default: null, type: Types.ObjectId, ref: 'Store' })
  targetStoreId: Types.ObjectId | null;

  /** Total number of times this code can be used across all customers. Null = unlimited. */
  @Prop({ default: null, type: Number })
  maxTotalUses: number | null;

  /** Maximum times a single customer phone/user can use this promo code. Default 1. */
  @Prop({ default: 1 })
  maxUsesPerUser: number;

  /** Total count of times this promo code has been successfully redeemed on placed orders. */
  @Prop({ default: 0 })
  currentUsesCount: number;

  @Prop({ default: null, type: Date })
  startsAt: Date | null;

  @Prop({ default: null, type: Date })
  expiresAt: Date | null;

  @Prop({ default: true })
  isActive: boolean;
}

export type PromoCodeDocument = PromoCode & Document;
export const PromoCodeSchema = SchemaFactory.createForClass(PromoCode);

// `code` already gets its unique index from @Prop({ unique: true }) above —
// declaring it again here is what produced Mongoose's "Duplicate schema index
// on {"code":1}" warning on every boot.
PromoCodeSchema.index({ isActive: 1, expiresAt: 1 });
