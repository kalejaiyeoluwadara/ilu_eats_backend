import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { DeliveryMode } from '../../../common/enums/order-status.enum';
import { SelectedOptionInputDto } from '../../cart/dto/selected-option.dto';

export class OrderItemDto {
  @IsString()
  productId: string;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SelectedOptionInputDto)
  selectedOptions?: SelectedOptionInputDto[];

  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * Everything needed to price a basket. `CreateOrderDto` extends this so the
 * quote endpoint and the order endpoint are guaranteed to price from the same
 * inputs — the customer cannot be shown one delivery fee and charged another.
 */
export class QuoteOrderDto {
  @IsString()
  storeId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @IsEnum(DeliveryMode)
  deliveryMode: DeliveryMode;

  @ValidateIf((dto: QuoteOrderDto) => dto.deliveryMode === DeliveryMode.Landmark)
  @IsString()
  landmarkId?: string;

  // Drop-off coordinates from the app's map pin/GPS. When supplied together
  // with a geocoded store, delivery is priced by distance; otherwise the
  // store's flat deliveryFee is used.
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  deliveryLat?: number;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  deliveryLng?: number;

  @IsOptional()
  @IsString()
  referralCode?: string;
}
