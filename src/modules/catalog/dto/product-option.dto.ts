import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsString,
  ValidateNested,
} from 'class-validator';

export class ProductChoiceDto {
  @IsString()
  id: string;

  @IsString()
  name: string;

  @IsNumber()
  priceDelta: number;
}

export class ProductOptionDto {
  @IsString()
  id: string;

  @IsString()
  name: string;

  @IsBoolean()
  required: boolean;

  @IsBoolean()
  multi: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductChoiceDto)
  choices: ProductChoiceDto[];
}
