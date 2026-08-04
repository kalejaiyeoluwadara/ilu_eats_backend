import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryStoresDto {
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
