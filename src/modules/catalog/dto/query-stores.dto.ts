import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { StoreVertical } from '../../../common/enums/store-vertical.enum';

export class QueryStoresDto {
  @IsOptional()
  @IsEnum(StoreVertical)
  vertical?: StoreVertical;

  @IsOptional()
  // A filter, not a write: an unknown slug should return nothing rather than
  // 400, so this stays a plain string check.
  @IsString()
  category?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  featured?: boolean;

  @IsOptional()
  @IsString()
  q?: string;
}
