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
import {
  DeliveryMode,
  PaymentMethod,
} from '../../../common/enums/order-status.enum';
import { SelectedOptionInputDto } from '../../cart/dto/selected-option.dto';

class OrderItemDto {
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

export class CreateOrderDto {
  @IsString()
  storeId: string;

  @IsString()
  storeSlug: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @IsEnum(DeliveryMode)
  deliveryMode: DeliveryMode;

  @ValidateIf((dto: CreateOrderDto) => dto.deliveryMode === DeliveryMode.Door)
  @IsString()
  address?: string;

  @ValidateIf(
    (dto: CreateOrderDto) => dto.deliveryMode === DeliveryMode.Landmark,
  )
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

  @IsString()
  contactName: string;

  @IsString()
  contactPhone: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  referralCode?: string;

  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;
}
