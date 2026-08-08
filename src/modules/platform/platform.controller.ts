import { Controller, Get, Header } from '@nestjs/common';
import { PlatformService } from './platform.service';

@Controller()
export class PlatformController {
  constructor(private readonly platformService: PlatformService) {}

  /**
   * Public — the customer app polls this to grey out the catalog when closed.
   *
   * Served from Vercel's CDN rather than this function. It's the single most
   * requested endpoint we have (every open client, on a timer) and the answer is
   * identical for every caller, so letting each poll boot a serverless instance —
   * and with it a Mongo pool — was the most expensive thing the API did. With
   * `s-maxage` the edge answers them all and this handler runs about twice a
   * minute in total, no matter how many customers are online.
   *
   * `max-age=0` keeps the BROWSER honest: it still asks every time, so a closure
   * propagates as fast as the edge TTL allows rather than being pinned in a
   * private cache we can't clear. `stale-while-revalidate` means a cache miss is
   * never paid for by the customer — the edge serves the slightly-stale answer
   * and refreshes behind them.
   *
   * This deliberately overrides the global `no-store` set in main.ts, which is
   * the right default for authenticated payloads and the wrong one here. It is
   * safe precisely because this route is public and identical for everyone —
   * do not copy it onto anything user-specific.
   */
  @Get('platform/status')
  @Header(
    'Cache-Control',
    'public, max-age=0, s-maxage=30, stale-while-revalidate=300',
  )
  getStatus() {
    return this.platformService.getStatus();
  }
}
