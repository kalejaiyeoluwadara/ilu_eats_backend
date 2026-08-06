import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { StoreVertical } from '../../../common/enums/store-vertical.enum';

/** Upper bound on a single page, so one request can't ask for the whole DB. */
export const MAX_STORE_PAGE_SIZE = 60;

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

  /**
   * Page size. Omitted means "every match" — kept for the handful of internal
   * callers that genuinely need the whole list; browse pages always send one.
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_STORE_PAGE_SIZE)
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  skip?: number;
}
