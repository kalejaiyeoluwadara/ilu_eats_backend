import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Parser as CsvParser } from 'json2csv';
import {
  RiderProfile,
  RiderProfileDocument,
} from './schemas/rider-profile.schema';
import { RiderOffer, RiderOfferDocument } from './schemas/rider-offer.schema';
import { RiderJob, RiderJobDocument } from './schemas/rider-job.schema';
import { UpdateRiderProfileDto } from './dto/update-rider-profile.dto';
import { DocumentType } from './schemas/rider-profile.schema';
import { CloudinaryService } from '../../cloudinary/cloudinary.service';
import { paginate } from '../../common/dto/paginated-result.dto';

const TIP_PERCENT = 0.15;

@Injectable()
export class RiderService {
  constructor(
    @InjectModel(RiderProfile.name)
    private profileModel: Model<RiderProfileDocument>,
    @InjectModel(RiderOffer.name) private offerModel: Model<RiderOfferDocument>,
    @InjectModel(RiderJob.name) private jobModel: Model<RiderJobDocument>,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  private async getOrCreateProfile(userId: string) {
    let profile = await this.profileModel.findOne({ userId });
    if (!profile) profile = await this.profileModel.create({ userId });
    return profile;
  }

  async getOffers(userId: string) {
    const profile = await this.getOrCreateProfile(userId);
    if (!profile.isOnline) return { items: [] };
    const items = await this.offerModel
      .find({ status: 'available' })
      .limit(10)
      .lean();
    return { items };
  }

  async setOnline(userId: string, isOnline: boolean) {
    const profile = await this.getOrCreateProfile(userId);
    profile.isOnline = isOnline;
    await profile.save();
    return { isOnline: profile.isOnline };
  }

  async acceptOffer(userId: string, offerId: string) {
    const offer = await this.offerModel.findById(offerId);
    if (!offer || offer.status !== 'available') {
      throw new ConflictException('Offer no longer available');
    }

    const existingActive = await this.jobModel.exists({
      riderId: userId,
      offerId: offer._id,
      status: { $ne: 'done' },
    });
    if (existingActive) {
      throw new ConflictException(
        'Rider already has an active job for this offer',
      );
    }

    offer.status = 'accepted';
    await offer.save();

    const job = await this.jobModel.create({
      riderId: userId,
      offerId: offer._id,
      store: offer.store,
      customer: offer.customer,
      address: offer.drop,
      payout: offer.pay,
      status: 'pickup',
      phone: offer.phone,
      lineItems: offer.lineItems,
    });

    return this.serializeJob(job);
  }

  private serializeJob(job: RiderJobDocument) {
    return {
      id: job._id.toString(),
      store: job.store,
      customer: job.customer,
      address: job.address,
      payout: job.payout,
      status: job.status,
      phone: job.phone,
      lineItems: job.lineItems,
    };
  }

  async getJobs(
    userId: string,
    status: string | undefined,
    page: number,
    pageSize: number,
  ) {
    const filter: Record<string, any> = { riderId: userId };
    if (status) filter.status = status;

    const [items, totalItems] = await Promise.all([
      this.jobModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize),
      this.jobModel.countDocuments(filter),
    ]);

    return paginate(
      items.map((j) => this.serializeJob(j)),
      totalItems,
      page,
      pageSize,
    );
  }

  private async findRiderJob(userId: string, jobId: string) {
    const job = await this.jobModel.findOne({ _id: jobId, riderId: userId });
    if (!job) throw new NotFoundException('Job not found');
    return job;
  }

  async pickup(userId: string, jobId: string) {
    const job = await this.findRiderJob(userId, jobId);
    if (job.status !== 'pickup') {
      throw new ConflictException('Job is not in pickup state');
    }
    job.status = 'en_route';
    await job.save();
    return this.serializeJob(job);
  }

  async deliver(userId: string, jobId: string) {
    const job = await this.findRiderJob(userId, jobId);
    if (job.status !== 'en_route') {
      throw new ConflictException('Job is not en route');
    }
    job.status = 'done';
    job.tip = Math.round(job.payout * TIP_PERCENT);
    job.deliveredAt = new Date();
    await job.save();
    return { job: this.serializeJob(job), tip: job.tip };
  }

  async getEarningsSummary(userId: string) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const jobsToday = await this.jobModel.find({
      riderId: userId,
      status: 'done',
      deliveredAt: { $gte: startOfDay },
    });

    const basePayouts = jobsToday.reduce((sum, job) => sum + job.payout, 0);
    const tips = jobsToday.reduce((sum, job) => sum + job.tip, 0);
    const deliveriesToday = jobsToday.length;

    return {
      basePayouts,
      peakBonuses: 0,
      tips,
      deliveriesToday,
      onTimePercent: deliveriesToday === 0 ? 100 : 100,
    };
  }

  async getEarningsLedger(userId: string, page: number, pageSize: number) {
    const filter: Record<string, any> = { riderId: userId, status: 'done' };
    const [items, totalItems] = await Promise.all([
      this.jobModel
        .find(filter)
        .sort({ deliveredAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize),
      this.jobModel.countDocuments(filter),
    ]);
    return paginate(
      items.map((j) => this.serializeJob(j)),
      totalItems,
      page,
      pageSize,
    );
  }

  async getStatement(userId: string, from?: string, to?: string) {
    const deliveredAtRange: { $gte?: Date; $lte?: Date } = {};
    if (from) deliveredAtRange.$gte = new Date(from);
    if (to) deliveredAtRange.$lte = new Date(to);

    const filter: Record<string, any> = { riderId: userId, status: 'done' };
    if (from || to) filter.deliveredAt = deliveredAtRange;

    const jobs = await this.jobModel.find(filter).sort({ deliveredAt: -1 });
    const rows = jobs.map((job) => ({
      id: job._id.toString(),
      store: job.store,
      customer: job.customer,
      payout: job.payout,
      tip: job.tip,
      deliveredAt: job.deliveredAt?.toISOString() ?? '',
    }));

    const parser = new CsvParser({
      fields: ['id', 'store', 'customer', 'payout', 'tip', 'deliveredAt'],
    });
    return parser.parse(rows);
  }

  async getProfile(userId: string) {
    const profile = await this.getOrCreateProfile(userId);
    return profile.toObject();
  }

  async updateProfile(userId: string, dto: UpdateRiderProfileDto) {
    const profile = await this.getOrCreateProfile(userId);
    Object.assign(profile, dto);
    await profile.save();
    return profile.toObject();
  }

  async addDocument(
    userId: string,
    type: DocumentType,
    file: Express.Multer.File,
  ) {
    const profile = await this.getOrCreateProfile(userId);
    const upload = await this.cloudinaryService.uploadFile(
      file,
      'rider-documents',
    );
    profile.documents.push({
      type,
      url: upload.secure_url,
      status: 'pending',
    });
    await profile.save();
    return profile.toObject();
  }
}
