import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CloudinaryService } from '../../cloudinary/cloudinary.service';
import { UploadImageDto } from './dto/upload-image.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = /^image\/(jpeg|png|webp|gif)$/;

/** Uploads an image and hands back its URL, so forms that already persist an
 * image as a URL string (stores, banners, menu items) can offer a file picker
 * without switching their whole payload to multipart. */
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.Admin)
@Controller('uploads')
export class UploadsController {
  constructor(private readonly cloudinaryService: CloudinaryService) {}

  @Post('image')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_BYTES } }),
  )
  async uploadImage(
    @Body() dto: UploadImageDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('No file was uploaded');
    if (!ALLOWED_MIME.test(file.mimetype)) {
      throw new BadRequestException('Only JPG, PNG, WebP, or GIF images allowed');
    }
    const result = await this.cloudinaryService.uploadFile(file, dto.folder);
    return { url: result.secure_url };
  }
}
