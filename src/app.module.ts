import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule } from '@nestjs/throttler';
import configuration from './config/configuration';
import { AppController } from './app.controller';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { CartModule } from './modules/cart/cart.module';
import { OrdersModule } from './modules/orders/orders.module';
import { BannersModule } from './modules/banners/banners.module';
import { RiderModule } from './modules/rider/rider.module';
import { AdminModule } from './modules/admin/admin.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { WalletModule } from './modules/wallet/wallet.module';
import { PlatformModule } from './modules/platform/platform.module';
import { ReferralModule } from './modules/referral/referral.module';
import { SmsModule } from './modules/sms/sms.module';
import { LandmarkModule } from './modules/landmark/landmark.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('mongodbUri'),
        // Serverless connection budgeting. A Vercel function instance serves one
        // request at a time, so a single pooled socket per instance is enough —
        // a larger pool just multiplies open connections against Atlas's cap
        // (500 on M0) as instances fan out. maxIdleTimeMS is the key lever
        // against "connections exceeded threshold": idle/frozen instances drop
        // their socket after 30s so Atlas reclaims it instead of holding it open.
        maxPoolSize: 1,
        minPoolSize: 0,
        maxIdleTimeMS: 30000,
        // Fail fast (~5s) on an unreachable/misconfigured cluster instead of
        // hanging the request until the platform times out.
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      }),
    }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    AuthModule,
    UsersModule,
    CatalogModule,
    CartModule,
    OrdersModule,
    PlatformModule,
    PaymentsModule,
    WalletModule,
    BannersModule,
    RiderModule,
    AdminModule,
    ReferralModule,
    SmsModule,
    LandmarkModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
