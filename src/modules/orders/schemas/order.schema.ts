import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import {
  DeliveryMode,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from '../../../common/enums/order-status.enum';

@Schema({ _id: false })
export class OrderLineItem {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Product' })
  productId: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  qty: number;

  @Prop({ required: true })
  unitPrice: number;

  @Prop({ type: [String], default: [] })
  modifiers: string[];
}
export const OrderLineItemSchema = SchemaFactory.createForClass(OrderLineItem);

@Schema({ timestamps: true })
export class Order {
  _id: Types.ObjectId;

  @Prop({ required: true, unique: true })
  orderCode: string;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  userId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'Store' })
  storeId: Types.ObjectId;

  @Prop({ required: true })
  storeSlug: string;

  @Prop({ required: true })
  storeName: string;

  @Prop({ default: '' })
  storeAddress: string;

  @Prop({ required: true })
  customerName: string;

  @Prop({ required: true })
  customerPhone: string;

  @Prop({ required: true, enum: DeliveryMode })
  deliveryMode: DeliveryMode;

  @Prop({ default: null, type: String })
  address: string | null;

  @Prop({ default: null, type: String })
  landmarkId: string | null;

  @Prop({ default: '' })
  deliveryAddress: string;

  @Prop({ default: null, type: String })
  notes: string | null;

  @Prop({ required: true, enum: PaymentMethod })
  paymentMethod: PaymentMethod;

  @Prop({ required: true })
  paymentLabel: string;

  @Prop({
    required: true,
    enum: PaymentStatus,
    default: PaymentStatus.Pending,
  })
  paymentStatus: PaymentStatus;

  @Prop({ default: null, type: String })
  paymentReference: string | null;

  @Prop({ default: null, type: Date })
  paidAt: Date | null;

  @Prop({ type: [OrderLineItemSchema], default: [] })
  lineItems: OrderLineItem[];

  @Prop({ required: true })
  subtotal: number;

  @Prop({ default: null, type: String })
  referralCode: string | null;

  @Prop({ default: 0 })
  discount: number;

  @Prop({ required: true })
  deliveryFee: number;

  @Prop({ required: true })
  serviceFee: number;

  @Prop({ required: true })
  total: number;

  @Prop({ required: true, enum: OrderStatus, default: OrderStatus.New })
  status: OrderStatus;

  @Prop({ type: [Number], default: [30, 45] })
  estimatedDeliveryWindow: number[];

  @Prop({ required: true })
  placedAt: Date;

  @Prop({ default: null, type: Types.ObjectId, ref: 'User' })
  riderId: Types.ObjectId | null;

  @Prop({ default: null, type: Types.ObjectId, ref: 'RiderJob' })
  riderJobId: Types.ObjectId | null;

  @Prop({ default: null, type: Date })
  assignedAt: Date | null;

  @Prop({ default: null, type: Date })
  outForDeliveryAt: Date | null;

  @Prop({ default: null, type: Date })
  deliveredAt: Date | null;
}

export type OrderDocument = Order & Document;
export const OrderSchema = SchemaFactory.createForClass(Order);
OrderSchema.index({ userId: 1, createdAt: -1 });
OrderSchema.index({ status: 1, createdAt: -1 });
OrderSchema.index({ customerName: 'text', storeName: 'text' });
