import { IsArray, IsMongoId } from 'class-validator';

export class ReorderBadgesDto {
  @IsArray()
  @IsMongoId({ each: true })
  orderedIds: string[];
}
