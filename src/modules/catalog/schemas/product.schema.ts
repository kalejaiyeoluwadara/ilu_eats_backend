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

  /**
   * Slug of a Category document. Deliberately NOT `enum: CategoryId` any more
   * — categories are admin-managed content now, so constraining this to the
   * nine compiled-in values would make every newly created category
   * unwritable until a redeploy. Validity is enforced against the categories
   * collection at the DTO layer instead.
   */
  @Prop({ required: true, lowercase: true, trim: true })
  category: string;

  /** Admin kill-switch for a single item: hidden items stay in the database
   * (and on past orders) but are filtered out of every customer-facing read —
   * listings, search, badges, categories, favourites — and can't be added to a
   * cart or ordered. Missing on documents written before this existed, so all
   * public filters test `$ne: true` rather than `false`. */
  @Prop({ default: false, index: true })
  isHidden: boolean;

  @Prop({ default: false })
  isPopular: boolean;

  @Prop({ default: false })
  isNew: boolean;

  /** Badge slugs this item belongs to (see the Badge collection). Denormalised
   * onto the product so a home badge group is one indexed query with no join;
   * the Badge doc owns the label/emoji/ordering, this owns membership. */
  @Prop({ type: [String], default: [], index: true })
  badges: string[];

  @Prop({ default: 0 })
  rating: number;

  @Prop({ default: 0 })
  reviews: number;

  @Prop({ type: [ProductOptionSchema], default: [] })
  options: ProductOption[];
}

/** Scope for every customer-facing product read. `$ne: true` rather than
 * `false` because items written before `isHidden` existed have no field at
 * all, and those must stay visible. */
export const VISIBLE_PRODUCT_FILTER = { isHidden: { $ne: true } } as const;

export type ProductDocument = Product & Document;
export const ProductSchema = SchemaFactory.createForClass(Product);
ProductSchema.index({ storeId: 1, slug: 1 }, { unique: true });
ProductSchema.index({ name: 'text', description: 'text' });
