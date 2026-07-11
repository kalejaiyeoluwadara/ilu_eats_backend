import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, Max, Min } from 'class-validator';
import { CategoryId } from '../../../common/enums/category.enum';

export class QueryNearbyStoresDto {
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat: number;

  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  radiusKm?: number;

  @IsOptional()
  @IsEnum(CategoryId)
  category?: CategoryId;
}
