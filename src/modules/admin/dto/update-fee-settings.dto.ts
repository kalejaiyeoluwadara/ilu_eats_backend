import { IsIn, IsNumber, IsOptional } from 'class-validator';

export class UpdateFeeSettingsDto {
  @IsOptional()
  @IsNumber()
  platformFeePercent?: number;

  @IsOptional()
  @IsIn(['ilisan-core', 'ilisan-extended', 'campus'])
  zone?: 'ilisan-core' | 'ilisan-extended' | 'campus';
}
