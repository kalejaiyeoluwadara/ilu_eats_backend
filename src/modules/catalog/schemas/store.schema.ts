import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { CategoryId } from '../../../common/enums/category.enum';
import {
  GeoPoint,
  GeoPointSchema,
} from '../../../common/schemas/geo-point.schema';

@Schema({ timestamps: true, suppressReservedKeysWarning: true })
export class Store {
  _id: Types.ObjectId;

  @Prop({ required: true, unique: true })
  slug: string;

  @Prop({ required: true })
  name: string;

  @Prop({ default: '' })
  tagline: string;

  @Prop({ default: '' })
  description: string;

  @Prop({ default: '' })
  image: string;

  @Prop({ default: '' })
  cover: string;

  @Prop({ type: [String], enum: CategoryId, default: [] })
  categories: CategoryId[];

  @Prop({ default: 0 })
  rating: number;

  @Prop({ default: 0 })
  reviews: number;

  @Prop({ type: [Number], default: [15, 30] })
  deliveryTimeMins: number[];

  @Prop({ default: 0 })
  deliveryFee: number;

  @Prop({ default: 0 })
  minOrder: number;

  @Prop({ default: true })
  isOpen: boolean;

  @Prop({ default: false })
  isFeatured: boolean;

  @Prop({ default: false })
  isNew: boolean;

  @Prop({ default: '' })
  location: string;

  // GeoJSON point [lng, lat] for distance-based fees and near-me discovery.
  // Null for stores not yet geocoded — those are excluded from $geoNear and
  // fall back to the flat `deliveryFee`.
  @Prop({ type: GeoPointSchema, default: null })
  geo: GeoPoint | null;

  // Max delivery distance for this store in km; 0 defers to the platform-wide
  // deliveryMaxRadiusKm.
  @Prop({ default: 0 })
  deliveryRadiusKm: number;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ default: 0 })
  orders7d: number;

  // Hidden house store that owns standalone items not tied to a vendor;
  // excluded from public store listings but resolvable by slug.
  @Prop({ default: false })
  isPlatform: boolean;
}

export type StoreDocument = Store & Document;
export const StoreSchema = SchemaFactory.createForClass(Store);
StoreSchema.index({
  name: 'text',
  tagline: 'text',
  description: 'text',
  location: 'text',
  tags: 'text',
});
StoreSchema.index({ geo: '2dsphere' });
