import { IsIn } from 'class-validator';
import type { DocumentType } from '../schemas/rider-profile.schema';

export class UploadDocumentDto {
  @IsIn(['id', 'vehicle', 'insurance'])
  type: DocumentType;
}
