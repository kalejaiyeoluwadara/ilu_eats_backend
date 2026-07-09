import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Parser as CsvParser } from 'json2csv';
import {
  RiderProfile,
  RiderProfileDocument,
} from './schemas/rider-profile.schema';
import { RiderOffer, RiderOfferDocument } from './schemas/rider-offer.schema';
import { RiderJob, RiderJobDocument } from './schemas/rider-job.schema';
import { UpdateRiderProfileDto } from './dto/update-rider-profile.dto';
import { DocumentType } from './schemas/rider-profile.schema';
import { CloudinaryService } from '../../cloudinary/cloudinary.service';
import { paginate } from '../../common/dto/paginated-result.dto';
import { Order, OrderDocument } from '../orders/schemas/order.schema';
import { OrdersService } from '../orders/orders.service';
import { UsersService } from '../users/users.service';
import { CreateRiderDto } from './dto/create-rider.dto';
import { OrderStatus } from '../../common/enums/order-status.enum';
import { Role } from '../../common/enums/role.enum';
import { ActivityService } from '../activity/activity.service';

const TIP_PERCENT = 0.15;

@Injectable()
export class RiderService {
  constructor(
    @InjectModel(RiderProfile.name)
    private profileModel: Model<RiderProfileDocument>,
    @InjectModel(RiderOffer.name) private offerModel: Model<RiderOfferDocument>,
    @InjectModel(RiderJob.name) private jobModel: Model<RiderJobDocument>,
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    private readonly cloudinaryService: CloudinaryService,
    private readonly ordersService: OrdersService,
    private readonly usersService: UsersService,
    private readonly activityService: ActivityService,
  ) {}

  private async getOrCreateProfile(userId: string) {
    let profile = await this.profileModel.findOne({ userId });
    if (!profile) profile = await this.profileModel.create({ userId });
    return profile;
  }

  async listAvailableRiders() {
    const profiles = await this.profileModel
      .find({ isOnline: true })
      .populate('userId', 'name phone')
      .lean();
    return profiles
      .filter((profile) => profile.userId)
      .map((profile) => {
        const user = profile.userId as unknown as {
          _id: { toString(): string };
          name: string;
          phone: string | null;
        };
        return {
          riderId: user._id.toString(),
          name: user.name,
          phone: user.phone,
          vehicleType: profile.vehicleType,
          plateNumber: profile.plateNumber,
        };
      });
  }

  /** Full roster for the admin console: every rider account, online or not. */
  async listAllRiders() {
    const riders = await this.usersService.findByRole(Role.Rider);
    const profiles = await this.profileModel
      .find({ userId: { $in: riders.map((r) => r._id) } })
      .lean();
    const profileByUser = new Map(
      profiles.map((p) => [p.userId.toString(), p]),
    );
    return riders.map((rider) => {
      const profile = profileByUser.get(rider._id.toString());
      return {
        riderId: rider._id.toString(),
        name: rider.name,
        email: rider.email,
        phone: rider.phone,
        isOnline: profile?.isOnline ?? false,
        vehicleType: profile?.vehicleType ?? '',
        plateNumber: profile?.plateNumber ?? '',
      };
    });
  }

  async createRider(dto: CreateRiderDto) {
    const user = await this.usersService.createOperator(
      dto.name,
      dto.email,
      dto.password,
      Role.Rider,
      dto.phone,
    );
    await this.profileModel.create({
      userId: user._id,
      vehicleType: dto.vehicleType ?? '',
      plateNumber: dto.plateNumber ?? '',
    });
    void this.activityService.log('platform', `Rider account created · ${user.name}`);
    return {
      riderId: user._id.toString(),
      name: user.name,
      email: user.email,
      phone: user.phone,
      isOnline: false,
      vehicleType: dto.vehicleType ?? '',
      plateNumber: dto.plateNumber ?? '',
    };
  }

  async assignRiderToOrder(orderCode: string, riderId: string) {
    const order = await this.orderModel.findOne({ orderCode });
    if (!order) throw new NotFoundException('Order not found');
    if (order.status !== OrderStatus.Preparing) {
      throw new ConflictException(
        `Cannot assign a rider to an order in status ${order.status}`,
      );
    }

    // Online status isn't enforced yet — admins can assign any rider account
    // manually while there's no rider self-accept flow to rely on.
    const riderUser = await this.usersService.findById(riderId);
    if (!riderUser || riderUser.role !== Role.Rider) {
      throw new NotFoundException('Rider not found');
    }

    const offer = await this.offerModel.create({
      orderId: order._id,
      store: order.storeName,
      customer: order.customerName,
      drop: order.deliveryAddress,
      pay: order.deliveryFee,
      etaMin: order.estimatedDeliveryWindow[1] ?? 45,
      phone: order.customerPhone,
      zone: '',
      lineItems: order.lineItems.map((item) => ({
        name: item.name,
        qty: item.qty,
        modifiers: item.modifiers,
      })),
      status: 'accepted',
    });

    const job = await this.jobModel.create({
      riderId,
      offerId: offer._id,
      store: offer.store,
      customer: offer.customer,
      address: offer.drop,
      payout: offer.pay,
      status: 'pickup',
      phone: offer.phone,
      lineItems: offer.lineItems,
    });

    order.riderId = new Types.ObjectId(riderId);
    order.riderJobId = job._id;
    order.assignedAt = new Date();
    order.status = OrderStatus.Assigned;
    await order.save();

    const rider = await this.usersService.findById(riderId);
    void this.activityService.log(
      'orders',
      `Rider assigned · ${order.orderCode} · ${rider?.name ?? 'Rider'}`,
    );

    return this.ordersService.findOrderByCode(orderCode);
  }

  async getOffers(userId: string) {
    const profile = await this.getOrCreateProfile(userId);
    if (!profile.isOnline) return { items: [] };
    const items = await this.offerModel
      .find({ status: 'available' })
      .limit(10)
      .lean();
    return { items };
  }

  async setOnline(userId: string, isOnline: boolean) {
    const profile = await this.getOrCreateProfile(userId);
    profile.isOnline = isOnline;
    await profile.save();
    return { isOnline: profile.isOnline };
  }

  async acceptOffer(userId: string, offerId: string) {
    const offer = await this.offerModel.findById(offerId);
    if (!offer || offer.status !== 'available') {
      throw new ConflictException('Offer no longer available');
    }

    const existingActive = await this.jobModel.exists({
      riderId: userId,
      offerId: offer._id,
      status: { $ne: 'done' },
    });
    if (existingActive) {
      throw new ConflictException(
        'Rider already has an active job for this offer',
      );
    }

    offer.status = 'accepted';
    await offer.save();

    const job = await this.jobModel.create({
      riderId: userId,
      offerId: offer._id,
      store: offer.store,
      customer: offer.customer,
      address: offer.drop,
      payout: offer.pay,
      status: 'pickup',
      phone: offer.phone,
      lineItems: offer.lineItems,
    });

    return this.serializeJob(job);
  }

  private serializeJob(job: RiderJobDocument) {
    return {
      id: job._id.toString(),
      store: job.store,
      customer: job.customer,
      address: job.address,
      payout: job.payout,
      status: job.status,
      phone: job.phone,
      lineItems: job.lineItems,
    };
  }

  async getJobs(
    userId: string,
    status: string | undefined,
    page: number,
    pageSize: number,
  ) {
    const filter: Record<string, any> = { riderId: userId };
    if (status) filter.status = status;

    const [items, totalItems] = await Promise.all([
      this.jobModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize),
      this.jobModel.countDocuments(filter),
    ]);

    return paginate(
      items.map((j) => this.serializeJob(j)),
      totalItems,
      page,
      pageSize,
    );
  }

  private async findRiderJob(userId: string, jobId: string) {
    const job = await this.jobModel.findOne({ _id: jobId, riderId: userId });
    if (!job) throw new NotFoundException('Job not found');
    return job;
  }

  async pickup(userId: string, jobId: string) {
    const job = await this.findRiderJob(userId, jobId);
    if (job.status !== 'pickup') {
      throw new ConflictException('Job is not in pickup state');
    }
    job.status = 'en_route';
    await job.save();

    await this.orderModel.updateOne(
      { riderJobId: job._id, status: OrderStatus.Assigned },
      { status: OrderStatus.Out, outForDeliveryAt: new Date() },
    );

    return this.serializeJob(job);
  }

  async deliver(userId: string, jobId: string) {
    const job = await this.findRiderJob(userId, jobId);
    if (job.status !== 'en_route') {
      throw new ConflictException('Job is not en route');
    }
    job.status = 'done';
    job.tip = Math.round(job.payout * TIP_PERCENT);
    job.deliveredAt = new Date();
    await job.save();

    const order = await this.orderModel.findOneAndUpdate(
      { riderJobId: job._id, status: OrderStatus.Out },
      { status: OrderStatus.Delivered, deliveredAt: new Date() },
    );
    if (order) {
      void this.ordersService.markDeliveredSideEffects(order._id.toString());
    }

    return { job: this.serializeJob(job), tip: job.tip };
  }

  async getEarningsSummary(userId: string) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const jobsToday = await this.jobModel.find({
      riderId: userId,
      status: 'done',
      deliveredAt: { $gte: startOfDay },
    });

    const basePayouts = jobsToday.reduce((sum, job) => sum + job.payout, 0);
    const tips = jobsToday.reduce((sum, job) => sum + job.tip, 0);
    const deliveriesToday = jobsToday.length;

    return {
      basePayouts,
      peakBonuses: 0,
      tips,
      deliveriesToday,
      onTimePercent: deliveriesToday === 0 ? 100 : 100,
    };
  }

  async getEarningsLedger(userId: string, page: number, pageSize: number) {
    const filter: Record<string, any> = { riderId: userId, status: 'done' };
    const [items, totalItems] = await Promise.all([
      this.jobModel
        .find(filter)
        .sort({ deliveredAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize),
      this.jobModel.countDocuments(filter),
    ]);
    return paginate(
      items.map((j) => this.serializeJob(j)),
      totalItems,
      page,
      pageSize,
    );
  }

  async getStatement(userId: string, from?: string, to?: string) {
    const deliveredAtRange: { $gte?: Date; $lte?: Date } = {};
    if (from) deliveredAtRange.$gte = new Date(from);
    if (to) deliveredAtRange.$lte = new Date(to);

    const filter: Record<string, any> = { riderId: userId, status: 'done' };
    if (from || to) filter.deliveredAt = deliveredAtRange;

    const jobs = await this.jobModel.find(filter).sort({ deliveredAt: -1 });
    const rows = jobs.map((job) => ({
      id: job._id.toString(),
      store: job.store,
      customer: job.customer,
      payout: job.payout,
      tip: job.tip,
      deliveredAt: job.deliveredAt?.toISOString() ?? '',
    }));

    const parser = new CsvParser({
      fields: ['id', 'store', 'customer', 'payout', 'tip', 'deliveredAt'],
    });
    return parser.parse(rows);
  }

  async getProfile(userId: string) {
    const profile = await this.getOrCreateProfile(userId);
    return profile.toObject();
  }

  async updateProfile(userId: string, dto: UpdateRiderProfileDto) {
    const profile = await this.getOrCreateProfile(userId);
    Object.assign(profile, dto);
    await profile.save();
    return profile.toObject();
  }

  async addDocument(
    userId: string,
    type: DocumentType,
    file: Express.Multer.File,
  ) {
    const profile = await this.getOrCreateProfile(userId);
    const upload = await this.cloudinaryService.uploadFile(
      file,
      'rider-documents',
    );
    profile.documents.push({
      type,
      url: upload.secure_url,
      status: 'pending',
    });
    await profile.save();
    return profile.toObject();
  }
}
