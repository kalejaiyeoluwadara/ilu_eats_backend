import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Role } from '../../../common/enums/role.enum';
import { AuthProvider } from '../../../common/enums/auth-provider.enum';
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

  /** How the account was first created. Google accounts get a throwaway password hash. */
  @Prop({
    required: true,
    enum: AuthProvider,
    default: AuthProvider.Local,
  })
  authProvider: AuthProvider;

  /**
   * False for Google accounts until the owner sets a password of their own (via
   * the reset flow). Sign-in checks this so we can tell them to use Google
   * instead of failing with a bogus "incorrect password".
   */
  @Prop({ default: true })
  hasPassword: boolean;

  /** When true the account is barred: its credentials/token are rejected at auth time. */
  @Prop({ default: false })
  isBlocked: boolean;

  @Prop({ default: null, type: Date })
  blockedAt: Date | null;

  @Prop({ type: [AddressSchema], default: [] })
  addresses: Types.DocumentArray<Address>;

  @Prop({ type: [String], default: [] })
  favoriteProductIds: string[];

  /** SHA-256 hash of the active password-reset token (raw token is emailed, never stored). */
  @Prop({ default: null, type: String })
  passwordResetTokenHash: string | null;

  @Prop({ default: null, type: Date })
  passwordResetExpires: Date | null;

  createdAt: Date;
  updatedAt: Date;
}

export type UserDocument = User & Document;
export const UserSchema = SchemaFactory.createForClass(User);
