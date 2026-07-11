import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  ReferralCode,
  ReferralCodeDocument,
} from './schemas/referral-code.schema';
import { CreateReferralCodeDto } from './dto/create-referral-code.dto';
import { UpdateReferralCodeDto } from './dto/update-referral-code.dto';
import { DiscountType } from '../../common/enums/discount-type.enum';
import { paginate } from '../../common/dto/paginated-result.dto';
import { ActivityService } from '../activity/activity.service';

export interface ReferralDiscount {
  referralId: string;
  code: string;
  discount: number;
}

@Injectable()
export class ReferralService {
  constructor(
    @InjectModel(ReferralCode.name)
    private referralModel: Model<ReferralCodeDocument>,
    private readonly activityService: ActivityService,
  ) {}

  private normalizeCode(code: string): string {
    return code.trim().toUpperCase();
  }

  private serialize(doc: ReferralCodeDocument) {
    return {
      id: doc._id.toString(),
      code: doc.code,
      description: doc.description,
      discountType: doc.discountType,
      discountValue: doc.discountValue,
      maxDiscount: doc.maxDiscount,
      minSubtotal: doc.minSubtotal,
      maxUses: doc.maxUses,
      perUserLimit: doc.perUserLimit,
      usedCount: doc.usedCount,
      active: doc.active,
      expiresAt: doc.expiresAt,
    };
  }

  async create(dto: CreateReferralCodeDto) {
    const code = this.normalizeCode(dto.code);
    const exists = await this.referralModel.exists({ code });
    if (exists) {
      throw new BadRequestException(`Referral code "${code}" already exists`);
    }
    const created = await this.referralModel.create({
      ...dto,
      code,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
    });
    void this.activityService.log(
      'referral',
      `Referral code created · ${created.code}`,
    );
    return this.serialize(created);
  }

  async findAll(page = 1, pageSize = 20) {
    const [items, totalItems] = await Promise.all([
      this.referralModel
        .find()
        .sort({ createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize),
      this.referralModel.countDocuments(),
    ]);
    return paginate(
      items.map((i) => this.serialize(i)),
      totalItems,
      page,
      pageSize,
    );
  }

  async findOne(id: string) {
    const doc = await this.referralModel.findById(id);
    if (!doc) throw new NotFoundException('Referral code not found');
    return this.serialize(doc);
  }

  async update(id: string, dto: UpdateReferralCodeDto) {
    const doc = await this.referralModel.findById(id);
    if (!doc) throw new NotFoundException('Referral code not found');

    const { code, expiresAt, ...rest } = dto;
    if (code) {
      const normalized = this.normalizeCode(code);
      if (normalized !== doc.code) {
        const clash = await this.referralModel.exists({ code: normalized });
        if (clash) {
          throw new BadRequestException(
            `Referral code "${normalized}" already exists`,
          );
        }
        doc.code = normalized;
      }
    }
    if (expiresAt !== undefined) {
      doc.expiresAt = expiresAt ? new Date(expiresAt) : null;
    }
    Object.assign(doc, rest);
    await doc.save();
    return this.serialize(doc);
  }

  async remove(id: string) {
    const result = await this.referralModel.findByIdAndDelete(id);
    if (!result) throw new NotFoundException('Referral code not found');
  }

  private computeDiscount(doc: ReferralCodeDocument, subtotal: number): number {
    let raw =
      doc.discountType === DiscountType.Percentage
        ? (subtotal * doc.discountValue) / 100
        : doc.discountValue;
    if (
      doc.discountType === DiscountType.Percentage &&
      doc.maxDiscount != null
    ) {
      raw = Math.min(raw, doc.maxDiscount);
    }
    // A discount can never exceed the subtotal.
    return Math.min(Math.round(raw), subtotal);
  }

  /**
   * Validates a code for an order and returns the resolved discount.
   * `priorUserUses` is how many times this user has already redeemed the code,
   * used to enforce the per-user limit. Throws on any failed check.
   */
  async validateForOrder(
    code: string,
    subtotal: number,
    priorUserUses: number,
  ): Promise<ReferralDiscount> {
    const normalized = this.normalizeCode(code);
    const doc = await this.referralModel.findOne({ code: normalized });
    if (!doc || !doc.active) {
      throw new BadRequestException('Invalid referral code');
    }
    if (doc.expiresAt && doc.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('This referral code has expired');
    }
    if (subtotal < doc.minSubtotal) {
      throw new BadRequestException(
        `A minimum subtotal of ${doc.minSubtotal} is required to use this code`,
      );
    }
    if (doc.maxUses != null && doc.usedCount >= doc.maxUses) {
      throw new BadRequestException(
        'This referral code has reached its usage limit',
      );
    }
    if (priorUserUses >= doc.perUserLimit) {
      throw new BadRequestException('You have already used this referral code');
    }

    const discount = this.computeDiscount(doc, subtotal);
    return { referralId: doc._id.toString(), code: doc.code, discount };
  }

  /**
   * Atomically increments the redemption counter, respecting maxUses so two
   * concurrent orders cannot push usedCount past the cap.
   */
  async recordRedemption(referralId: string) {
    await this.referralModel.updateOne(
      {
        _id: referralId,
        $or: [
          { maxUses: null },
          { $expr: { $lt: ['$usedCount', '$maxUses'] } },
        ],
      },
      { $inc: { usedCount: 1 } },
    );
  }
}
