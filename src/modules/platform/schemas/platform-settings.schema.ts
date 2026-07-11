import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

/** Singleton document controlling platform-wide ordering availability. */
@Schema({ timestamps: true })
export class PlatformSettings {
  _id: Types.ObjectId;

  /** Kill switch — closes ordering regardless of the schedule. */
  @Prop({ default: false })
  manualClosed: boolean;

  /** When on, ordering is only open between openTime and closeTime. */
  @Prop({ default: false })
  autoScheduleEnabled: boolean;

  /** 24h HH:mm, Africa/Lagos. */
  @Prop({ default: '08:00' })
  openTime: string;

  /** 24h HH:mm, Africa/Lagos. A close before open spans midnight. */
  @Prop({ default: '22:00' })
  closeTime: string;

  @Prop({ default: '' })
  closedMessage: string;

  // --- Distance-based delivery pricing (platform-wide) ---
  // fee = deliveryBaseFee covers deliveryFreeRadiusKm, then deliveryPerKmFee
  // per extra km, clamped to [deliveryMinFee, deliveryMaxFee]. Beyond
  // deliveryMaxRadiusKm a store won't deliver. Amounts in whole naira.
  @Prop({ default: 300 })
  deliveryBaseFee: number;

  @Prop({ default: 100 })
  deliveryPerKmFee: number;

  @Prop({ default: 1 })
  deliveryFreeRadiusKm: number;

  @Prop({ default: 10 })
  deliveryMaxRadiusKm: number;

  @Prop({ default: 200 })
  deliveryMinFee: number;

  @Prop({ default: 2000 })
  deliveryMaxFee: number;
}

export type PlatformSettingsDocument = PlatformSettings & Document;
export const PlatformSettingsSchema =
  SchemaFactory.createForClass(PlatformSettings);
