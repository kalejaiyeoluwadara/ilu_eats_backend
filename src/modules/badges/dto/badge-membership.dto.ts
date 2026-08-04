import { IsArray, IsMongoId, IsOptional } from 'class-validator';

/** Add and/or remove products from a badge in one call, so the admin's
 * "manage items" picker saves its whole diff atomically instead of firing a
 * request per checkbox. */
export class BadgeMembershipDto {
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  add?: string[];

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  remove?: string[];
}
