import { IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class QueryActivityDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(['orders', 'stores', 'finance', 'platform'])
  segment?: 'orders' | 'stores' | 'finance' | 'platform';

  @IsOptional()
  @IsString()
  q?: string;
}
