import { Inject, Injectable, Logger } from '@nestjs/common';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.constants';

/**
 * Thin JSON cache over Redis with one hard rule: **it must never break a
 * request**. Redis here is an optimization, not a source of truth — every
 * operation degrades to "cache miss / no-op" if the client is absent or the
 * command fails, so callers always fall through to Mongo. This is what lets us
 * ship caching to a serverless deployment without coupling availability to
 * Redis.
 */
@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  constructor(@Inject(REDIS_CLIENT) private readonly client: Redis | null) {}

  get enabled(): boolean {
    return this.client !== null;
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.client) return null;
    try {
      const raw = await this.client.get(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch (err) {
      this.logger.warn(`cache get "${key}" failed: ${this.msg(err)}`);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch (err) {
      this.logger.warn(`cache set "${key}" failed: ${this.msg(err)}`);
    }
  }

  async del(...keys: string[]): Promise<void> {
    if (!this.client || keys.length === 0) return;
    try {
      await this.client.del(...keys);
    } catch (err) {
      this.logger.warn(`cache del "${keys.join(',')}" failed: ${this.msg(err)}`);
    }
  }

  /**
   * Get-or-set: return the cached value, or run `produce`, cache it, and return
   * it. A cache failure never prevents `produce` from being the answer.
   */
  async wrap<T>(
    key: string,
    ttlSeconds: number,
    produce: () => Promise<T>,
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;

    const fresh = await produce();
    // Don't cache null/undefined — treat them as "no value to remember" so a
    // transient empty result isn't pinned for the whole TTL.
    if (fresh !== null && fresh !== undefined) {
      await this.set(key, fresh, ttlSeconds);
    }
    return fresh;
  }

  private msg(err: unknown): string {
    return err instanceof Error ? err.message : String(err);
  }
}
