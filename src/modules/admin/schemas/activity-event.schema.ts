import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ActivitySegment = 'orders' | 'stores' | 'finance' | 'platform';

@Schema({ timestamps: true })
export class ActivityEvent {
  @Prop({ required: true, enum: ['orders', 'stores', 'finance', 'platform'] })
  segment: ActivitySegment;

  @Prop({ required: true })
  message: string;
}

export type ActivityEventDocument = ActivityEvent & Document;
export const ActivityEventSchema = SchemaFactory.createForClass(ActivityEvent);
ActivityEventSchema.index({ message: 'text' });
