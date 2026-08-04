import { IsArray, IsMongoId, IsOptional } from 'class-validator';

/**
 * Move products into a category from the admin item picker.
 *
 * Deliberately narrower than the badge equivalent: `Product.category` is a
 * single required field, so there is no "remove from this category" — a
 * product always sits in exactly one. Taking an item out means assigning it
 * somewhere else, which is the same operation pointed at a different category.
 *
 * `stores` moves store docs instead, where membership IS a set
 * (`Store.categories`), so those support both directions.
 */
export class AssignCategoryProductsDto {
  /** Product ids to assign to this category. */
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  add?: string[];

  /** Store ids to add to this category's store list. */
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  addStores?: string[];

  /** Store ids to drop from this category's store list. */
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  removeStores?: string[];
}
