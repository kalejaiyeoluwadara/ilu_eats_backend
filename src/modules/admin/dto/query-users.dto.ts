import { IsEnum, IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { Role } from '../../../common/enums/role.enum';

export class QueryUsersDto extends PaginationQueryDto {
  /** Free-text match against name, email or phone. */
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @IsOptional()
  @IsIn(['active', 'blocked'])
  status?: 'active' | 'blocked';
}
