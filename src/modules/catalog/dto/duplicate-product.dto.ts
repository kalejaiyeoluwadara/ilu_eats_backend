import { IsMongoId, IsOptional } from 'class-validator';

export class DuplicateProductDto {
  /** Copy the product into another store; defaults to the source store. */
  @IsOptional()
  @IsMongoId()
  storeId?: string;
}
