import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Landmark, LandmarkDocument } from './schemas/landmark.schema';
import { CreateLandmarkDto } from './dto/create-landmark.dto';
import { UpdateLandmarkDto } from './dto/update-landmark.dto';
import { generateUniqueSlug } from '../../common/utils/slug.util';
import { ActivityService } from '../activity/activity.service';

function geoFromLatLng(
  latitude?: number,
  longitude?: number,
): { type: 'Point'; coordinates: number[] } | null {
  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    return null;
  }
  return { type: 'Point', coordinates: [longitude, latitude] };
}

@Injectable()
export class LandmarkService {
  constructor(
    @InjectModel(Landmark.name)
    private landmarkModel: Model<LandmarkDocument>,
    private readonly activityService: ActivityService,
  ) {}

  /** Public — active landmarks for the customer's delivery picker. */
  async findActive() {
    const items = await this.landmarkModel
      .find({ isActive: true })
      .sort({ area: 1, name: 1 })
      .lean();
    return { items };
  }

  /** Admin — every landmark, active or not. */
  async findAll() {
    const items = await this.landmarkModel
      .find()
      .sort({ area: 1, name: 1 })
      .lean();
    return { items };
  }

  /** Resolve a landmark by id, returning null instead of throwing. */
  async findByIdSafe(id: string): Promise<LandmarkDocument | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return this.landmarkModel.findById(id);
  }

  async create(dto: CreateLandmarkDto) {
    const slug = await generateUniqueSlug(this.landmarkModel, dto.name);
    const geo = geoFromLatLng(dto.latitude, dto.longitude);
    const landmark = await this.landmarkModel.create({
      name: dto.name,
      slug,
      area: dto.area ?? 'Ilishan-Remo',
      description: dto.description ?? '',
      isActive: dto.isActive ?? true,
      ...(geo ? { geo } : {}),
    });
    void this.activityService.log('platform', `Landmark added · ${landmark.name}`);
    return landmark.toObject();
  }

  async update(id: string, dto: UpdateLandmarkDto) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid landmark id');
    }
    const landmark = await this.landmarkModel.findById(id);
    if (!landmark) throw new NotFoundException('Landmark not found');

    const geo = geoFromLatLng(dto.latitude, dto.longitude);
    if (dto.name !== undefined) landmark.name = dto.name;
    if (dto.area !== undefined) landmark.area = dto.area;
    if (dto.description !== undefined) landmark.description = dto.description;
    if (dto.isActive !== undefined) landmark.isActive = dto.isActive;
    if (geo) landmark.geo = geo;
    await landmark.save();

    void this.activityService.log(
      'platform',
      `Landmark updated · ${landmark.name}`,
    );
    return landmark.toObject();
  }

  async remove(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid landmark id');
    }
    const landmark = await this.landmarkModel.findByIdAndDelete(id);
    if (!landmark) throw new NotFoundException('Landmark not found');
    void this.activityService.log(
      'platform',
      `Landmark deleted · ${landmark.name}`,
    );
    return { ok: true };
  }
}
