import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { CategoryId } from '../../../common/enums/category.enum';
import { ProductOptionDto } from './product-option.dto';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty({ message: 'name should not be empty' })
  name: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(1, { message: 'price must be at least ₦1' })
  price: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  oldPrice?: number;

  @IsEnum(CategoryId)
  category: CategoryId;

  @IsOptional()
  @IsString()
  image?: string;

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  isPopular?: boolean;

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  isNew?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  rating?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  reviews?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductOptionDto)
  options?: ProductOptionDto[];
}
