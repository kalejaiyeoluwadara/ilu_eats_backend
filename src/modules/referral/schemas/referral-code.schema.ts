import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { DiscountType } from '../../../common/enums/discount-type.enum';

@Schema({ timestamps: true })
export class ReferralCode {
  _id: Types.ObjectId;

  /** Stored uppercased so lookups are case-insensitive. */
  @Prop({ required: true, unique: true, uppercase: true, trim: true })
  code: string;

  @Prop({ default: '' })
  description: string;

  @Prop({ required: true, enum: DiscountType })
  discountType: DiscountType;

  /** Percentage points (0-100) when percentage, or a Naira amount when fixed. */
  @Prop({ required: true, min: 0 })
  discountValue: number;

  /** Optional cap on the discount for percentage codes. null = no cap. */
  @Prop({ default: null, type: Number })
  maxDiscount: number | null;

  /** Minimum subtotal required for the code to apply. */
  @Prop({ default: 0 })
  minSubtotal: number;

  /** Total redemptions allowed across all users. null = unlimited. */
  @Prop({ default: null, type: Number })
  maxUses: number | null;

  /** How many times each user may redeem this code. */
  @Prop({ default: 1 })
  perUserLimit: number;

  @Prop({ default: 0 })
  usedCount: number;

  @Prop({ default: true })
  active: boolean;

  @Prop({ default: null, type: Date })
  expiresAt: Date | null;
}

export type ReferralCodeDocument = ReferralCode & Document;
export const ReferralCodeSchema = SchemaFactory.createForClass(ReferralCode);
