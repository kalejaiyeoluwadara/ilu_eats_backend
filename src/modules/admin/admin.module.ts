import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { FeeSettings, FeeSettingsSchema } from './schemas/fee-settings.schema';
import { FeatureFlag, FeatureFlagSchema } from './schemas/feature-flag.schema';
import {
  ActivityEvent,
  ActivityEventSchema,
} from './schemas/activity-event.schema';
import { OrdersModule } from '../orders/orders.module';
import { CatalogModule } from '../catalog/catalog.module';
import { RiderModule } from '../rider/rider.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: FeeSettings.name, schema: FeeSettingsSchema },
      { name: FeatureFlag.name, schema: FeatureFlagSchema },
      { name: ActivityEvent.name, schema: ActivityEventSchema },
    ]),
    OrdersModule,
    CatalogModule,
    RiderModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
