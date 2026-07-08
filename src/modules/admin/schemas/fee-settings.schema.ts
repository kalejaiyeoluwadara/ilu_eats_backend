import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type Zone = 'ilisan-core' | 'ilisan-extended' | 'campus';

@Schema({ timestamps: true })
export class FeeSettings {
  @Prop({ required: true, default: 12 })
  platformFeePercent: number;

  @Prop({
    required: true,
    enum: ['ilisan-core', 'ilisan-extended', 'campus'],
    default: 'ilisan-core',
  })
  zone: Zone;
}

export type FeeSettingsDocument = FeeSettings & Document;
export const FeeSettingsSchema = SchemaFactory.createForClass(FeeSettings);
