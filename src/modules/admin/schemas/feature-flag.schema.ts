import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class FeatureFlag {
  @Prop({ required: true, unique: true })
  key: string;

  @Prop({ required: true })
  name: string;

  @Prop({ default: '' })
  description: string;

  @Prop({ default: false })
  on: boolean;
}

export type FeatureFlagDocument = FeatureFlag & Document;
export const FeatureFlagSchema = SchemaFactory.createForClass(FeatureFlag);
