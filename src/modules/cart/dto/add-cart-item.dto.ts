import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { SelectedOptionInputDto } from './selected-option.dto';

export class AddCartItemDto {
  @IsString()
  productId: string;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SelectedOptionInputDto)
  selectedOptions?: SelectedOptionInputDto[];

  @IsOptional()
  @IsString()
  notes?: string;
}
