import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Banner {
  _id: Types.ObjectId;

  @Prop({ required: true })
  title: string;

  @Prop({ default: '' })
  subtitle: string;

  @Prop({ default: '' })
  cta: string;

  @Prop({ default: '' })
  href: string;

  @Prop({ required: true })
  image: string;

  @Prop({ default: null })
  badge: string | null;

  @Prop({ default: 0 })
  order: number;
}

export type BannerDocument = Banner & Document;
export const BannerSchema = SchemaFactory.createForClass(Banner);
