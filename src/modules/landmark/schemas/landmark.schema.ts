import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import {
  GeoPoint,
  GeoPointSchema,
} from '../../../common/schemas/geo-point.schema';

/**
 * An admin-managed named delivery point (e.g. "Babcock University Main Gate").
 * When it carries coordinates, orders dropped there are priced by distance just
 * like a map pin; without coordinates it's a plain label and falls back to the
 * store's flat fee.
 */
@Schema({ timestamps: true })
export class Landmark {
  _id: Types.ObjectId;

  @Prop({ required: true, unique: true })
  slug: string;

  @Prop({ required: true })
  name: string;

  /** Town / cluster this landmark sits in, e.g. "Ilishan-Remo". */
  @Prop({ default: 'Ilishan-Remo' })
  area: string;

  @Prop({ default: '' })
  description: string;

  @Prop({ type: GeoPointSchema, default: null })
  geo: GeoPoint | null;

  /** Hidden from the customer picker when false, without deleting history. */
  @Prop({ default: true })
  isActive: boolean;
}

export type LandmarkDocument = Landmark & Document;
export const LandmarkSchema = SchemaFactory.createForClass(Landmark);
