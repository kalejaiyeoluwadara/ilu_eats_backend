import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  PlatformSettings,
  PlatformSettingsDocument,
} from './schemas/platform-settings.schema';
import { UpdatePlatformSettingsDto } from './dto/update-platform-settings.dto';
import { UpdateDeliveryPricingDto } from './dto/update-delivery-pricing.dto';
import { ActivityService } from '../activity/activity.service';
import { DeliveryPricing } from '../../common/geo/geo.util';
import { CacheService } from '../../common/redis/cache.service';

export type ClosedReason = 'manual' | 'schedule' | null;

/**
 * The subset of settings the public reads need, as a plain (cacheable) object.
 * We cache this snapshot rather than the computed status because open/closed is
 * derived from wall-clock time — caching the snapshot keeps schedule math live
 * to the second while still removing the per-request Mongo read that every
 * status poll and delivery-fee calc would otherwise trigger.
 */
interface SettingsSnapshot {
  manualClosed: boolean;
  autoScheduleEnabled: boolean;
  openTime: string;
  closeTime: string;
  closedMessage: string;
  deliveryBaseFee: number;
  deliveryPerKmFee: number;
  deliveryFreeRadiusKm: number;
  deliveryMaxRadiusKm: number;
  deliveryMinFee: number;
  deliveryMaxFee: number;
}

/** Cache key + TTL for the settings snapshot. Writes invalidate it explicitly,
 * so the TTL is just a safety net against a missed invalidation. */
const SETTINGS_CACHE_KEY = 'platform:settings';
const SETTINGS_CACHE_TTL = 60; // seconds

export interface PlatformStatus {
  isOpen: boolean;
  reason: ClosedReason;
  message: string;
  manualClosed: boolean;
  autoScheduleEnabled: boolean;
  openTime: string;
  closeTime: string;
}

const DEFAULT_CLOSED_MESSAGE =
  "We're closed right now — orders resume when we're back. See you soon!";

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/** Current wall-clock minutes in Africa/Lagos (no DST). */
function nowMinutesInLagos(): number {
  const formatted = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Lagos',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date());
  return toMinutes(formatted);
}

@Injectable()
export class PlatformService {
  constructor(
    @InjectModel(PlatformSettings.name)
    private settingsModel: Model<PlatformSettingsDocument>,
    private readonly activityService: ActivityService,
    private readonly cache: CacheService,
  ) {}

  /** Live Mongoose document — used by the write paths, which need `.save()`. */
  async getSettings() {
    let settings = await this.settingsModel.findOne();
    if (!settings) settings = await this.settingsModel.create({});
    return settings;
  }

  /** Cached plain snapshot for read paths (status + pricing). */
  private async getSnapshot(): Promise<SettingsSnapshot> {
    return this.cache.wrap(SETTINGS_CACHE_KEY, SETTINGS_CACHE_TTL, async () => {
      const s = await this.getSettings();
      return {
        manualClosed: s.manualClosed,
        autoScheduleEnabled: s.autoScheduleEnabled,
        openTime: s.openTime,
        closeTime: s.closeTime,
        closedMessage: s.closedMessage,
        deliveryBaseFee: s.deliveryBaseFee,
        deliveryPerKmFee: s.deliveryPerKmFee,
        deliveryFreeRadiusKm: s.deliveryFreeRadiusKm,
        deliveryMaxRadiusKm: s.deliveryMaxRadiusKm,
        deliveryMinFee: s.deliveryMinFee,
        deliveryMaxFee: s.deliveryMaxFee,
      };
    });
  }

  /** Drop the cached snapshot so the next read reflects a just-saved change. */
  private async invalidateSnapshot(): Promise<void> {
    await this.cache.del(SETTINGS_CACHE_KEY);
  }

  async getStatus(): Promise<PlatformStatus> {
    const s = await this.getSnapshot();

    let isOpen = true;
    let reason: ClosedReason = null;
    if (s.manualClosed) {
      isOpen = false;
      reason = 'manual';
    } else if (s.autoScheduleEnabled) {
      const now = nowMinutesInLagos();
      const open = toMinutes(s.openTime);
      const close = toMinutes(s.closeTime);
      // Equal times mean 24h open; close < open spans midnight.
      const within =
        open === close
          ? true
          : open < close
            ? now >= open && now < close
            : now >= open || now < close;
      if (!within) {
        isOpen = false;
        reason = 'schedule';
      }
    }

    return {
      isOpen,
      reason,
      message: s.closedMessage.trim() || DEFAULT_CLOSED_MESSAGE,
      manualClosed: s.manualClosed,
      autoScheduleEnabled: s.autoScheduleEnabled,
      openTime: s.openTime,
      closeTime: s.closeTime,
    };
  }

  /** Distance-based delivery pricing used by order fees and near-me listings. */
  async getDeliveryPricing(): Promise<DeliveryPricing> {
    const s = await this.getSnapshot();
    return {
      baseFee: s.deliveryBaseFee,
      perKmFee: s.deliveryPerKmFee,
      freeRadiusKm: s.deliveryFreeRadiusKm,
      maxRadiusKm: s.deliveryMaxRadiusKm,
      minFee: s.deliveryMinFee,
      maxFee: s.deliveryMaxFee,
    };
  }

  async updateDeliveryPricing(dto: UpdateDeliveryPricingDto) {
    const settings = await this.getSettings();
    Object.assign(settings, dto);
    await settings.save();
    await this.invalidateSnapshot();
    void this.activityService.log(
      'platform',
      `Delivery pricing updated · ₦${settings.deliveryBaseFee} base + ₦${settings.deliveryPerKmFee}/km (max ${settings.deliveryMaxRadiusKm}km)`,
    );
    return this.getDeliveryPricing();
  }

  async updateSettings(dto: UpdatePlatformSettingsDto) {
    const settings = await this.getSettings();
    const wasManualClosed = settings.manualClosed;
    const wasSchedule = `${settings.autoScheduleEnabled}·${settings.openTime}–${settings.closeTime}`;

    Object.assign(settings, dto);
    await settings.save();
    await this.invalidateSnapshot();

    if (
      dto.manualClosed !== undefined &&
      dto.manualClosed !== wasManualClosed
    ) {
      void this.activityService.log(
        'platform',
        dto.manualClosed
          ? 'Platform closed manually — ordering paused everywhere'
          : 'Platform reopened manually',
      );
    }
    const nowSchedule = `${settings.autoScheduleEnabled}·${settings.openTime}–${settings.closeTime}`;
    if (nowSchedule !== wasSchedule) {
      void this.activityService.log(
        'platform',
        settings.autoScheduleEnabled
          ? `Opening hours set · ${settings.openTime}–${settings.closeTime} (Africa/Lagos)`
          : 'Auto opening hours disabled — open around the clock',
      );
    }

    return this.getStatus();
  }
}
