import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.constants';
import { getRedisClient } from './redis.client';
import { CacheService } from './cache.service';

/**
 * Global so any module can inject CacheService without re-importing. The client
 * provider resolves to the process-wide singleton (or null when REDIS_URL is
 * unset), and CacheService no-ops in that case — so this module is always safe
 * to register, configured or not.
 */
@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService): Redis | null =>
        getRedisClient(config.get<string>('redis.url')),
    },
    CacheService,
  ],
  exports: [REDIS_CLIENT, CacheService],
})
export class RedisModule {}
