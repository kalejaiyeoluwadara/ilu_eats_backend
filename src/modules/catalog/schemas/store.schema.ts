import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { CategoryId } from '../../../common/enums/category.enum';

@Schema({ timestamps: true })
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

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ default: 0 })
  orders7d: number;
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
