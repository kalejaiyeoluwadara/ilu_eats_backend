import { IsString, MaxLength, MinLength } from 'class-validator';

export class AutocompleteDto {
  /** The partial address the user has typed. */
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  q!: string;

  /**
   * Client-generated UUID shared across an autocomplete session and its final
   * Place Details lookup, so Google bills the pair as one session. Kept loose
   * (any non-empty string ≤ 64) — its only job is to be stable within a search.
   */
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  sessionToken!: string;
}
