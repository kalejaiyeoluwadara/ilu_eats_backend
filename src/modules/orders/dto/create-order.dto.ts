import { IsEnum, IsOptional, IsString, ValidateIf } from 'class-validator';
import {
  DeliveryMode,
  PaymentMethod,
} from '../../../common/enums/order-status.enum';
import { QuoteOrderDto } from './quote-order.dto';

export class CreateOrderDto extends QuoteOrderDto {
  @IsString()
  storeSlug: string;

  @ValidateIf((dto: CreateOrderDto) => dto.deliveryMode === DeliveryMode.Door)
  @IsString()
  address?: string;

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
