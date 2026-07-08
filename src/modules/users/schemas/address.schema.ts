import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ _id: true, timestamps: false })
export class Address {
  _id: Types.ObjectId;

  @Prop({ required: true })
  label: string;

  @Prop({ required: true })
  addressLine: string;

  @Prop()
  phone?: string;

  @Prop({ default: false })
  isDefault: boolean;
}

export type AddressDocument = Address & Document;
export const AddressSchema = SchemaFactory.createForClass(Address);
