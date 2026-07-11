import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReferralService } from './referral.service';
import { ReferralController } from './referral.controller';
import { ReferralAdminController } from './referral-admin.controller';
import {
  ReferralCode,
  ReferralCodeSchema,
} from './schemas/referral-code.schema';
import { ActivityModule } from '../activity/activity.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ReferralCode.name, schema: ReferralCodeSchema },
    ]),
    ActivityModule,
  ],
  controllers: [ReferralController, ReferralAdminController],
  providers: [ReferralService],
  exports: [ReferralService],
})
export class ReferralModule {}
