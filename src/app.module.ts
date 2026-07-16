import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import configuration from './config/configuration';
import { RedisModule } from './common/redis/redis.module';
import { getRedisClient } from './common/redis/redis.client';
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
    RedisModule,
    // Rate-limit counters live in Redis so the limit is enforced GLOBALLY across
    // serverless instances instead of per-instance in-memory (which multiplies
    // the effective limit by the instance count and resets on cold start). When
    // REDIS_URL is unset the client is null and throttler transparently falls
    // back to its default in-memory storage.
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const client = getRedisClient(config.get<string>('redis.url'));
        return {
          throttlers: [{ ttl: 60000, limit: 100 }],
          storage: client
            ? new ThrottlerStorageRedisService(client)
            : undefined,
        };
      },
    }),
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
  // Bind the throttler globally so the configured limit is actually enforced on
  // every route (the module was previously registered but never guarded, so no
  // rate limiting happened). Combined with the Redis storage above, this is a
  // single global limit across all serverless instances.
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
