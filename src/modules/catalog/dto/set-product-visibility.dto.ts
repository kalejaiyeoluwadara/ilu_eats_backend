import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsMongoId,
  IsOptional,
  ValidateIf,
} from 'class-validator';

/** Hide or unhide one item. */
export class SetProductVisibilityDto {
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  hidden: boolean;
}

/**
 * Hide or unhide many items at once — either an explicit list of ids, or every
 * item in a store (`storeId`), which is how an admin takes a whole menu down
 * without selecting each row.
 */
export class BulkSetProductVisibilityDto {
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  hidden: boolean;

  // Required unless the caller is targeting a whole store, so an empty body
  // can never silently hide the entire catalog.
  @ValidateIf((dto: BulkSetProductVisibilityDto) => !dto.storeId)
  @IsArray()
  @ArrayNotEmpty()
  // A cap keeps one request from rewriting the catalog; store-wide changes
  // have their own targeted path above.
  @ArrayMaxSize(500)
  @IsMongoId({ each: true })
  @Type(() => String)
  ids?: string[];

  @IsOptional()
  @IsMongoId()
  storeId?: string;
}
