import { IsIn, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class QueryJobsDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(['pickup', 'en_route', 'done'])
  status?: 'pickup' | 'en_route' | 'done';
}
