import {
  IsBoolean,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

const TIME_24H = /^([01]\d|2[0-3]):[0-5]\d$/;

export class UpdatePlatformSettingsDto {
  @IsOptional()
  @IsBoolean()
  manualClosed?: boolean;

  @IsOptional()
  @IsBoolean()
  autoScheduleEnabled?: boolean;

  @IsOptional()
  @Matches(TIME_24H, { message: 'openTime must be HH:mm (24h)' })
  openTime?: string;

  @IsOptional()
  @Matches(TIME_24H, { message: 'closeTime must be HH:mm (24h)' })
  closeTime?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  closedMessage?: string;
}
