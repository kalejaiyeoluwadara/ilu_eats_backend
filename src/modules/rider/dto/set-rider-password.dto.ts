import { IsString, MinLength } from 'class-validator';

export class SetRiderPasswordDto {
  @IsString()
  @MinLength(8)
  password: string;
}
