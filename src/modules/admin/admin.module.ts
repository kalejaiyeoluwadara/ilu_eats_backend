import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { FeeSettings, FeeSettingsSchema } from './schemas/fee-settings.schema';
import { FeatureFlag, FeatureFlagSchema } from './schemas/feature-flag.schema';
import { OrdersModule } from '../orders/orders.module';
import { CatalogModule } from '../catalog/catalog.module';
import { RiderModule } from '../rider/rider.module';
import { ActivityModule } from '../activity/activity.module';
import { PlatformModule } from '../platform/platform.module';
import { UsersModule } from '../users/users.module';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: FeeSettings.name, schema: FeeSettingsSchema },
      { name: FeatureFlag.name, schema: FeatureFlagSchema },
    ]),
    OrdersModule,
    CatalogModule,
    RiderModule,
    ActivityModule,
    PlatformModule,
    UsersModule,
    WalletModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
