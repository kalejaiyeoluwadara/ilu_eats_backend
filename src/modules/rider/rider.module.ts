import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RiderService } from './rider.service';
import { RiderController } from './rider.controller';
import { RiderAdminController } from './rider-admin.controller';
import {
  RiderProfile,
  RiderProfileSchema,
} from './schemas/rider-profile.schema';
import { RiderOffer, RiderOfferSchema } from './schemas/rider-offer.schema';
import { RiderJob, RiderJobSchema } from './schemas/rider-job.schema';
import { CloudinaryModule } from '../../cloudinary/cloudinary.module';
import { OrdersModule } from '../orders/orders.module';
import { UsersModule } from '../users/users.module';
import { ActivityModule } from '../activity/activity.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: RiderProfile.name, schema: RiderProfileSchema },
      { name: RiderOffer.name, schema: RiderOfferSchema },
      { name: RiderJob.name, schema: RiderJobSchema },
    ]),
    CloudinaryModule,
    OrdersModule,
    UsersModule,
    ActivityModule,
  ],
  controllers: [RiderController, RiderAdminController],
  providers: [RiderService],
  exports: [MongooseModule],
})
export class RiderModule {}
