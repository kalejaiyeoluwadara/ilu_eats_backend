import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import {
  GeoPoint,
  GeoPointSchema,
} from '../../../common/schemas/geo-point.schema';

@Schema({ _id: false })
export class OfferLineItem {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  qty: number;

  @Prop({ type: [String], default: [] })
  modifiers: string[];
}
export const OfferLineItemSchema = SchemaFactory.createForClass(OfferLineItem);

@Schema({ timestamps: true })
export class RiderOffer {
  _id: Types.ObjectId;

  @Prop({ default: null, type: Types.ObjectId, ref: 'Order' })
  orderId: Types.ObjectId | null;

  @Prop({ required: true })
  store: string;

  @Prop({ required: true })
  customer: string;

  @Prop({ required: true })
  drop: string;

  // Customer drop-off point [lng, lat], copied from the order so the rider can
  // see the exact spot on a map. Null when the order had no pin (landmark-only).
  @Prop({ type: GeoPointSchema, default: null })
  geo: GeoPoint | null;

  @Prop({ required: true })
  pay: number;

  @Prop({ required: true })
  etaMin: number;

  @Prop({ required: true })
  phone: string;

  @Prop({ default: '' })
  zone: string;

  @Prop({ type: [OfferLineItemSchema], default: [] })
  lineItems: OfferLineItem[];

  @Prop({
    required: true,
    enum: ['available', 'accepted'],
    default: 'available',
  })
  status: 'available' | 'accepted';
}

export type RiderOfferDocument = RiderOffer & Document;
export const RiderOfferSchema = SchemaFactory.createForClass(RiderOffer);
