import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LandmarkService } from './landmark.service';
import { LandmarkController } from './landmark.controller';
import { LandmarkAdminController } from './landmark-admin.controller';
import { Landmark, LandmarkSchema } from './schemas/landmark.schema';
import { ActivityModule } from '../activity/activity.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Landmark.name, schema: LandmarkSchema },
    ]),
    ActivityModule,
  ],
  controllers: [LandmarkController, LandmarkAdminController],
  providers: [LandmarkService],
  exports: [LandmarkService],
})
export class LandmarkModule {}
