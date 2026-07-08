import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Banner, BannerDocument } from './schemas/banner.schema';
import { CreateBannerDto } from './dto/create-banner.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';
import { CloudinaryService } from '../../cloudinary/cloudinary.service';

@Injectable()
export class BannersService {
  constructor(
    @InjectModel(Banner.name) private bannerModel: Model<BannerDocument>,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async findAll() {
    const items = await this.bannerModel.find().sort({ order: 1 }).lean();
    return { items };
  }

  async create(dto: CreateBannerDto, file?: Express.Multer.File) {
    const { image: imageUrl, ...rest } = dto;
    if (!file && !imageUrl) {
      throw new BadRequestException('Banner image (file or URL) is required');
    }
    const image = file
      ? (await this.cloudinaryService.uploadFile(file, 'banners')).secure_url
      : (imageUrl as string);
    const count = await this.bannerModel.countDocuments();
    const banner = await this.bannerModel.create({
      ...rest,
      image,
      order: count,
    });
    return banner.toObject();
  }

  async update(id: string, dto: UpdateBannerDto, file?: Express.Multer.File) {
    const banner = await this.bannerModel.findById(id);
    if (!banner) throw new NotFoundException('Banner not found');

    const { image: imageUrl, ...rest } = dto;
    Object.assign(banner, rest);
    if (file) {
      const upload = await this.cloudinaryService.uploadFile(file, 'banners');
      banner.image = upload.secure_url;
    } else if (imageUrl) {
      banner.image = imageUrl;
    }

    await banner.save();
    return banner.toObject();
  }

  async remove(id: string) {
    const result = await this.bannerModel.findByIdAndDelete(id);
    if (!result) throw new NotFoundException('Banner not found');
  }

  async reorder(orderedIds: string[]) {
    await Promise.all(
      orderedIds.map((id, index) =>
        this.bannerModel.updateOne({ _id: id }, { $set: { order: index } }),
      ),
    );
    return this.findAll();
  }
}
