import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  ActivityEvent,
  ActivityEventDocument,
  ActivitySegment,
} from './schemas/activity-event.schema';
import { paginate } from '../../common/dto/paginated-result.dto';

export interface ListActivityQuery {
  segment?: ActivitySegment;
  q?: string;
  page?: number;
  pageSize?: number;
}

@Injectable()
export class ActivityService {
  constructor(
    @InjectModel(ActivityEvent.name)
    private activityModel: Model<ActivityEventDocument>,
  ) {}

  async log(segment: ActivitySegment, message: string) {
    await this.activityModel.create({ segment, message });
  }

  async list(query: ListActivityQuery) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const filter: Record<string, any> = {};
    if (query.segment) filter.segment = query.segment;
    if (query.q) filter.$text = { $search: query.q };

    const [items, totalItems] = await Promise.all([
      this.activityModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean(),
      this.activityModel.countDocuments(filter),
    ]);

    return paginate(items, totalItems, page, pageSize);
  }
}
