import { IsInt, Max, Min } from 'class-validator';

export class InitializeTopupDto {
  /** Top-up amount in whole naira. */
  @IsInt()
  @Min(100)
  @Max(500_000)
  amount: number;
}
