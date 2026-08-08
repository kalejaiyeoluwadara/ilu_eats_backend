import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { ResilientThrottlerStorage } from './common/redis/resilient-throttler.storage';
import { ThrottlerBehindProxyGuard } from './common/guards/throttler-behind-proxy.guard';
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
import { BadgesModule } from './modules/badges/badges.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { RiderModule } from './modules/rider/rider.module';
import { AdminModule } from './modules/admin/admin.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { WalletModule } from './modules/wallet/wallet.module';
import { PlatformModule } from './modules/platform/platform.module';
import { ReferralModule } from './modules/referral/referral.module';
import { SmsModule } from './modules/sms/sms.module';
import { WhatsappModule } from './modules/whatsapp/whatsapp.module';
import { LandmarkModule } from './modules/landmark/landmark.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { HomeModule } from './modules/home/home.module';
import { GeocodingModule } from './modules/geocoding/geocoding.module';
import { PromosModule } from './modules/promos/promos.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('mongodbUri'),

        // ---- Connection budgeting -------------------------------------
        // Atlas M0 allows 500 connections CLUSTER-WIDE, and the cost is per
        // serverless instance, not per request: every warm instance holds its
        // own pool plus ~3-6 replica-set monitoring sockets. So the ceiling is
        // roughly 500 / (monitors + maxPoolSize) instances — a pool of 10 put
        // that at ~30 instances, which a modest traffic burst clears easily.
        // That is what triggered Atlas' connection alert.
        //
        // 5 keeps real headroom for concurrent queries on one instance (Fluid
        // Compute serves many requests per instance) while roughly halving each
        // instance's contribution to the cap. Most reads are served from the
        // Redis cache and never take a pool slot at all.
        maxPoolSize: 5,
        minPoolSize: 0,
        // Hand idle sockets back quickly. A frozen instance runs no timers, so
        // this only reaps on warm-but-idle instances — which is exactly the
        // population that would otherwise sit on connections between bursts.
        maxIdleTimeMS: 10000,
        // If the pool is saturated, fail this request rather than queueing on it
        // forever. Without this the wait is unbounded and the browser just spins
        // — an error the UI can show beats a screen that never resolves.
        waitQueueTimeoutMS: 5000,
        // Each instance holds one monitoring socket per replica-set node and
        // polls them on this interval. The default 10s triples the background
        // chatter against an M0 for no benefit at our scale.
        heartbeatFrequencyMS: 30000,
        // Patient enough to ride out a slow cluster during a traffic burst
        // rather than turning it into a wave of 500s — the failure mode a
        // 5s budget produces exactly when load is highest. The browser-side
        // timeout in the web app is what guarantees the user still gets an
        // answer, so being generous here costs nothing visible.
        serverSelectionTimeoutMS: 10000,
        connectTimeoutMS: 15000,
        socketTimeoutMS: 45000,

        // ---- Cold-start cost ------------------------------------------
        // Mongoose defaults autoIndex/autoCreate to true, which re-issues every
        // schema's createIndexes on EVERY cold start — ~31 index declarations
        // across 21 schemas here, all competing for pool slots before the first
        // request is served. Indexes are a deploy-time concern, not a
        // request-time one: run `npm run db:indexes` to apply schema changes.
        // Left on outside production so local development stays zero-setup.
        autoIndex: config.get<string>('nodeEnv') !== 'production',
        autoCreate: config.get<string>('nodeEnv') !== 'production',
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
          // Named so individual routes can opt into a stricter budget via
          // @Throttle({ default: ... }) — see the auth controller. The general
          // ceiling is a generous 100 req/min PER IP (now that the guard keys on
          // the real client IP); abusive callers hit it long before Redis/Mongo.
          throttlers: [{ name: 'default', ttl: 60000, limit: 100 }],
          // Wrapped so a Redis blip can't 500 every route — this guard is
          // global, so its storage failing takes the whole API down with it.
          storage: client
            ? new ResilientThrottlerStorage(
                new ThrottlerStorageRedisService(client),
              )
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
    BadgesModule,
    CategoriesModule,
    RiderModule,
    AdminModule,
    ReferralModule,
    SmsModule,
    WhatsappModule,
    LandmarkModule,
    UploadsModule,
    HomeModule,
    GeocodingModule,
    PromosModule,
  ],
  controllers: [AppController],
  // Bind the throttler globally so the configured limit is actually enforced on
  // every route (the module was previously registered but never guarded, so no
  // rate limiting happened). Combined with the Redis storage above, this is a
  // single global limit across all serverless instances.
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerBehindProxyGuard },
  ],
})
export class AppModule {}
