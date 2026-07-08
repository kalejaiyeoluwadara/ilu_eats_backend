import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { DeliveryMode, PaymentMethod } from '../../../common/enums/order-status.enum';
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

  @ValidateIf((dto) => dto.deliveryMode === DeliveryMode.Door)
  @IsString()
  address?: string;

  @ValidateIf((dto) => dto.deliveryMode === DeliveryMode.Landmark)
  @IsString()
  landmarkId?: string;

  @IsString()
  contactName: string;

  @IsString()
  contactPhone: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;
}
