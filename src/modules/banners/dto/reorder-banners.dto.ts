import { IsArray, IsString } from 'class-validator';

export class ReorderBannersDto {
  @IsArray()
  @IsString({ each: true })
  orderedIds: string[];
}
