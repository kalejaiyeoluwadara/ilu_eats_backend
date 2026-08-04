import { Injectable } from '@nestjs/common';
import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { CategoriesService } from '../categories.service';

/**
 * Replaces the old `@IsEnum(CategoryId)` on write DTOs.
 *
 * The enum could reject an unknown category at compile time; now that
 * categories are rows, the equivalent check has to hit the collection. This
 * keeps the guarantee that a product can't be filed under a category that
 * doesn't exist, while allowing categories created five minutes ago.
 */
@Injectable()
@ValidatorConstraint({ name: 'isCategorySlug', async: true })
export class IsCategorySlugConstraint implements ValidatorConstraintInterface {
  constructor(private readonly categoriesService: CategoriesService) {}

  async validate(value: unknown) {
    if (typeof value !== 'string' || value.length === 0) return false;
    return this.categoriesService.existsBySlug(value.toLowerCase().trim());
  }

  defaultMessage(args: ValidationArguments) {
    return `"${String(args.value)}" is not an existing category`;
  }
}

/** Field must be the slug of a category that exists. Applies per-element when
 * used with `{ each: true }` on an array. */
export function IsCategorySlug(options?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options,
      constraints: [],
      validator: IsCategorySlugConstraint,
    });
  };
}
