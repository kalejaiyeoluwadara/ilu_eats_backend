import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Role } from '../../../common/enums/role.enum';
import { Address, AddressSchema } from './address.schema';

@Schema({ timestamps: true })
export class User {
  _id: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: true })
  passwordHash: string;

  @Prop({ default: null, type: String })
  phone: string | null;

  @Prop({ required: true, enum: Role, default: Role.Customer })
  role: Role;

  @Prop({ type: [AddressSchema], default: [] })
  addresses: Types.DocumentArray<Address>;

  @Prop({ type: [String], default: [] })
  favoriteProductIds: string[];

  /** SHA-256 hash of the active password-reset token (raw token is emailed, never stored). */
  @Prop({ default: null, type: String })
  passwordResetTokenHash: string | null;

  @Prop({ default: null, type: Date })
  passwordResetExpires: Date | null;
}

export type UserDocument = User & Document;
export const UserSchema = SchemaFactory.createForClass(User);
