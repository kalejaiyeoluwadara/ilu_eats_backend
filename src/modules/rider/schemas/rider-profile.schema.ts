import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type DocumentType = 'id' | 'vehicle' | 'insurance';
export type DocumentStatus = 'pending' | 'verified' | 'rejected';

@Schema({ _id: true, timestamps: true })
export class RiderDocument {
  _id: Types.ObjectId;

  @Prop({ required: true, enum: ['id', 'vehicle', 'insurance'] })
  type: DocumentType;

  @Prop({ required: true })
  url: string;

  @Prop({
    required: true,
    enum: ['pending', 'verified', 'rejected'],
    default: 'pending',
  })
  status: DocumentStatus;
}
export const RiderDocumentSchema = SchemaFactory.createForClass(RiderDocument);

@Schema({ timestamps: true })
export class RiderProfile {
  _id: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User', unique: true })
  userId: Types.ObjectId;

  @Prop({ default: false })
  isOnline: boolean;

  @Prop({ default: '' })
  vehicleType: string;

  @Prop({ default: '' })
  plateNumber: string;

  @Prop({ type: [RiderDocumentSchema], default: [] })
  documents: RiderDocument[];
}

export type RiderProfileDocument = RiderProfile & Document;
export const RiderProfileSchema = SchemaFactory.createForClass(RiderProfile);
