import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RiderService } from './rider.service';
import { RiderController } from './rider.controller';
import {
  RiderProfile,
  RiderProfileSchema,
} from './schemas/rider-profile.schema';
import { RiderOffer, RiderOfferSchema } from './schemas/rider-offer.schema';
import { RiderJob, RiderJobSchema } from './schemas/rider-job.schema';
import { CloudinaryModule } from '../../cloudinary/cloudinary.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: RiderProfile.name, schema: RiderProfileSchema },
      { name: RiderOffer.name, schema: RiderOfferSchema },
      { name: RiderJob.name, schema: RiderJobSchema },
    ]),
    CloudinaryModule,
  ],
  controllers: [RiderController],
  providers: [RiderService],
  exports: [MongooseModule],
})
export class RiderModule {}
