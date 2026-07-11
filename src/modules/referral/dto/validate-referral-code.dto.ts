import { Type } from 'class-transformer';
import { IsInt, IsString, Min } from 'class-validator';

export class ValidateReferralCodeDto {
  @IsString()
  code: string;

  /** The current order subtotal, used to preview the discount. */
  @Type(() => Number)
  @IsInt()
  @Min(0)
  subtotal: number;
}
