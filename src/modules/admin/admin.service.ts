import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Order, OrderDocument } from '../orders/schemas/order.schema';
import { Store, StoreDocument } from '../catalog/schemas/store.schema';
import {
  RiderProfile,
  RiderProfileDocument,
} from '../rider/schemas/rider-profile.schema';
import {
  FeeSettings,
  FeeSettingsDocument,
} from './schemas/fee-settings.schema';
import {
  FeatureFlag,
  FeatureFlagDocument,
} from './schemas/feature-flag.schema';
import {
  ActivityEvent,
  ActivityEventDocument,
} from './schemas/activity-event.schema';
import { UpdateFeeSettingsDto } from './dto/update-fee-settings.dto';
import { QueryActivityDto } from './dto/query-activity.dto';
import { paginate } from '../../common/dto/paginated-result.dto';

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(Store.name) private storeModel: Model<StoreDocument>,
    @InjectModel(RiderProfile.name)
    private riderProfileModel: Model<RiderProfileDocument>,
    @InjectModel(FeeSettings.name)
    private feeSettingsModel: Model<FeeSettingsDocument>,
    @InjectModel(FeatureFlag.name)
    private featureFlagModel: Model<FeatureFlagDocument>,
    @InjectModel(ActivityEvent.name)
    private activityModel: Model<ActivityEventDocument>,
  ) {}

  async getDashboardKpis() {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [ordersToday, grossVolumeAgg, activeRiders] = await Promise.all([
      this.orderModel.countDocuments({ createdAt: { $gte: startOfDay } }),
      this.orderModel.aggregate([
        { $match: { createdAt: { $gte: startOfDay } } },
        { $group: { _id: null, total: { $sum: '$total' } } },
      ]),
      this.riderProfileModel.countDocuments({ isOnline: true }),
    ]);

    return {
      ordersToday,
      grossVolumeToday: grossVolumeAgg[0]?.total ?? 0,
      activeRiders,
      // Requires a status-transition history (preparing -> out timestamps) to compute for real;
      // placeholder until that log exists.
      avgPrepTimeMins: 24,
    };
  }

  async getActivity(query: QueryActivityDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const filter: Record<string, any> = {};
    if (query.segment) filter.segment = query.segment;
    if (query.q) filter.$text = { $search: query.q };

    const [items, totalItems] = await Promise.all([
      this.activityModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean(),
      this.activityModel.countDocuments(filter),
    ]);

    return paginate(items, totalItems, page, pageSize);
  }

  async logActivity(segment: ActivityEvent['segment'], message: string) {
    await this.activityModel.create({ segment, message });
  }

  async getFeeSettings() {
    let settings = await this.feeSettingsModel.findOne();
    if (!settings) settings = await this.feeSettingsModel.create({});
    return settings.toObject();
  }

  async updateFeeSettings(dto: UpdateFeeSettingsDto) {
    let settings = await this.feeSettingsModel.findOne();
    if (!settings) settings = new this.feeSettingsModel({});
    Object.assign(settings, dto);
    await settings.save();
    return settings.toObject();
  }

  async getFeatureFlags() {
    const items = await this.featureFlagModel.find().sort({ name: 1 }).lean();
    return { items };
  }

  async updateFeatureFlag(id: string, on: boolean) {
    const flag = await this.featureFlagModel.findByIdAndUpdate(
      id,
      { on },
      { new: true },
    );
    if (!flag) throw new NotFoundException('Feature flag not found');
    return flag.toObject();
  }
}
