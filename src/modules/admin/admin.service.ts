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
import { UpdateFeeSettingsDto } from './dto/update-fee-settings.dto';
import { QueryActivityDto } from './dto/query-activity.dto';
import { ActivityService } from '../activity/activity.service';

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
    private readonly activityService: ActivityService,
  ) {}

  async getDashboardKpis() {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [ordersToday, grossVolumeAgg, activeRiders] = await Promise.all([
      this.orderModel.countDocuments({ createdAt: { $gte: startOfDay } }),
      this.orderModel.aggregate<{ _id: null; total: number }>([
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

  /** Real per-store order counts/volume, computed from the orders collection. */
  async getStoreStats() {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [week, allTime] = await Promise.all([
      this.orderModel.aggregate<{
        _id: any;
        orders7d: number;
        revenue7d: number;
      }>([
        { $match: { createdAt: { $gte: since } } },
        {
          $group: {
            _id: '$storeId',
            orders7d: { $sum: 1 },
            revenue7d: { $sum: '$total' },
          },
        },
      ]),
      this.orderModel.aggregate<{ _id: any; ordersTotal: number }>([
        { $group: { _id: '$storeId', ordersTotal: { $sum: 1 } } },
      ]),
    ]);

    const byStore = new Map<
      string,
      { storeId: string; orders7d: number; revenue7d: number; ordersTotal: number }
    >();
    for (const row of allTime) {
      byStore.set(String(row._id), {
        storeId: String(row._id),
        orders7d: 0,
        revenue7d: 0,
        ordersTotal: row.ordersTotal,
      });
    }
    for (const row of week) {
      const entry = byStore.get(String(row._id)) ?? {
        storeId: String(row._id),
        orders7d: 0,
        revenue7d: 0,
        ordersTotal: 0,
      };
      entry.orders7d = row.orders7d;
      entry.revenue7d = row.revenue7d;
      byStore.set(String(row._id), entry);
    }

    return { items: [...byStore.values()] };
  }

  getActivity(query: QueryActivityDto) {
    return this.activityService.list(query);
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
