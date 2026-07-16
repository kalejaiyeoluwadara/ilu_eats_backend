import { IsEnum } from 'class-validator';

/** Cloudinary folders the admin console may upload into. Constrained to an enum
 * so a caller can't invent a folder tree that nothing else knows how to find. */
export enum UploadFolder {
  Stores = 'stores',
  Banners = 'banners',
  MenuItems = 'menu-items',
}

export class UploadImageDto {
  @IsEnum(UploadFolder)
  folder: UploadFolder;
}
