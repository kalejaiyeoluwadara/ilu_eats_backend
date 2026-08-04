import { IsArray, IsMongoId } from 'class-validator';

export class ReorderCategoriesDto {
  @IsArray()
  @IsMongoId({ each: true })
  orderedIds: string[];
}
