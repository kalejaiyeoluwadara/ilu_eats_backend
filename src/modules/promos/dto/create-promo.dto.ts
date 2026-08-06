import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { PromoDiscountType, PromoScope } from '../schemas/promo-code.schema';

export class CreatePromoDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(PromoDiscountType)
  discountType: PromoDiscountType;

  @IsNumber()
  @Min(0)
  discountValue: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxDiscountAmount?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minOrderSubtotal?: number;

  @IsEnum(PromoScope)
  scope: PromoScope;

  @IsOptional()
  @IsString()
  targetVertical?: string | null;

  @IsOptional()
  @IsString()
  targetStoreId?: string | null;

  @IsOptional()
  @IsNumber()
  @Min(1)
  maxTotalUses?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(1)
  maxUsesPerUser?: number;

  @IsOptional()
  startsAt?: string | Date | null;

  @IsOptional()
  expiresAt?: string | Date | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
