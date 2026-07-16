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
/** How long a namespace version is trusted in-process before re-reading it from
 * Redis. Short enough that a write on another instance propagates near-instantly,
 * long enough that steady-state reads cost a single Redis round-trip. */
const VERSION_TTL_MS = 5000;

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  /**
   * In-process cache of namespace version numbers. Persists across warm
   * serverless invocations (same module graph), so most reads skip the extra
   * Redis GET for the version and resolve it locally.
   */
  private readonly versionCache = new Map<
    string,
    { value: number; expires: number }
  >();

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

  /**
   * Versioned get-or-set. Every key in a namespace embeds the namespace's
   * current version, so `bumpVersion(namespace)` invalidates the ENTIRE
   * namespace in O(1) — no key enumeration, no SCAN — and orphaned keys expire
   * on their own TTL. Use this for caches whose invalidation is coarse (e.g. any
   * catalog edit should refresh all catalog listings).
   */
  async wrapVersioned<T>(
    namespace: string,
    keySuffix: string,
    ttlSeconds: number,
    produce: () => Promise<T>,
  ): Promise<T> {
    if (!this.client) return produce();
    const version = await this.getVersion(namespace);
    return this.wrap(`${namespace}:v${version}:${keySuffix}`, ttlSeconds, produce);
  }

  /** Bump a namespace's version, invalidating every key under it at once. */
  async bumpVersion(namespace: string): Promise<void> {
    if (!this.client) return;
    try {
      const next = await this.client.incr(`ver:${namespace}`);
      // Reflect our own write locally so this instance doesn't serve a stale
      // version for up to VERSION_TTL_MS after invalidating.
      this.versionCache.set(namespace, {
        value: next,
        expires: Date.now() + VERSION_TTL_MS,
      });
    } catch (err) {
      this.logger.warn(`cache bumpVersion "${namespace}" failed: ${this.msg(err)}`);
    }
  }

  /** Current version for a namespace, cached in-process for VERSION_TTL_MS.
   * Missing key ⇒ 0 (INCR starts a fresh counter at 1, so no version collides
   * with the pre-first-write reads). */
  private async getVersion(namespace: string): Promise<number> {
    if (!this.client) return 0;
    const now = Date.now();
    const cached = this.versionCache.get(namespace);
    if (cached && cached.expires > now) return cached.value;
    try {
      const raw = await this.client.get(`ver:${namespace}`);
      const value = raw ? parseInt(raw, 10) || 0 : 0;
      this.versionCache.set(namespace, { value, expires: now + VERSION_TTL_MS });
      return value;
    } catch (err) {
      this.logger.warn(`cache getVersion "${namespace}" failed: ${this.msg(err)}`);
      return 0;
    }
  }

  private msg(err: unknown): string {
    return err instanceof Error ? err.message : String(err);
  }
}
