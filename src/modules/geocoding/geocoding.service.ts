import {
  Injectable,
  Logger,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CacheService } from '../../common/redis/cache.service';
import {
  GeocodingProvider,
  PlaceDetails,
  PlaceSuggestion,
} from './providers/geocoding-provider.interface';
import {
  GoogleGeocodingConfig,
  GoogleGeocodingProvider,
} from './providers/google.provider';

/**
 * App-facing address autocomplete + resolution. Resolves a concrete driver from
 * config and hides it from callers, so the controller depends on this and never
 * on Google. Place Details are cached (coordinates for a place id don't change)
 * to trim latency and repeat billing when several users pick the same landmark.
 */
@Injectable()
export class GeocodingService implements OnModuleInit {
  private readonly logger = new Logger(GeocodingService.name);
  private provider!: GeocodingProvider;

  /** Place coordinates are immutable, so a day is safe and cheap. */
  private static readonly DETAILS_TTL_SECONDS = 60 * 60 * 24;

  constructor(
    private readonly config: ConfigService,
    private readonly cache: CacheService,
  ) {}

  onModuleInit() {
    const providerName =
      this.config.get<string>('geocoding.provider') ?? 'google';
    switch (providerName) {
      case 'google':
      default:
        this.provider = new GoogleGeocodingProvider(
          this.config.get<GoogleGeocodingConfig>('geocoding.google')!,
        );
    }

    if (!this.provider.isConfigured()) {
      this.logger.warn(
        `Geocoding provider "${this.provider.name}" is not configured (missing API key) — address search will be rejected.`,
      );
    }
  }

  async autocomplete(
    query: string,
    sessionToken: string,
  ): Promise<PlaceSuggestion[]> {
    this.assertConfigured();
    const q = query.trim();
    const suggestions = await this.provider.autocomplete(q, sessionToken);
    if (suggestions.length > 0 || q.length < 3) return suggestions;

    // Autocomplete misses obscure local spots (e.g. "hassan dudu"). Fall back to
    // a full-text search with the service area appended so the sparse local term
    // resolves, and pre-cache each hit's coordinates so selecting it needs no
    // extra Place Details lookup (or billing).
    const hint =
      this.config.get<string>('geocoding.textSearchAreaHint')?.trim() ?? '';
    const places = await this.provider.textSearch(hint ? `${q} ${hint}` : q);
    await Promise.all(
      places.map((p) =>
        this.cache.set(
          this.placeKey(p.placeId),
          p,
          GeocodingService.DETAILS_TTL_SECONDS,
        ),
      ),
    );
    return places.map((p) => this.toSuggestion(p));
  }

  placeDetails(placeId: string, sessionToken: string) {
    this.assertConfigured();
    // Cache by place id only — the session token varies per user but the
    // resolved coordinates/address for a place do not.
    return this.cache.wrap(
      this.placeKey(placeId),
      GeocodingService.DETAILS_TTL_SECONDS,
      () => this.provider.placeDetails(placeId, sessionToken),
    );
  }

  private placeKey(placeId: string): string {
    return `geocode:place:${this.provider.name}:${placeId}`;
  }

  /** Present a text-search hit the same way an autocomplete suggestion looks. */
  private toSuggestion(p: PlaceDetails): PlaceSuggestion {
    const [firstLine, ...rest] = p.address.split(',');
    const primary = p.name || firstLine?.trim() || p.address;
    const secondary = p.name ? p.address : rest.join(',').trim();
    return { placeId: p.placeId, primary, secondary, full: p.address };
  }

  private assertConfigured() {
    if (!this.provider.isConfigured()) {
      throw new ServiceUnavailableException('Address search is not configured');
    }
  }
}
