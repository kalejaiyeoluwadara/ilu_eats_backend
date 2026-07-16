import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { CategoryId } from '../../../common/enums/category.enum';

export class CreateStoreDto {
  @IsString()
  @IsNotEmpty({ message: 'name should not be empty' })
  name: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  tagline?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  location?: string;

  // Coordinates for distance-based delivery + near-me discovery. Both must be
  // supplied together to set the store's geo point.
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  deliveryRadiusKm?: number;

  @IsOptional()
  @IsString()
  image?: string;

  @IsOptional()
  @IsString()
  cover?: string;

  @IsOptional()
  @IsArray()
  @IsEnum(CategoryId, { each: true })
  categories?: CategoryId[];

  @IsOptional()
  @IsArray()
  @Type(() => Number)
  deliveryTimeMins?: number[];

  @IsOptional()
  @IsNumber()
  deliveryFee?: number;

  @IsOptional()
  @IsNumber()
  minOrder?: number;

  @IsOptional()
  @IsNumber()
  rating?: number;

  @IsOptional()
  @IsNumber()
  reviews?: number;

  @IsOptional()
  @IsNumber()
  orders7d?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsBoolean()
  isOpen?: boolean;

  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @IsOptional()
  @IsBoolean()
  isNew?: boolean;
}
