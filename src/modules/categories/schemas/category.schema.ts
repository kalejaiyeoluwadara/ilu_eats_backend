import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

/**
 * A browse category ("Pizza", "Local", "Drinks") — the top-level way users
 * slice the catalog.
 *
 * Categories used to be the `CategoryId` TypeScript enum, which meant adding
 * one required a code change and a deploy. This doc replaces that: the slug
 * stays the stable identifier stored on products and stores, while everything
 * presentational lives here and is editable from admin.
 *
 * Membership differs from badges in one important way. A product has exactly
 * ONE category (`Product.category`), so membership is an assignment, not a
 * set — moving an item in means moving it out of wherever it was. A store, by
 * contrast, carries an ARRAY (`Store.categories`), so it can appear under
 * several.
 */
@Schema({ timestamps: true })
export class Category {
  _id: Types.ObjectId;

  /** Stable identifier stored on products and stores. Renaming the category
   * edits `label`, not this — though renaming the slug does rewrite every
   * referencing doc, see CategoriesService.update. */
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  slug: string;

  /** Display name on the browse rail, e.g. "Local". */
  @Prop({ required: true })
  label: string;

  /** Heading when the category gets its own listing page. Falls back to `label`. */
  @Prop({ default: '' })
  title: string;

  /** Supporting copy on that page, e.g. "Jollof, amala, egusi and more". */
  @Prop({ default: '' })
  subtitle: string;

  /** Illustration for the browse rail. Carries the category's personality the
   * same way badge art does — a drawn icon reads as craft, a tinted pill reads
   * as filler. */
  @Prop({ default: '' })
  image: string;

  /** Fallback mark when no illustration is uploaded yet. */
  @Prop({ default: '' })
  emoji: string;

  /** Hex colour for the soft tile behind an emoji fallback. */
  @Prop({ default: '' })
  color: string;

  /** Position in the browse rail. */
  @Prop({ default: 0 })
  order: number;

  /** Off hides the category from browse without deleting it or touching the
   * products that reference it — they keep their slug and reappear when it is
   * switched back on. */
  @Prop({ default: true })
  isActive: boolean;

  /** Whether the category gets a row on the home feed. */
  @Prop({ default: true })
  showOnHome: boolean;
}

export type CategoryDocument = Category & Document;
export const CategorySchema = SchemaFactory.createForClass(Category);
CategorySchema.index({ order: 1 });
