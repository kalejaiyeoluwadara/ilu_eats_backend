import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Parser as CsvParser } from 'json2csv';
import { Order, OrderDocument } from './schemas/order.schema';
import { CreateOrderDto } from './dto/create-order.dto';
import { QuoteOrderDto } from './dto/quote-order.dto';
import { QueryAdminOrdersDto } from './dto/query-admin-orders.dto';
import { CatalogService } from '../catalog/catalog.service';
import { CartService } from '../cart/cart.service';
import { UsersService } from '../users/users.service';
import { WalletService } from '../wallet/wallet.service';
import { MailService } from '../mail/mail.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import {
  resolveLinePrice,
  type ResolvedOption,
} from '../../common/utils/pricing.util';
import { ActivityService } from '../activity/activity.service';
import { PlatformService } from '../platform/platform.service';
import { ReferralService } from '../referral/referral.service';
import { LandmarkService } from '../landmark/landmark.service';
import {
  DeliveryMode,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from '../../common/enums/order-status.enum';
import { paginate } from '../../common/dto/paginated-result.dto';
import {
  computeDeliveryFee,
  roadDistanceKm,
  LngLat,
} from '../../common/geo/geo.util';

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
    private readonly whatsappService: WhatsappService,
    private readonly activityService: ActivityService,
    private readonly platformService: PlatformService,
    private readonly referralService: ReferralService,
    private readonly landmarkService: LandmarkService,
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
      discount: order.discount,
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
        // Exposed so the orders page can reorder straight back into the cart.
        productId: item.productId?.toString(),
        name: item.name,
        qty: item.qty,
        unitPrice: item.unitPrice,
        modifiers: item.modifiers,
        selectedOptions: item.selectedOptions ?? [],
      })),
      subtotal: order.subtotal,
      referralCode: order.referralCode,
      discount: order.discount,
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
      discount: order.discount,
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

  /**
   * Prices a basket: line items, discount, delivery and service fees.
   *
   * This is the single source of truth for what an order costs. `quoteOrder`
   * shows the customer the result and `createOrder` charges it, so the two can
   * never disagree — a fee the customer wasn't shown is not a fee we charge.
   *
   * Throws on anything that makes the basket unorderable (unknown store/product,
   * mixed stores, an unavailable landmark, an address out of range). It
   * deliberately does *not* enforce the store minimum: a basket under the
   * minimum still has a real, showable price, and the customer needs to see the
   * fees while they decide what else to add. `createOrder` enforces it.
   */
  private async priceOrder(userId: string, dto: QuoteOrderDto) {
    if (dto.items.length === 0) {
      throw new BadRequestException('Order must contain at least one item');
    }

    const store = await this.catalogService.getStoreDocById(dto.storeId);

    // One round-trip for every line, rather than one per line — this runs on
    // each quote (i.e. on every checkout keystroke that changes the basket),
    // so a serial fetch per item would dominate the response time.
    const productIds = [...new Set(dto.items.map((item) => item.productId))];
    if (productIds.some((id) => !Types.ObjectId.isValid(id))) {
      throw new NotFoundException('Product not found');
    }
    const products = await this.catalogService.findProductsByIds(productIds);
    const productById = new Map(products.map((p) => [String(p._id), p]));

    let subtotal = 0;
    const lineItems: {
      productId: Types.ObjectId;
      name: string;
      qty: number;
      unitPrice: number;
      modifiers: string[];
      selectedOptions: ResolvedOption[];
    }[] = [];
    for (const item of dto.items) {
      const product = productById.get(item.productId);
      if (!product) throw new NotFoundException('Product not found');
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
        // Same selection as `modifiers`, kept by id so reorder can rebuild it.
        selectedOptions: resolvedOptions,
      });
    }

    // Resolve any referral code before computing fees so the discount reduces
    // the amount we charge (and the wallet debit in createOrder).
    let referralCode: string | null = null;
    let referralId: string | null = null;
    let discount = 0;
    if (dto.referralCode?.trim()) {
      const priorUserUses = await this.orderModel.countDocuments({
        userId,
        referralCode: dto.referralCode.trim().toUpperCase(),
      });
      const resolved = await this.referralService.validateForOrder(
        dto.referralCode,
        subtotal,
        priorUserUses,
      );
      referralCode = resolved.code;
      referralId = resolved.referralId;
      discount = resolved.discount;
    }

    // Resolve the delivery drop-off point. For landmark orders that's the
    // admin-managed landmark's coordinates; for door orders it's the app's map
    // pin. Either can be missing — then we fall back to the flat store fee.
    let destPoint: LngLat | null = null;
    let landmarkName: string | null = null;
    if (dto.deliveryMode === DeliveryMode.Landmark) {
      const landmark = dto.landmarkId
        ? await this.landmarkService.findByIdSafe(dto.landmarkId)
        : null;
      if (!landmark || !landmark.isActive) {
        throw new BadRequestException('Selected landmark is not available');
      }
      landmarkName = landmark.name;
      if (landmark.geo?.coordinates?.length === 2) {
        destPoint = [landmark.geo.coordinates[0], landmark.geo.coordinates[1]];
      }
    } else if (
      typeof dto.deliveryLat === 'number' &&
      typeof dto.deliveryLng === 'number'
    ) {
      destPoint = [dto.deliveryLng, dto.deliveryLat];
    }

    // Distance-based delivery when both the store and the drop-off have
    // coordinates; otherwise fall back to the store's flat fee.
    let deliveryFee: number;
    let deliveryGeo: { type: 'Point'; coordinates: number[] } | null = null;
    let deliveryDistanceKm: number | null = null;
    if (store.geo?.coordinates?.length === 2 && destPoint) {
      const origin: LngLat = [
        store.geo.coordinates[0],
        store.geo.coordinates[1],
      ];
      deliveryDistanceKm = roadDistanceKm(origin, destPoint);
      const pricing = await this.platformService.getDeliveryPricing();
      const maxRadius =
        store.deliveryRadiusKm > 0
          ? Math.min(store.deliveryRadiusKm, pricing.maxRadiusKm)
          : pricing.maxRadiusKm;
      if (deliveryDistanceKm > maxRadius) {
        throw new BadRequestException(
          `${store.name} doesn't deliver that far — you're about ${deliveryDistanceKm.toFixed(1)}km away (max ${maxRadius}km).`,
        );
      }
      deliveryFee = computeDeliveryFee(deliveryDistanceKm, pricing);
      deliveryGeo = { type: 'Point', coordinates: destPoint };
    } else {
      deliveryFee = store.deliveryFee;
    }
    const serviceFee = computeServiceFee(subtotal);
    const total = Math.max(0, subtotal - discount) + deliveryFee + serviceFee;

    return {
      store,
      lineItems,
      subtotal,
      referralCode,
      referralId,
      discount,
      deliveryFee,
      deliveryGeo,
      deliveryDistanceKm,
      landmarkName,
      serviceFee,
      total,
    };
  }

  /**
   * The price of a basket, for display at checkout. Same computation the charge
   * uses; nothing here is persisted.
   */
  async quoteOrder(userId: string, dto: QuoteOrderDto) {
    const priced = await this.priceOrder(userId, dto);
    return {
      subtotal: priced.subtotal,
      referralCode: priced.referralCode,
      discount: priced.discount,
      deliveryFee: priced.deliveryFee,
      serviceFee: priced.serviceFee,
      total: priced.total,
      deliveryDistanceKm:
        priced.deliveryDistanceKm === null
          ? null
          : Math.round(priced.deliveryDistanceKm * 10) / 10,
      minOrder: priced.store.minOrder,
      meetsMinimum: priced.subtotal >= priced.store.minOrder,
    };
  }

  async createOrder(userId: string, dto: CreateOrderDto) {
    const platform = await this.platformService.getStatus();
    if (!platform.isOpen) {
      throw new BadRequestException(platform.message);
    }

    const {
      store,
      lineItems,
      subtotal,
      referralCode,
      referralId,
      discount,
      deliveryFee,
      deliveryGeo,
      deliveryDistanceKm,
      landmarkName,
      serviceFee,
      total,
    } = await this.priceOrder(userId, dto);

    if (subtotal < store.minOrder) {
      throw new BadRequestException(
        `Subtotal must be at least ${store.minOrder} to meet ${store.name}'s minimum order`,
      );
    }

    const deliveryAddress =
      dto.deliveryMode === DeliveryMode.Door
        ? (dto.address ?? '')
        : (landmarkName ?? '');

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
        deliveryGeo,
        deliveryDistanceKm,
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
        referralCode,
        discount,
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

    if (referralId) {
      void this.referralService.recordRedemption(referralId);
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
      referralCode: order.referralCode,
      discount: order.discount,
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
        subtotal: order.subtotal,
        discount: order.discount,
        referralCode: order.referralCode,
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

    if (status === OrderStatus.Preparing) {
      void this.whatsappService.sendOrderPrepared(order.customerPhone, {
        customerName: order.customerName,
        orderCode: order.orderCode,
        storeName: order.storeName,
      });
    }

    if (status === OrderStatus.Delivered) {
      void this.sendOrderDeliveredEmail(order);
      void this.whatsappService.sendOrderDelivered(order.customerPhone, {
        customerName: order.customerName,
        orderCode: order.orderCode,
      });
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
    void this.whatsappService.sendOrderDelivered(order.customerPhone, {
      customerName: order.customerName,
      orderCode: order.orderCode,
    });
  }

  async notifyRiderAssigned(
    orderId: string,
    riderName: string,
    riderPhone: string | null,
  ) {
    const order = await this.orderModel.findById(orderId);
    if (!order) return;
    void this.sendRiderAssignedEmail(order, riderName, riderPhone);
    void this.whatsappService.sendRiderAssigned(order.customerPhone, {
      customerName: order.customerName,
      riderName,
      orderCode: order.orderCode,
    });
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
