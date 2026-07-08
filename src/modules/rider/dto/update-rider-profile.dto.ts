import { IsOptional, IsString } from 'class-validator';

export class UpdateRiderProfileDto {
  @IsOptional()
  @IsString()
  vehicleType?: string;

  @IsOptional()
  @IsString()
  plateNumber?: string;
}
