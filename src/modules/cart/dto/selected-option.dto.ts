import { IsString } from 'class-validator';

export class SelectedOptionInputDto {
  @IsString()
  groupId: string;

  @IsString()
  choiceId: string;
}
