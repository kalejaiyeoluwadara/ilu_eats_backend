import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Parser as CsvParser } from 'json2csv';
import { Order, OrderDocument } from './schemas/order.schema';
import { CreateOrderDto } from './dto/create-order.dto';
import { QueryAdminOrdersDto } from './dto/query-admin-orders.dto';
import { CatalogService } from '../catalog/catalog.service';
import { CartService } from '../cart/cart.service';
import { UsersService } from '../users/users.service';
import { WalletService } from '../wallet/wallet.service';
import { MailService } from '../mail/mail.service';
import { resolveLinePrice } from '../../common/utils/pricing.util';
import { ActivityService } from '../activity/activity.service';
import { PlatformService } from '../platform/platform.service';
import {
  DeliveryMode,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from '../../common/enums/order-status.enum';
import { paginate } from '../../common/dto/paginated-result.dto';

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  [PaymentMethod.Card]: 'Card',
  [PaymentMethod.Transfer]: 'Bank Transfer',
  [PaymentMethod.Cash]: 'Cash on Delivery',
  [PaymentMethod.Wallet]: 'Wallet',
};

/**
 * Mirrors the frontend's checkout display formula exactly (app/checkout/page.tsx)
 * so the amount shown to the customer always matches what Paystack actually charges.
 */
function computeServiceFee(subtotal: number): number {
  if (subtotal <= 0) return 0;
  return Math.min(500, Math.max(100, Math.round((subtotal * 0.05) / 50) * 50));
}

const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.New]: [OrderStatus.Preparing],
  [OrderStatus.Preparing]: [OrderStatus.Assigned],
  [OrderStatus.Assigned]: [OrderStatus.Out],
  [OrderStatus.Out]: [OrderStatus.Delivered],
  [OrderStatus.Delivered]: [],
};

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    private readonly catalogService: CatalogService,
    private readonly cartService: CartService,
    private readonly usersService: UsersService,
    private readonly walletService: WalletService,
    private readonly mailService: MailService,
    private readonly activityService: ActivityService,
    private readonly platformService: PlatformService,
  ) {}

  private async generateOrderCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789';
    let code: string;
    do {
      let suffix = '';
      for (let i = 0; i < 6; i++) {
        suffix += chars[Math.floor(Math.random() * chars.length)];
      }
      code = `ILU-${suffix}`;
    } while (await this.orderModel.exists({ orderCode: code }));
    return code;
  }

  private serializeSummary(order: OrderDocument) {
    return {
      id: order.orderCode,
      status: order.status,
      paymentStatus: order.paymentStatus,
      subtotal: order.subtotal,
      deliveryFee: order.deliveryFee,
      serviceFee: order.serviceFee,
      total: order.total,
      storeName: order.storeName,
      placedAt: order.placedAt,
    };
  }

  private async serializeDetail(order: OrderDocument) {
    let rider: { name: string; phone: string | null } | null = null;
    if (order.riderId) {
      const riderUser = await this.usersService.findById(
        order.riderId.toString(),
      );
      if (riderUser) {
        rider = { name: riderUser.name, phone: riderUser.phone };
      }
    }

    return {
      id: order.orderCode,
      status: order.status,
      storeId: order.storeId.toString(),
      storeSlug: order.storeSlug,
      storeName: order.storeName,
      storeAddress: order.storeAddress,
      customer: order.customerName,
      customerPhone: order.customerPhone,
      deliveryAddress: order.deliveryAddress,
      paymentLabel: order.paymentLabel,
      paymentStatus: order.paymentStatus,
      paymentReference: order.paymentReference,
      lineItems: order.lineItems.map((item) => ({
        name: item.name,
        qty: item.qty,
        unitPrice: item.unitPrice,
        modifiers: item.modifiers,
      })),
      subtotal: order.subtotal,
      deliveryFee: order.deliveryFee,
      serviceFee: order.serviceFee,
      total: order.total,
      placedAt: order.placedAt,
      estimatedDeliveryWindow: order.estimatedDeliveryWindow,
      assignedAt: order.assignedAt,
      outForDeliveryAt: order.outForDeliveryAt,
      deliveredAt: order.deliveredAt,
      rider,
    };
  }

  private async sendOrderConfirmationEmail(order: OrderDocument) {
    const user = await this.usersService.findById(order.userId.toString());
    if (!user) return;
    await this.mailService.sendOrderConfirmationEmail(user.email, {
      customerName: order.customerName,
      orderCode: order.orderCode,
      storeName: order.storeName,
      lineItems: order.lineItems.map((item) => ({
        name: item.name,
        qty: item.qty,
        unitPrice: item.unitPrice,
      })),
      subtotal: order.subtotal,
      deliveryFee: order.deliveryFee,
      serviceFee: order.serviceFee,
      total: order.total,
      estimatedDeliveryWindow: order.estimatedDeliveryWindow,
    });
  }

  private async sendAdminNewOrderEmail(order: OrderDocument) {
    await this.mailService.sendAdminNewOrderEmail({
      orderCode: order.orderCode,
      storeName: order.storeName,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      deliveryAddress: order.deliveryAddress,
      paymentLabel: order.paymentLabel,
      lineItems: order.lineItems.map((item) => ({
        name: item.name,
        qty: item.qty,
        unitPrice: item.unitPrice,
      })),
      total: order.total,
    });
  }

  private async sendOrderDeliveredEmail(order: OrderDocument) {
    const user = await this.usersService.findById(order.userId.toString());
    if (!user) return;
    await this.mailService.sendOrderDeliveredEmail(user.email, {
      customerName: order.customerName,
      orderCode: order.orderCode,
      storeName: order.storeName,
      total: order.total,
    });
  }

  private async sendRiderAssignedEmail(
    order: OrderDocument,
    riderName: string,
    riderPhone: string | null,
  ) {
    const user = await this.usersService.findById(order.userId.toString());
    if (!user) return;
    await this.mailService.sendRiderAssignedEmail(user.email, {
      customerName: order.customerName,
      orderCode: order.orderCode,
      storeName: order.storeName,
      riderName,
      riderPhone,
    });
  }

  async createOrder(userId: string, dto: CreateOrderDto) {
    if (dto.items.length === 0) {
      throw new BadRequestException('Order must contain at least one item');
    }

    const platform = await this.platformService.getStatus();
    if (!platform.isOpen) {
      throw new BadRequestException(platform.message);
    }

    const store = await this.catalogService.getStoreDocById(dto.storeId);

    let subtotal = 0;
    const lineItems: {
      productId: typeof store._id;
      name: string;
      qty: number;
      unitPrice: number;
      modifiers: string[];
    }[] = [];
    for (const item of dto.items) {
      const product = await this.catalogService.getProductDocById(
        item.productId,
      );
      if (product.storeId.toString() !== store._id.toString()) {
        throw new BadRequestException(
          'All items must belong to the same store',
        );
      }
      const { unitPrice, resolvedOptions } = resolveLinePrice(
        product,
        item.selectedOptions,
      );
      subtotal += unitPrice * item.quantity;
      lineItems.push({
        productId: product._id,
        name: product.name,
        qty: item.quantity,
        unitPrice,
        modifiers: resolvedOptions.map((o) => o.name),
      });
    }

    if (subtotal < store.minOrder) {
      throw new BadRequestException(
        `Subtotal must be at least ${store.minOrder} to meet ${store.name}'s minimum order`,
      );
    }

    const deliveryFee = store.deliveryFee;
    const serviceFee = computeServiceFee(subtotal);
    const total = subtotal + deliveryFee + serviceFee;

    const deliveryAddress =
      dto.deliveryMode === DeliveryMode.Door
        ? (dto.address ?? '')
        : `Landmark: ${dto.landmarkId}`;

    const orderCode = await this.generateOrderCode();

    // Wallet orders are settled upfront with an atomic, overdraft-safe debit.
    // If persisting the order fails afterwards, the debit is refunded below.
    const isWallet = dto.paymentMethod === PaymentMethod.Wallet;
    let walletPayment: { reference: string } | null = null;
    if (isWallet) {
      walletPayment = await this.walletService.debitForOrder(
        userId,
        orderCode,
        total,
      );
    }

    let order: OrderDocument;
    try {
      order = await this.orderModel.create({
        orderCode,
        userId,
        storeId: store._id,
        storeSlug: store.slug,
        storeName: store.name,
        storeAddress: store.location,
        customerName: dto.contactName,
        customerPhone: dto.contactPhone,
        deliveryMode: dto.deliveryMode,
        address: dto.address ?? null,
        landmarkId: dto.landmarkId ?? null,
        deliveryAddress,
        notes: dto.notes ?? null,
        paymentMethod: dto.paymentMethod,
        paymentLabel: PAYMENT_LABELS[dto.paymentMethod],
        paymentStatus: isWallet
          ? PaymentStatus.Paid
          : dto.paymentMethod === PaymentMethod.Cash
            ? PaymentStatus.NotApplicable
            : PaymentStatus.Pending,
        paymentReference: walletPayment?.reference ?? null,
        paidAt: isWallet ? new Date() : null,
        lineItems,
        subtotal,
        deliveryFee,
        serviceFee,
        total,
        status: OrderStatus.New,
        placedAt: new Date(),
      });
    } catch (err) {
      if (walletPayment) {
        await this.walletService.creditRefund(userId, orderCode, total);
      }
      throw err;
    }

    await this.cartService.clearCart(userId);

    void this.sendOrderConfirmationEmail(order);
    void this.sendAdminNewOrderEmail(order);
    void this.activityService.log(
      'orders',
      `New order · ${order.orderCode} · ${order.storeName}`,
    );

    return {
      orderId: order.orderCode,
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentRequired: order.paymentStatus === PaymentStatus.Pending,
      subtotal: order.subtotal,
      deliveryFee: order.deliveryFee,
      serviceFee: order.serviceFee,
      total: order.total,
      estimatedDeliveryWindow: order.estimatedDeliveryWindow,
    };
  }

  async findMyOrders(userId: string, page: number, pageSize: number) {
    const filter = { userId };
    const [items, totalItems] = await Promise.all([
      this.orderModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize),
      this.orderModel.countDocuments(filter),
    ]);
    return paginate(
      items.map((o) => this.serializeSummary(o)),
      totalItems,
      page,
      pageSize,
    );
  }

  async findOrderByCode(orderCode: string, userId?: string) {
    const filter: Record<string, any> = { orderCode };
    if (userId) filter.userId = userId;
    const order = await this.orderModel.findOne(filter);
    if (!order) throw new NotFoundException('Order not found');
    return this.serializeDetail(order);
  }

  async findAdminOrders(query: QueryAdminOrdersDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const filter: Record<string, any> = {};
    if (query.status) filter.status = query.status;
    if (query.q) filter.$text = { $search: query.q };

    const [items, totalItems] = await Promise.all([
      this.orderModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize),
      this.orderModel.countDocuments(filter),
    ]);

    return paginate(
      items.map((order) => ({
        id: order.orderCode,
        customer: order.customerName,
        customerPhone: order.customerPhone,
        deliveryAddress: order.deliveryAddress,
        store: order.storeName,
        storeAddress: order.storeAddress,
        paymentLabel: order.paymentLabel,
        total: order.total,
        deliveryFee: order.deliveryFee,
        serviceFee: order.serviceFee,
        status: order.status,
        placedAt: order.placedAt,
        lineItems: order.lineItems.map((item) => ({
          name: item.name,
          qty: item.qty,
          unitPrice: item.unitPrice,
          modifiers: item.modifiers,
        })),
      })),
      totalItems,
      page,
      pageSize,
    );
  }

  async findAdminOrderDetail(orderCode: string) {
    return this.findOrderByCode(orderCode);
  }

  async updateStatus(orderCode: string, status: OrderStatus) {
    const order = await this.orderModel.findOne({ orderCode });
    if (!order) throw new NotFoundException('Order not found');

    const allowed = VALID_TRANSITIONS[order.status];
    if (!allowed.includes(status)) {
      throw new BadRequestException(
        `Cannot transition order from ${order.status} to ${status}`,
      );
    }

    order.status = status;
    if (status === OrderStatus.Out) {
      order.outForDeliveryAt = new Date();
    }
    if (status === OrderStatus.Delivered) {
      order.deliveredAt = new Date();
    }
    await order.save();

    if (status === OrderStatus.Delivered) {
      void this.sendOrderDeliveredEmail(order);
      void this.activityService.log(
        'orders',
        `Order delivered · ${order.orderCode} · ${order.storeName}`,
      );
    }

    return this.serializeDetail(order);
  }

  async markDeliveredSideEffects(orderId: string) {
    const order = await this.orderModel.findById(orderId);
    if (!order) return;
    void this.sendOrderDeliveredEmail(order);
  }

  async notifyRiderAssigned(
    orderId: string,
    riderName: string,
    riderPhone: string | null,
  ) {
    const order = await this.orderModel.findById(orderId);
    if (!order) return;
    void this.sendRiderAssignedEmail(order, riderName, riderPhone);
  }

  async exportCsv(query: QueryAdminOrdersDto) {
    const filter: Record<string, any> = {};
    if (query.status) filter.status = query.status;
    if (query.q) filter.$text = { $search: query.q };

    const orders = await this.orderModel.find(filter).sort({ createdAt: -1 });
    const rows = orders.map((order) => ({
      id: order.orderCode,
      customer: order.customerName,
      store: order.storeName,
      status: order.status,
      total: order.total,
      placedAt: order.placedAt.toISOString(),
    }));

    const parser = new CsvParser({
      fields: ['id', 'customer', 'store', 'status', 'total', 'placedAt'],
    });
    return parser.parse(rows);
  }
}
