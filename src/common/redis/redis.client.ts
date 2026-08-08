import { Logger } from '@nestjs/common';
import Redis, { type RedisOptions } from 'ioredis';

/**
 * Serverless-safe singleton ioredis client.
 *
 * A Vercel function instance is frozen between requests and reused while warm,
 * so — exactly like the Mongo connection — we must create at most ONE Redis
 * socket per instance and reuse it across invocations. Stashing it on
 * `globalThis` survives module re-evaluation within the same instance and stops
 * us leaking a new connection on every request (which would exhaust the Redis
 * Cloud connection cap the same way an unbudgeted Mongo pool exhausts Atlas).
 */
const GLOBAL_KEY = Symbol.for('ilueats.redis.client');

type GlobalWithRedis = typeof globalThis & {
  [GLOBAL_KEY]?: Redis | null;
};

const globalRef = globalThis as GlobalWithRedis;
const logger = new Logger('Redis');

/**
 * Connection tuning geared for serverless request latency over durability: a
 * request must never hang waiting on Redis.
 *
 * The bound is `commandTimeout` rather than a disabled offline queue. A frozen
 * function instance runs no keepalives, so its socket is routinely dead by the
 * next thaw and ioredis only finds out when it tries to write. With the offline
 * queue OFF that first command rejected instantly ("Stream isn't writeable"),
 * which meant the rate limiter was bypassed and the cache took a miss on the
 * first request of every warm window — and, until the throttler storage was
 * wrapped, returned a 500. With it ON the command waits for the reconnect that
 * ioredis has already started, which normally lands in a few milliseconds.
 *
 * `commandTimeout` is what keeps that safe: if Redis is genuinely down, a
 * command fails after 1s instead of queueing indefinitely, and every caller
 * (CacheService, ResilientThrottlerStorage) treats the failure as a miss and
 * carries on. So the worst case is bounded, and the common case is correct.
 */
function buildOptions(): RedisOptions {
  return {
    maxRetriesPerRequest: 1,
    // Let commands wait out a reconnect rather than rejecting the moment a
    // thawed instance discovers its socket died while it was frozen.
    enableOfflineQueue: true,
    // The hard ceiling on how long any single request can wait on Redis.
    commandTimeout: 1000,
    connectTimeout: 5000,
    // Reconnect with backoff, but give up escalating past 2s so a warm instance
    // recovers without hammering.
    retryStrategy: (times) => Math.min(times * 200, 2000),
    lazyConnect: false,
  };
}

/**
 * Returns the shared client, creating it on first call. Returns `null` when no
 * REDIS_URL is configured so every caller can cleanly no-op (caching disabled,
 * throttler falls back to in-memory).
 */
export function getRedisClient(url: string | undefined): Redis | null {
  if (!url) return null;

  if (globalRef[GLOBAL_KEY] !== undefined) {
    return globalRef[GLOBAL_KEY] ?? null;
  }

  try {
    const client = new Redis(url, buildOptions());
    // Errors are expected transiently (reconnects); log once at warn level and
    // let ioredis handle recovery. Without a listener, ioredis throws on error.
    client.on('error', (err) => {
      logger.warn(`Redis client error: ${err.message}`);
    });
    client.on('connect', () => logger.log('Redis connected'));
    globalRef[GLOBAL_KEY] = client;
    return client;
  } catch (err) {
    logger.error(
      `Failed to create Redis client: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
    globalRef[GLOBAL_KEY] = null;
    return null;
  }
}
