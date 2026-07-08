import { IsEnum, IsOptional, IsString } from 'class-validator';
import { OrderStatus } from '../../../common/enums/order-status.enum';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class QueryAdminOrdersDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @IsOptional()
  @IsString()
  q?: string;
}
