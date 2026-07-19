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

    // Autocomplete is thin on obscure local spots — even street-level Ilishan
    // queries often return one weak hit or none. When it comes back sparser than
    // the configured threshold, enrich with a full-text search (service area
    // appended) and merge, so the real local street surfaces alongside whatever
    // autocomplete found.
    const threshold =
      this.config.get<number>('geocoding.textSearchFallbackThreshold') ?? 3;
    if (suggestions.length >= threshold || q.length < 3) return suggestions;

    const hint =
      this.config.get<string>('geocoding.textSearchAreaHint')?.trim() ?? '';
    const places = await this.provider.textSearch(hint ? `${q} ${hint}` : q);
    // Pre-cache each hit's coordinates so selecting it needs no extra Place
    // Details lookup (or billing).
    await Promise.all(
      places.map((p) =>
        this.cache.set(
          this.placeKey(p.placeId),
          p,
          GeocodingService.DETAILS_TTL_SECONDS,
        ),
      ),
    );

    // Merge autocomplete + text-search hits, de-duping by placeId and keeping
    // autocomplete's ordering first (it reflects Google's own relevance).
    const seen = new Set(suggestions.map((s) => s.placeId));
    const merged = [...suggestions];
    for (const p of places) {
      if (!seen.has(p.placeId)) {
        seen.add(p.placeId);
        merged.push(this.toSuggestion(p));
      }
    }
    return merged;
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

  /**
   * Resolve device GPS coordinates to an address for "use my current location",
   * and flag whether the spot is inside the delivery area (the automatic
   * replacement for the old manual "I'm in Ilishan-Remo" tick).
   */
  async reverseGeocode(lat: number, lng: number): Promise<PlaceDetails> {
    this.assertConfigured();
    const key = `geocode:reverse:${this.provider.name}:${lat.toFixed(5)},${lng.toFixed(5)}`;
    // The resolved PlaceDetails already carries `inServiceArea` (computed by the
    // provider from the matched coordinates).
    return this.cache.wrap(
      key,
      GeocodingService.DETAILS_TTL_SECONDS,
      () => this.provider.reverseGeocode(lat, lng),
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
