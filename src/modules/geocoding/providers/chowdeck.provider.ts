import {
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  GeocodingProvider,
  PlaceDetails,
  PlaceSuggestion,
} from './geocoding-provider.interface';

export interface ChowdeckGeocodingConfig {
  /** Base host, e.g. https://api.chowdeck.com */
  baseUrl: string;
  /** Service-area center + radius, for the `inServiceArea` distance check. */
  biasLat: number;
  biasLng: number;
  biasRadiusM: number;
}

/**
 * Chowdeck place proxy driver.
 *
 *   Autocomplete:  GET {base}/place/autocomplete/json?input={query}
 *   Place Details: GET {base}/place/details/json?placeid={placeId}
 *
 * Chowdeck's proxy indexes grassroots Nigerian spots (informal landmarks,
 * community-mapped streets) that Google's autocomplete simply does not carry —
 * which is the whole reason we use it for the address picker. It needs no API
 * key and returns the familiar legacy-Google response shape (`predictions`,
 * `structured_formatting`, `geometry.location`).
 *
 * Two caveats shape this driver:
 *   - Chowdeck exposes NO reverse-geocode or text-search endpoint, so those are
 *     delegated to an optional fallback provider (Google) for "use my location".
 *   - It is an undocumented API we do not own; if it changes or locks down,
 *     switch GEOCODING_PROVIDER back to `google` — the interface is identical.
 */
export class ChowdeckGeocodingProvider implements GeocodingProvider {
  readonly name = 'chowdeck';
  private readonly logger = new Logger(ChowdeckGeocodingProvider.name);

  constructor(
    private readonly config: ChowdeckGeocodingConfig,
    /**
     * Used only for reverseGeocode (and text-search enrichment), which Chowdeck
     * cannot do. Typically the Google provider; when absent, those features
     * degrade to a clean 503 rather than breaking the whole picker.
     */
    private readonly reverseFallback?: GeocodingProvider,
  ) {}

  isConfigured(): boolean {
    // No API key required — the proxy is open. A base URL is all we need.
    return Boolean(this.config.baseUrl);
  }

  async autocomplete(query: string): Promise<PlaceSuggestion[]> {
    // Chowdeck ignores session tokens (no per-session billing), so we don't
    // forward one. `input` is the only parameter it reads.
    const url = `${this.base()}/place/autocomplete/json?input=${encodeURIComponent(query)}`;
    const data = await this.get<AutocompleteResponse>(url, 'Autocomplete');

    return (data.predictions ?? [])
      .filter((p): p is Prediction => Boolean(p.place_id && p.description))
      .map((p) => {
        // The specific address lives in `description`; structured_formatting's
        // main_text is only the locality ("Ilishan-Remo"), so we split the
        // description ourselves for a useful two-line suggestion.
        const description = p.description;
        const clean = this.stripPlusCode(description);
        const [firstLine, ...rest] = clean.split(',');
        return {
          placeId: p.place_id,
          primary: firstLine.trim() || clean,
          secondary: rest.join(',').trim(),
          // Keep the raw description as the canonical full address line.
          full: description,
        };
      });
  }

  async placeDetails(placeId: string): Promise<PlaceDetails> {
    // NOTE: the details param is `placeid` (no underscore), unlike the
    // `place_id` field returned by autocomplete.
    const url = `${this.base()}/place/details/json?placeid=${encodeURIComponent(placeId)}`;
    const data = await this.get<DetailsResponse>(url, 'Place Details');

    const result = data.result;
    const loc = result?.geometry?.location;
    if (!result || !loc) {
      throw new NotFoundException('Place not found');
    }

    return {
      placeId: result.place_id ?? placeId,
      address: result.formatted_address ?? '',
      name: result.name ?? '',
      lat: loc.lat,
      lng: loc.lng,
      inServiceArea: this.isWithinServiceArea(loc.lat, loc.lng),
    };
  }

  /**
   * Chowdeck has no text-search endpoint; its autocomplete already covers the
   * obscure local spots that the fallback exists to catch, so there is nothing
   * to add here. Returning empty keeps the GeocodingService merge a no-op.
   */
  textSearch(): Promise<PlaceDetails[]> {
    return Promise.resolve([]);
  }

  /**
   * Chowdeck exposes no reverse endpoint, so "use my current location" is served
   * by the fallback provider (Google). Without one, fail cleanly rather than
   * pretending — the address picker (Chowdeck) still works regardless.
   */
  async reverseGeocode(lat: number, lng: number): Promise<PlaceDetails> {
    if (!this.reverseFallback?.isConfigured()) {
      throw new ServiceUnavailableException(
        'Current-location lookup is not available',
      );
    }
    return this.reverseFallback.reverseGeocode(lat, lng);
  }

  /** True when (lat,lng) is within biasRadiusM of the service-area center. */
  isWithinServiceArea(lat: number, lng: number): boolean {
    const R = 6_371_000; // Earth radius, metres.
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(lat - this.config.biasLat);
    const dLng = toRad(lng - this.config.biasLng);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(this.config.biasLat)) *
        Math.cos(toRad(lat)) *
        Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a)) <= this.config.biasRadiusM;
  }

  /** Drop a trailing slash so path joins stay clean. */
  private base(): string {
    return this.config.baseUrl.replace(/\/+$/, '');
  }

  /**
   * Chowdeck prefixes plus codes (e.g. "VPX7+CMH Hassan Dudu, …") on addresses
   * without a street number. Strip the leading code for the display line; the
   * full description (with the code) is preserved separately.
   */
  private stripPlusCode(description: string): string {
    return description.replace(/^[A-Z0-9]{4,6}\+[A-Z0-9]{2,3}\s+/, '').trim();
  }

  private async get<T>(url: string, op: string): Promise<T> {
    let res: Response;
    try {
      res = await fetch(url);
    } catch (err) {
      this.fail(op, 0, err instanceof Error ? err.message : 'network error');
    }
    const data = (await res.json().catch(() => ({}))) as T & {
      status?: string;
    };
    // Legacy-Google shape signals problems in `status`, not the HTTP code.
    if (!res.ok) {
      this.fail(op, res.status);
    }
    if (data.status && data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      this.fail(op, res.status, data.status);
    }
    return data;
  }

  private fail(op: string, status: number, message?: string): never {
    const detail = message ?? `HTTP ${status}`;
    this.logger.error(`Chowdeck ${op} failed: ${detail}`);
    throw new ServiceUnavailableException(`Address lookup failed: ${detail}`);
  }
}

// --- Minimal shapes of the Chowdeck responses we read. ---

interface Prediction {
  place_id: string;
  description: string;
  structured_formatting?: {
    main_text?: string;
    secondary_text?: string;
  };
}

interface AutocompleteResponse {
  predictions?: Prediction[];
  status?: string;
}

interface DetailsResponse {
  result?: {
    place_id?: string;
    formatted_address?: string;
    name?: string;
    geometry?: { location?: { lat: number; lng: number } };
  };
  status?: string;
}
