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
import { CacheService } from '../../common/redis/cache.service';

/** Banners are read on every home render and change rarely, so the whole list
 * caches under one versioned namespace; any write bumps the version to refresh
 * it in O(1). Same pattern as the catalog cache. */
const BANNERS_NS = 'banners';
const BANNERS_TTL = 60; // seconds

@Injectable()
export class BannersService {
  constructor(
    @InjectModel(Banner.name) private bannerModel: Model<BannerDocument>,
    private readonly cloudinaryService: CloudinaryService,
    private readonly cache: CacheService,
  ) {}

  async findAll() {
    return this.cache.wrapVersioned(BANNERS_NS, 'all', BANNERS_TTL, async () => {
      const items = await this.bannerModel.find().sort({ order: 1 }).lean();
      return { items };
    });
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
    await this.cache.bumpVersion(BANNERS_NS);
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
    await this.cache.bumpVersion(BANNERS_NS);
    return banner.toObject();
  }

  async remove(id: string) {
    const result = await this.bannerModel.findByIdAndDelete(id);
    if (!result) throw new NotFoundException('Banner not found');
    await this.cache.bumpVersion(BANNERS_NS);
  }

  async reorder(orderedIds: string[]) {
    await Promise.all(
      orderedIds.map((id, index) =>
        this.bannerModel.updateOne({ _id: id }, { $set: { order: index } }),
      ),
    );
    await this.cache.bumpVersion(BANNERS_NS);
    return this.findAll();
  }
}
