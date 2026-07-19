import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { Request } from 'express';

/**
 * Rate-limit keyed on the REAL client IP when running behind Vercel's proxy.
 *
 * The default ThrottlerGuard keys on `req.ip`, which — behind a proxy and
 * without an exhaustively correct `trust proxy` hop count — is either the
 * platform's socket address (so every caller collapses into ONE shared bucket
 * and a single spammer rate-limits all users) or the left-most `X-Forwarded-For`
 * entry (which the caller controls, so they can mint a fresh bucket per request
 * and bypass the limit entirely).
 *
 * Vercel sets `x-real-ip` to the true client IP and overwrites any client-
 * supplied value, so it is the safe key. We fall back to the right-most XFF hop
 * (the address stamped by the closest trusted proxy, not the spoofable left-most
 * one) and finally to `req.ip` for local / non-Vercel runs.
 */
@Injectable()
export class ThrottlerBehindProxyGuard extends ThrottlerGuard {
  protected async getTracker(req: Request): Promise<string> {
    const realIp = req.headers['x-real-ip'];
    if (realIp) return Array.isArray(realIp) ? realIp[0] : realIp;

    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      const rightMost = forwarded.split(',').pop()?.trim();
      if (rightMost) return rightMost;
    }

    return req.ip ?? 'unknown';
  }
}
