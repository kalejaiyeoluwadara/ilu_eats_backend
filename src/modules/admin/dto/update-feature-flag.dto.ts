import { IsBoolean } from 'class-validator';

export class UpdateFeatureFlagDto {
  @IsBoolean()
  on: boolean;
}
