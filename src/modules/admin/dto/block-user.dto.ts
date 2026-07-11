import { IsBoolean } from 'class-validator';

export class BlockUserDto {
  /** true suspends the account, false restores it. */
  @IsBoolean()
  blocked: boolean;
}
