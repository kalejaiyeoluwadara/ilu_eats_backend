import { IsNumber, IsOptional, Min } from 'class-validator';

export class UpdateDeliveryPricingDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  deliveryBaseFee?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  deliveryPerKmFee?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  deliveryFreeRadiusKm?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  deliveryMaxRadiusKm?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  deliveryMinFee?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  deliveryMaxFee?: number;
}
