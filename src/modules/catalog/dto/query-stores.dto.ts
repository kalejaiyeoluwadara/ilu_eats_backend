import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { CategoryId } from '../../../common/enums/category.enum';

export class QueryStoresDto {
  @IsOptional()
  @IsEnum(CategoryId)
  category?: CategoryId;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  featured?: boolean;

  @IsOptional()
  @IsString()
  q?: string;
}
