import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { OrdersAdminController } from './orders-admin.controller';
import { Order, OrderSchema } from './schemas/order.schema';
import { CatalogModule } from '../catalog/catalog.module';
import { CartModule } from '../cart/cart.module';
import { UsersModule } from '../users/users.module';
import { WalletModule } from '../wallet/wallet.module';
import { MailModule } from '../mail/mail.module';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { ActivityModule } from '../activity/activity.module';
import { PlatformModule } from '../platform/platform.module';
import { ReferralModule } from '../referral/referral.module';
import { LandmarkModule } from '../landmark/landmark.module';
import { GeocodingModule } from '../geocoding/geocoding.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Order.name, schema: OrderSchema }]),
    CatalogModule,
    CartModule,
    UsersModule,
    WalletModule,
    MailModule,
    WhatsappModule,
    ActivityModule,
    PlatformModule,
    ReferralModule,
    LandmarkModule,
    GeocodingModule,
  ],
  controllers: [OrdersController, OrdersAdminController],
  providers: [OrdersService],
  exports: [MongooseModule, OrdersService],
})
export class OrdersModule {}
