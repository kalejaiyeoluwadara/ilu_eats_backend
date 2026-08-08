import { Logger } from '@nestjs/common';
import type { ThrottlerStorage } from '@nestjs/throttler';

// The record type isn't re-exported from the package root, so derive it from
// the interface rather than importing through the package's dist/ internals.
type ThrottlerStorageRecord = Awaited<
  ReturnType<ThrottlerStorage['increment']>
>;

/**
 * Wraps a Redis-backed ThrottlerStorage so Redis being unreachable degrades to
 * "not rate limited" instead of failing the request.
 *
 * Why this exists: the throttler guard is bound globally (APP_GUARD), so it runs
 * before routing on EVERY request. When its storage rejects, the rejection
 * propagates out of the guard and Nest returns 500 — for every route at once,
 * including ones that never touch Redis and paths that don't even exist. That is
 * exactly what a dead Redis socket was producing in production.
 *
 * A Vercel function instance is frozen between invocations, so its Redis socket
 * is routinely dead on the next thaw (idle-timed-out server side, with no
 * keepalive running while frozen). ioredis notices on write and — because the
 * client sets `enableOfflineQueue: false` to avoid stalling requests — rejects
 * the command immediately with "Stream isn't writeable". Transient by nature,
 * and recovered by ioredis' own reconnect a moment later.
 *
 * Failing OPEN is the deliberate call: rate limiting is a protection, not a
 * correctness requirement. Briefly not counting a request is a much smaller
 * problem than refusing to serve the whole API. Auth endpoints keep their own
 * stricter budgets, and those resume the moment Redis is back.
 */
export class ResilientThrottlerStorage implements ThrottlerStorage {
  private readonly logger = new Logger(ResilientThrottlerStorage.name);

  /**
   * Redis flapping would otherwise log once per request. Log the first failure,
   * then stay quiet until it recovers, so an outage is one line rather than a
   * flood that buries everything else.
   */
  private degraded = false;

  constructor(private readonly inner: ThrottlerStorage) {}

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    try {
      const record = await this.inner.increment(
        key,
        ttl,
        limit,
        blockDuration,
        throttlerName,
      );
      if (this.degraded) {
        this.degraded = false;
        this.logger.log('Redis rate-limit storage recovered — limits re-armed.');
      }
      return record;
    } catch (err) {
      if (!this.degraded) {
        this.degraded = true;
        this.logger.warn(
          `Redis rate-limit storage unavailable — allowing requests through until it recovers: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
      // A single hit against the limit, never blocked. The guard compares
      // totalHits to the limit, so 1 always passes.
      return {
        totalHits: 1,
        timeToExpire: Math.ceil(ttl / 1000),
        isBlocked: false,
        timeToBlockExpire: 0,
      };
    }
  }
}
