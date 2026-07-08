import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { CategoryId } from '../../../common/enums/category.enum';

@Schema({ _id: false })
export class ProductChoice {
  @Prop({ required: true })
  id: string;

  @Prop({ required: true })
  name: string;

  @Prop({ default: 0 })
  priceDelta: number;
}
export const ProductChoiceSchema = SchemaFactory.createForClass(ProductChoice);

@Schema({ _id: false })
export class ProductOption {
  @Prop({ required: true })
  id: string;

  @Prop({ required: true })
  name: string;

  @Prop({ default: false })
  required: boolean;

  @Prop({ default: false })
  multi: boolean;

  @Prop({ type: [ProductChoiceSchema], default: [] })
  choices: ProductChoice[];
}
export const ProductOptionSchema = SchemaFactory.createForClass(ProductOption);

@Schema({ timestamps: true, suppressReservedKeysWarning: true })
export class Product {
  _id: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'Store' })
  storeId: Types.ObjectId;

  @Prop({ required: true })
  storeSlug: string;

  @Prop({ required: true })
  slug: string;

  @Prop({ required: true })
  name: string;

  @Prop({ default: '' })
  description: string;

  @Prop({ required: true })
  price: number;

  @Prop({ default: null, type: Number })
  oldPrice: number | null;

  @Prop({ default: '' })
  image: string;

  @Prop({ required: true, enum: CategoryId })
  category: CategoryId;

  @Prop({ default: false })
  isPopular: boolean;

  @Prop({ default: false })
  isNew: boolean;

  @Prop({ default: 0 })
  rating: number;

  @Prop({ default: 0 })
  reviews: number;

  @Prop({ type: [ProductOptionSchema], default: [] })
  options: ProductOption[];
}

export type ProductDocument = Product & Document;
export const ProductSchema = SchemaFactory.createForClass(Product);
ProductSchema.index({ storeId: 1, slug: 1 }, { unique: true });
ProductSchema.index({ name: 'text', description: 'text' });
