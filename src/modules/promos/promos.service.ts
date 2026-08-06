import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { PromoCode, PromoCodeDocument, PromoDiscountType, PromoScope } from './schemas/promo-code.schema';
import { Order, OrderDocument } from '../orders/schemas/order.schema';
import { Store, StoreDocument } from '../catalog/schemas/store.schema';
import { ValidatePromoDto } from './dto/validate-promo.dto';
import { CreatePromoDto } from './dto/create-promo.dto';
import { UpdatePromoDto } from './dto/update-promo.dto';

export interface PromoValidationResult {
  valid: boolean;
  code: string;
  title: string;
  discountType: PromoDiscountType;
  discountAmount: number;
  freeDelivery: boolean;
  message?: string;
}

@Injectable()
export class PromosService {
  constructor(
    @InjectModel(PromoCode.name)
    private promoModel: Model<PromoCodeDocument>,
    @InjectModel(Order.name)
    private orderModel: Model<OrderDocument>,
    @InjectModel(Store.name)
    private storeModel: Model<StoreDocument>,
  ) {}

  /**
   * Validate promo code against current cart & user criteria
   */
  async validatePromo(dto: ValidatePromoDto): Promise<PromoValidationResult> {
    const rawCode = dto.code.trim().toUpperCase();
    const promo = await this.promoModel.findOne({ code: rawCode }).exec();

    if (!promo) {
      throw new NotFoundException(`Promo code "${rawCode}" does not exist`);
    }

    if (!promo.isActive) {
      throw new BadRequestException(`Promo code "${rawCode}" is no longer active`);
    }

    const now = new Date();
    if (promo.startsAt && new Date(promo.startsAt) > now) {
      throw new BadRequestException(`Promo code "${rawCode}" is not valid yet`);
    }
    if (promo.expiresAt && new Date(promo.expiresAt) < now) {
      throw new BadRequestException(`Promo code "${rawCode}" has expired`);
    }

    // Total usage limit check
    if (promo.maxTotalUses !== null && promo.currentUsesCount >= promo.maxTotalUses) {
      throw new BadRequestException(`Promo code "${rawCode}" has reached its maximum usage limit`);
    }

    // Per-user usage limit check
    if (dto.customerPhone && promo.maxUsesPerUser > 0) {
      const userUsageCount = await this.orderModel.countDocuments({
        customerPhone: dto.customerPhone.trim(),
        promoCode: rawCode,
      }).exec();

      if (userUsageCount >= promo.maxUsesPerUser) {
        throw new BadRequestException(
          `You have already used promo code "${rawCode}" the maximum number of allowed times (${promo.maxUsesPerUser})`,
        );
      }
    }

    // Minimum order subtotal check
    if (promo.minOrderSubtotal > 0 && dto.subtotal < promo.minOrderSubtotal) {
      throw new BadRequestException(
        `Promo code "${rawCode}" requires a minimum order subtotal of ₦${promo.minOrderSubtotal.toLocaleString()}`,
      );
    }

    // Scope check: STORE vs VERTICAL vs GLOBAL
    if (promo.scope === PromoScope.STORE) {
      if (!dto.storeId || String(promo.targetStoreId) !== String(dto.storeId)) {
        let storeName = 'a specific store';
        if (promo.targetStoreId) {
          const targetStore = await this.storeModel.findById(promo.targetStoreId).exec();
          if (targetStore) storeName = targetStore.name;
        }
        throw new BadRequestException(
          `Promo code "${rawCode}" is only valid for orders from ${storeName}`,
        );
      }
    } else if (promo.scope === PromoScope.VERTICAL) {
      if (dto.storeId && promo.targetVertical) {
        const store = await this.storeModel.findById(dto.storeId).exec();
        if (store) {
          const storeVertical = store.categories?.includes(promo.targetVertical) || store.slug.includes(promo.targetVertical);
          if (!storeVertical) {
            throw new BadRequestException(
              `Promo code "${rawCode}" is only valid for ${promo.targetVertical} orders`,
            );
          }
        }
      }
    }

    // Calculate discount amount
    let discountAmount = 0;
    let freeDelivery = false;

    if (promo.discountType === PromoDiscountType.FREE_DELIVERY) {
      freeDelivery = true;
      discountAmount = dto.deliveryFee;
    } else if (promo.discountType === PromoDiscountType.FIXED_AMOUNT) {
      discountAmount = Math.min(promo.discountValue, dto.subtotal);
    } else if (promo.discountType === PromoDiscountType.PERCENTAGE) {
      const rawDiscount = (dto.subtotal * promo.discountValue) / 100;
      if (promo.maxDiscountAmount && promo.maxDiscountAmount > 0) {
        discountAmount = Math.min(rawDiscount, promo.maxDiscountAmount);
      } else {
        discountAmount = rawDiscount;
      }
    }

    return {
      valid: true,
      code: promo.code,
      title: promo.title,
      discountType: promo.discountType,
      discountAmount: Math.round(discountAmount),
      freeDelivery,
      message: `Promo code "${promo.code}" applied successfully!`,
    };
  }

  /**
   * Atomically increment usage count when order is placed
   */
  async incrementUsage(code: string): Promise<void> {
    if (!code) return;
    await this.promoModel.updateOne(
      { code: code.trim().toUpperCase() },
      { $inc: { currentUsesCount: 1 } },
    ).exec();
  }

  /* -------------------------------------------------------------------------- */
  /* Admin CRUD Methods                                                         */
  /* -------------------------------------------------------------------------- */

  async findAll(): Promise<PromoCode[]> {
    return this.promoModel.find().sort({ createdAt: -1 }).exec();
  }

  async findOne(id: string): Promise<PromoCode> {
    const promo = await this.promoModel.findById(id).exec();
    if (!promo) throw new NotFoundException('Promo code not found');
    return promo;
  }

  async create(dto: CreatePromoDto): Promise<PromoCode> {
    const code = dto.code.trim().toUpperCase();
    const existing = await this.promoModel.findOne({ code }).exec();
    if (existing) {
      throw new ConflictException(`Promo code "${code}" already exists`);
    }

    const created = new this.promoModel({
      ...dto,
      code,
      targetStoreId: dto.targetStoreId ? new Types.ObjectId(dto.targetStoreId) : null,
      startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
    });

    return created.save();
  }

  async update(id: string, dto: UpdatePromoDto): Promise<PromoCode> {
    const updateData: Record<string, any> = { ...dto };
    if (dto.code) updateData.code = dto.code.trim().toUpperCase();
    if (dto.targetStoreId !== undefined) {
      updateData.targetStoreId = dto.targetStoreId ? new Types.ObjectId(dto.targetStoreId) : null;
    }
    if (dto.startsAt !== undefined) {
      updateData.startsAt = dto.startsAt ? new Date(dto.startsAt) : null;
    }
    if (dto.expiresAt !== undefined) {
      updateData.expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;
    }

    const updated = await this.promoModel.findByIdAndUpdate(id, updateData, { new: true }).exec();
    if (!updated) throw new NotFoundException('Promo code not found');
    return updated;
  }

  async toggleActive(id: string): Promise<PromoCode> {
    const promo = await this.findOne(id);
    promo.isActive = !promo.isActive;
    return (promo as PromoCodeDocument).save();
  }

  async delete(id: string): Promise<{ success: boolean }> {
    const deleted = await this.promoModel.findByIdAndDelete(id).exec();
    if (!deleted) throw new NotFoundException('Promo code not found');
    return { success: true };
  }
}
