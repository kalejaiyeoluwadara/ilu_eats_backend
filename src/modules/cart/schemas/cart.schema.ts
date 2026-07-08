import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ _id: false })
export class SelectedOption {
  @Prop({ required: true })
  groupId: string;

  @Prop({ required: true })
  choiceId: string;

  @Prop({ required: true })
  name: string;
}
export const SelectedOptionSchema =
  SchemaFactory.createForClass(SelectedOption);

@Schema({ timestamps: false })
export class CartItem {
  _id: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'Product' })
  productId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'Store' })
  storeId: Types.ObjectId;

  @Prop({ required: true })
  storeSlug: string;

  @Prop({ required: true })
  storeName: string;

  @Prop({ required: true })
  name: string;

  @Prop({ default: '' })
  image: string;

  @Prop({ required: true })
  price: number;

  @Prop({ required: true, default: 1 })
  quantity: number;

  @Prop({ default: null })
  notes: string | null;

  @Prop({ type: [SelectedOptionSchema], default: [] })
  selectedOptions: SelectedOption[];
}
export const CartItemSchema = SchemaFactory.createForClass(CartItem);

@Schema({ timestamps: true })
export class Cart {
  _id: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User', unique: true })
  userId: Types.ObjectId;

  @Prop({ type: [CartItemSchema], default: [] })
  items: Types.DocumentArray<CartItem>;
}

export type CartDocument = Cart & Document;
export const CartSchema = SchemaFactory.createForClass(Cart);
