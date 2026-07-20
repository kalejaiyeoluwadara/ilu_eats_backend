import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { OfferLineItem, OfferLineItemSchema } from './rider-offer.schema';
import {
  GeoPoint,
  GeoPointSchema,
} from '../../../common/schemas/geo-point.schema';

export type RiderJobStatus = 'pickup' | 'en_route' | 'done';

@Schema({ timestamps: true })
export class RiderJob {
  _id: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  riderId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'RiderOffer' })
  offerId: Types.ObjectId;

  @Prop({ required: true })
  store: string;

  @Prop({ required: true })
  customer: string;

  @Prop({ required: true })
  address: string;

  // Customer drop-off point [lng, lat], carried from the offer/order so the
  // rider can navigate to the exact spot. Null when the order had no pin.
  @Prop({ type: GeoPointSchema, default: null })
  geo: GeoPoint | null;

  @Prop({ required: true })
  payout: number;

  @Prop({
    required: true,
    enum: ['pickup', 'en_route', 'done'],
    default: 'pickup',
  })
  status: RiderJobStatus;

  @Prop({ required: true })
  phone: string;

  @Prop({ type: [OfferLineItemSchema], default: [] })
  lineItems: OfferLineItem[];

  @Prop({ default: null, type: Date })
  deliveredAt: Date | null;

  /** Managed by `timestamps` — declared so reads are typed, not to define it. */
  createdAt: Date;
}

export type RiderJobDocument = RiderJob & Document;
export const RiderJobSchema = SchemaFactory.createForClass(RiderJob);
RiderJobSchema.index({ riderId: 1, status: 1 });
