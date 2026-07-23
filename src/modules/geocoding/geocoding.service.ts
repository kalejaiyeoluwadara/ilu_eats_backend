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
import {
  ChowdeckGeocodingConfig,
  ChowdeckGeocodingProvider,
} from './providers/chowdeck.provider';
import { LngLat, RouteMetric, roadDistanceKm } from '../../common/geo/geo.util';

/**
 * A store→drop-off routing result. `estimated` is true when this came from the
 * haversine fallback (Google unconfigured or the Routes call failed) rather than
 * a real Google road route — callers can surface or log the difference.
 */
export interface RouteResult extends RouteMetric {
  estimated: boolean;
}

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
  /**
   * Google always, regardless of GEOCODING_PROVIDER. Kept alongside the
   * configured provider so the admin store-location search can require Google's
   * richer place coverage even when customer address search runs on Chowdeck.
   */
  private googleProvider!: GoogleGeocodingProvider;

  /** Place coordinates are immutable, so a day is safe and cheap. */
  private static readonly DETAILS_TTL_SECONDS = 60 * 60 * 24;

  /**
   * Road distance between two fixed points doesn't change, so a week is safe and
   * keeps repeat store→drop-off pairs (and their Routes API billing) off the wire.
   */
  private static readonly ROUTE_TTL_SECONDS = 60 * 60 * 24 * 7;

  constructor(
    private readonly config: ConfigService,
    private readonly cache: CacheService,
  ) {}

  onModuleInit() {
    // Built unconditionally; it self-reports as unconfigured when the key is
    // missing, so both reverse geocoding and the admin Google path degrade
    // cleanly. Reused as the configured provider when GEOCODING_PROVIDER=google.
    this.googleProvider = this.buildGoogleProvider();

    const providerName =
      this.config.get<string>('geocoding.provider') ?? 'google';
    switch (providerName) {
      case 'chowdeck':
        this.provider = new ChowdeckGeocodingProvider(
          this.config.get<ChowdeckGeocodingConfig>('geocoding.chowdeck')!,
          // Google (when a key is set) still serves reverse geocoding, which
          // Chowdeck can't do.
          this.googleProvider,
        );
        break;
      case 'google':
      default:
        this.provider = this.googleProvider;
    }

    if (!this.provider.isConfigured()) {
      this.logger.warn(
        `Geocoding provider "${this.provider.name}" is not configured (missing API key) — address search will be rejected.`,
      );
    }
  }

  autocomplete(
    query: string,
    sessionToken: string,
  ): Promise<PlaceSuggestion[]> {
    return this.autocompleteWith(this.provider, query, sessionToken);
  }

  /**
   * Autocomplete forced onto Google, for the admin store-location search. Isolated
   * from the customer-facing {@link autocomplete} so a Chowdeck rollout can't
   * regress store onboarding, which relies on Google's business/place coverage.
   */
  googleAutocomplete(
    query: string,
    sessionToken: string,
  ): Promise<PlaceSuggestion[]> {
    return this.autocompleteWith(this.googleProvider, query, sessionToken);
  }

  private async autocompleteWith(
    provider: GeocodingProvider,
    query: string,
    sessionToken: string,
  ): Promise<PlaceSuggestion[]> {
    this.assertConfigured(provider);
    const q = query.trim();
    const suggestions = await provider.autocomplete(q, sessionToken);

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
    const places = await provider.textSearch(hint ? `${q} ${hint}` : q);
    // Pre-cache each hit's coordinates so selecting it needs no extra Place
    // Details lookup (or billing).
    await Promise.all(
      places.map((p) =>
        this.cache.set(
          this.placeKey(provider, p.placeId),
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
    return this.placeDetailsWith(this.provider, placeId, sessionToken);
  }

  /** Google-forced counterpart to {@link placeDetails} for the admin store search. */
  googlePlaceDetails(placeId: string, sessionToken: string) {
    return this.placeDetailsWith(this.googleProvider, placeId, sessionToken);
  }

  private placeDetailsWith(
    provider: GeocodingProvider,
    placeId: string,
    sessionToken: string,
  ) {
    this.assertConfigured(provider);
    // Cache by place id only — the session token varies per user but the
    // resolved coordinates/address for a place do not.
    return this.cache.wrap(
      this.placeKey(provider, placeId),
      GeocodingService.DETAILS_TTL_SECONDS,
      () => provider.placeDetails(placeId, sessionToken),
    );
  }

  /**
   * Resolve device GPS coordinates to an address for "use my current location",
   * and flag whether the spot is inside the delivery area (the automatic
   * replacement for the old manual "I'm in Ilishan-Remo" tick).
   */
  async reverseGeocode(lat: number, lng: number): Promise<PlaceDetails> {
    this.assertConfigured(this.provider);
    const key = `geocode:reverse:${this.provider.name}:${lat.toFixed(5)},${lng.toFixed(5)}`;
    // The resolved PlaceDetails already carries `inServiceArea` (computed by the
    // provider from the matched coordinates).
    return this.cache.wrap(key, GeocodingService.DETAILS_TTL_SECONDS, () =>
      this.provider.reverseGeocode(lat, lng),
    );
  }

  /**
   * Real driving distance (km) and ETA between a store and a drop-off, for
   * distance-based delivery pricing. Uses Google Routes (always Google, like
   * reverse geocoding — Chowdeck can't route), cached by rounded coordinates so
   * repeat pairs don't re-bill. Degrades to the haversine road-distance estimate
   * whenever Google is unconfigured or the call fails, so pricing never blocks on
   * the API — the returned `estimated` flag says which path produced the number.
   */
  async routeDistanceKm(origin: LngLat, dest: LngLat): Promise<RouteResult> {
    const [result] = await this.routeDistancesFromOrigin(origin, [dest]);
    return result;
  }

  /**
   * Batched routing: driving distance/ETA from ONE origin to MANY destinations
   * in a single Routes API call — e.g. a customer to every nearby store for the
   * "near me" listing. Each pair is cached independently, so only the uncached
   * destinations hit Google, and any pair Google can't resolve degrades to the
   * haversine estimate on its own. Results are returned in the order of `dests`.
   */
  async routeDistancesFromOrigin(
    origin: LngLat,
    dests: LngLat[],
  ): Promise<RouteResult[]> {
    const estimateFor = (dest: LngLat): RouteResult => ({
      distanceKm: roadDistanceKm(origin, dest),
      durationMin: null,
      estimated: true,
    });

    if (dests.length === 0) return [];
    if (!this.googleProvider.isConfigured()) return dests.map(estimateFor);

    // Serve every pair we can from cache; collect the misses for one batched
    // Routes call. Cache only real Google results — never pin a fallback
    // estimate, so a transient Routes outage can't freeze a bad number.
    const results = new Array<RouteResult | null>(dests.length).fill(null);
    const missIdx: number[] = [];
    await Promise.all(
      dests.map(async (dest, i) => {
        const cached = await this.cache.get<RouteMetric>(
          this.routeKey(origin, dest),
        );
        if (cached) results[i] = { ...cached, estimated: false };
        else missIdx.push(i);
      }),
    );

    if (missIdx.length > 0) {
      try {
        const missDests = missIdx.map((i) => dests[i]);
        const [row = []] = await this.googleProvider.routeMatrix(
          [origin],
          missDests,
        );
        await Promise.all(
          missIdx.map(async (destIndex, k) => {
            const metric = row[k];
            if (metric) {
              await this.cache.set(
                this.routeKey(origin, dests[destIndex]),
                metric,
                GeocodingService.ROUTE_TTL_SECONDS,
              );
              results[destIndex] = { ...metric, estimated: false };
            } else {
              // Google reachable but no route for this pair — estimate it.
              results[destIndex] = estimateFor(dests[destIndex]);
            }
          }),
        );
      } catch (err) {
        this.logger.warn(
          `Route distances failed, using estimates: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    }

    // Any pair still unresolved (cache miss + failed/missing Google) estimates.
    return results.map((r, i) => r ?? estimateFor(dests[i]));
  }

  /** Bucket coordinates to ~11m (4dp) so GPS jitter shares one cached route. */
  private routeKey(a: LngLat, b: LngLat): string {
    const f = (n: number) => n.toFixed(4);
    return `route:google:${f(a[0])},${f(a[1])}->${f(b[0])},${f(b[1])}`;
  }

  private buildGoogleProvider(): GoogleGeocodingProvider {
    return new GoogleGeocodingProvider(
      this.config.get<GoogleGeocodingConfig>('geocoding.google')!,
    );
  }

  private placeKey(provider: GeocodingProvider, placeId: string): string {
    return `geocode:place:${provider.name}:${placeId}`;
  }

  /** Present a text-search hit the same way an autocomplete suggestion looks. */
  private toSuggestion(p: PlaceDetails): PlaceSuggestion {
    const [firstLine, ...rest] = p.address.split(',');
    const primary = p.name || firstLine?.trim() || p.address;
    const secondary = p.name ? p.address : rest.join(',').trim();
    return { placeId: p.placeId, primary, secondary, full: p.address };
  }

  private assertConfigured(provider: GeocodingProvider) {
    if (!provider.isConfigured()) {
      throw new ServiceUnavailableException('Address search is not configured');
    }
  }
}
