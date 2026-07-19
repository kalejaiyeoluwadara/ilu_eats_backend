import { IsString, MaxLength, MinLength } from 'class-validator';

export class PlaceDetailsDto {
  /** Same session token used for the autocomplete run that produced this place. */
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  sessionToken!: string;
}
