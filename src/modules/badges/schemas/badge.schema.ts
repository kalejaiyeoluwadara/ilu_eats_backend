import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

/**
 * An admin-defined grouping of menu items ("Combo", "Late night", "Five star").
 *
 * The badge doc owns everything presentational — label, emoji, colour, the
 * copy for its home section, its position in the feed — while membership lives
 * on the product as a slug in `Product.badges`. That split means adding a new
 * badge is a single insert with no schema change and no deploy, which is the
 * whole point: badges are content, not code.
 */
@Schema({ timestamps: true })
export class Badge {
  _id: Types.ObjectId;

  /** Stable identifier stored on products. Never changes once items reference
   * it — renaming the badge edits `label`, not this. */
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  slug: string;

  /** Chip text on the item card, e.g. "Late night". */
  @Prop({ required: true })
  label: string;

  /** Section heading on the home feed. Falls back to `label` when empty. */
  @Prop({ default: '' })
  title: string;

  /** Section subheading on the home feed, e.g. "Still cooking past 10pm". */
  @Prop({ default: '' })
  subtitle: string;

  @Prop({ default: '' })
  emoji: string;

  /** Hex colour for the chip tint. Empty defers to the client's default. */
  @Prop({ default: '' })
  color: string;

  /** Position of the badge's section in the home feed. */
  @Prop({ default: 0 })
  order: number;

  /** Off hides the badge everywhere — home feed and item chips alike —
   * without deleting it or touching product membership. */
  @Prop({ default: true })
  isActive: boolean;

  /** Off keeps the chip on item cards but drops the home section, for badges
   * that label items without deserving their own row. */
  @Prop({ default: true })
  showOnHome: boolean;

  /** Cap on items in the home section. */
  @Prop({ default: 12 })
  maxItems: number;
}

export type BadgeDocument = Badge & Document;
export const BadgeSchema = SchemaFactory.createForClass(Badge);
BadgeSchema.index({ order: 1 });
