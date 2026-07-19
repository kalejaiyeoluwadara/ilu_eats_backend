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

export interface GoogleGeocodingConfig {
  apiKey: string;
  biasLat: number;
  biasLng: number;
  biasRadiusM: number;
  /** When true, results are hard-limited to the area circle, not just ranked. */
  restrictToArea: boolean;
  regionCode: string;
  languageCode: string;
}

/**
 * Google Places API (New) driver.
 *
 *   Autocomplete:   POST https://places.googleapis.com/v1/places:autocomplete
 *   Place Details:  GET  https://places.googleapis.com/v1/places/{placeId}
 *
 * We bias every autocomplete to a circle around our service area and restrict
 * to a single region so a short query surfaces local streets instead of
 * same-named places worldwide. The shared `sessionToken` links an autocomplete
 * run to the single Place Details call that closes it, so Google bills the pair
 * as one Autocomplete session rather than per keystroke.
 *
 * Docs: https://developers.google.com/maps/documentation/places/web-service/place-autocomplete
 */
export class GoogleGeocodingProvider implements GeocodingProvider {
  readonly name = 'google';
  private readonly logger = new Logger(GoogleGeocodingProvider.name);
  private readonly base = 'https://places.googleapis.com/v1';

  constructor(private readonly config: GoogleGeocodingConfig) {}

  isConfigured(): boolean {
    return Boolean(this.config.apiKey);
  }

  async autocomplete(
    query: string,
    sessionToken: string,
  ): Promise<PlaceSuggestion[]> {
    const body = {
      input: query,
      sessionToken,
      includedRegionCodes: [this.config.regionCode],
      languageCode: this.config.languageCode,
      // Autocomplete accepts a restriction circle, so hard-limit to the service
      // area when configured (bias only ranks; restriction excludes).
      ...(this.config.restrictToArea
        ? { locationRestriction: this.areaCircle() }
        : { locationBias: this.areaCircle() }),
    };

    const data = await this.post<AutocompleteResponse>(
      'places:autocomplete',
      body,
    );

    // Google returns non-place suggestions (e.g. query predictions) too; keep
    // only entries that carry a placeId we can later resolve to coordinates.
    return (data.suggestions ?? [])
      .map((s) => s.placePrediction)
      .filter((p): p is PlacePrediction => Boolean(p?.placeId))
      .map((p) => ({
        placeId: p.placeId,
        primary: p.structuredFormat?.mainText?.text ?? p.text?.text ?? '',
        secondary: p.structuredFormat?.secondaryText?.text ?? '',
        full: p.text?.text ?? p.structuredFormat?.mainText?.text ?? '',
      }));
  }

  async placeDetails(
    placeId: string,
    sessionToken: string,
  ): Promise<PlaceDetails> {
    // Field mask keeps the response (and the billing SKU) to just what the
    // picker needs — id, address, coordinates, name.
    const fieldMask = 'id,formattedAddress,location,displayName';
    const url =
      `${this.base}/places/${encodeURIComponent(placeId)}` +
      `?sessionToken=${encodeURIComponent(sessionToken)}` +
      `&languageCode=${encodeURIComponent(this.config.languageCode)}` +
      `&regionCode=${encodeURIComponent(this.config.regionCode)}`;

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Goog-Api-Key': this.config.apiKey,
        'X-Goog-FieldMask': fieldMask,
      },
    });

    const data = (await res.json().catch(() => ({}))) as PlaceDetailsResponse;

    if (res.status === 404) {
      throw new NotFoundException('Place not found');
    }
    if (!res.ok || data.error) {
      this.fail('Place Details', res.status, data.error?.message);
    }
    if (!data.location) {
      throw new NotFoundException('Place has no coordinates');
    }

    return {
      placeId: data.id ?? placeId,
      address: data.formattedAddress ?? '',
      name: data.displayName?.text ?? '',
      lat: data.location.latitude,
      lng: data.location.longitude,
      inServiceArea: this.isWithinServiceArea(
        data.location.latitude,
        data.location.longitude,
      ),
    };
  }

  async textSearch(query: string): Promise<PlaceDetails[]> {
    const res = await fetch(`${this.base}/places:searchText`, {
      method: 'POST',
      headers: {
        'X-Goog-Api-Key': this.config.apiKey,
        'Content-Type': 'application/json',
        // Field mask keeps the (pricier) Text Search response — and its billing
        // tier — to just the fields the picker needs.
        'X-Goog-FieldMask':
          'places.id,places.formattedAddress,places.location,places.displayName',
      },
      body: JSON.stringify({
        textQuery: query,
        regionCode: this.config.regionCode,
        languageCode: this.config.languageCode,
        // Text Search's restriction only accepts a rectangle (not a circle), so
        // we restrict to the bounding box and then trim the corners to a true
        // circle with a haversine filter below.
        ...(this.config.restrictToArea
          ? { locationRestriction: this.areaRectangle() }
          : { locationBias: this.areaCircle() }),
      }),
    });

    const data = (await res.json().catch(() => ({}))) as TextSearchResponse;
    if (!res.ok || data.error) {
      this.fail('Text Search', res.status, data.error?.message);
    }

    const results = (data.places ?? [])
      .filter((p): p is PlaceResult & { location: LatLngLiteral } =>
        Boolean(p.id && p.location),
      )
      .map((p) => ({
        placeId: p.id,
        address: p.formattedAddress ?? '',
        name: p.displayName?.text ?? '',
        lat: p.location.latitude,
        lng: p.location.longitude,
        inServiceArea: this.isWithinServiceArea(
          p.location.latitude,
          p.location.longitude,
        ),
      }));

    // Trim the rectangle's corners to a circle so neighbouring towns that fall
    // in the box (e.g. Sagamu) but outside the delivery radius are dropped.
    return this.config.restrictToArea
      ? results.filter((r) => this.isWithinServiceArea(r.lat, r.lng))
      : results;
  }

  /**
   * Reverse geocode via the classic Geocoding API — turns the device's GPS
   * coordinates into a formatted street address for "use my current location".
   * (Enable "Geocoding API" in Google Cloud; it's separate from Places.)
   */
  async reverseGeocode(lat: number, lng: number): Promise<PlaceDetails> {
    const url =
      `https://maps.googleapis.com/maps/api/geocode/json` +
      `?latlng=${lat},${lng}` +
      `&language=${encodeURIComponent(this.config.languageCode)}` +
      `&region=${encodeURIComponent(this.config.regionCode)}` +
      `&key=${encodeURIComponent(this.config.apiKey)}`;

    const res = await fetch(url);
    const data = (await res.json().catch(() => ({}))) as GeocodeApiResponse;

    // The Geocoding API signals problems in `status`, not the HTTP code.
    if (data.status && data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      this.fail(
        'Reverse Geocode',
        res.status,
        data.error_message ?? data.status,
      );
    }
    const r = data.results?.[0];
    if (!r) {
      throw new NotFoundException('No address found for your location');
    }
    const rLat = r.geometry?.location?.lat ?? lat;
    const rLng = r.geometry?.location?.lng ?? lng;
    return {
      placeId: r.place_id ?? '',
      address: r.formatted_address ?? '',
      name: '',
      lat: rLat,
      lng: rLng,
      inServiceArea: this.isWithinServiceArea(rLat, rLng),
    };
  }

  /** The service area as a circle, for autocomplete restriction/bias. */
  private areaCircle() {
    return {
      circle: {
        center: {
          latitude: this.config.biasLat,
          longitude: this.config.biasLng,
        },
        radius: this.config.biasRadiusM,
      },
    };
  }

  /** The service area's bounding box, for Text Search restriction. */
  private areaRectangle() {
    const latDelta = this.config.biasRadiusM / 111_320;
    const lngDelta =
      this.config.biasRadiusM /
      (111_320 * Math.cos((this.config.biasLat * Math.PI) / 180));
    return {
      rectangle: {
        low: {
          latitude: this.config.biasLat - latDelta,
          longitude: this.config.biasLng - lngDelta,
        },
        high: {
          latitude: this.config.biasLat + latDelta,
          longitude: this.config.biasLng + lngDelta,
        },
      },
    };
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

  private async post<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${this.base}/${path}`, {
      method: 'POST',
      headers: {
        'X-Goog-Api-Key': this.config.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = (await res.json().catch(() => ({}))) as T & {
      error?: { message?: string };
    };

    if (!res.ok || data.error) {
      this.fail(path, res.status, data.error?.message);
    }
    return data;
  }

  private fail(op: string, status: number, message?: string): never {
    const detail = message ?? `HTTP ${status}`;
    this.logger.error(`Google ${op} failed: ${detail}`);
    throw new ServiceUnavailableException(`Address lookup failed: ${detail}`);
  }
}

// --- Minimal shapes of the Google responses we read. ---

interface TextValue {
  text?: string;
}

interface PlacePrediction {
  placeId: string;
  text?: TextValue;
  structuredFormat?: {
    mainText?: TextValue;
    secondaryText?: TextValue;
  };
}

interface AutocompleteResponse {
  suggestions?: { placePrediction?: PlacePrediction }[];
  error?: { message?: string };
}

interface PlaceDetailsResponse {
  id?: string;
  formattedAddress?: string;
  displayName?: TextValue;
  location?: { latitude: number; longitude: number };
  error?: { message?: string };
}

interface LatLngLiteral {
  latitude: number;
  longitude: number;
}

interface PlaceResult {
  id: string;
  formattedAddress?: string;
  displayName?: TextValue;
  location?: LatLngLiteral;
}

interface TextSearchResponse {
  places?: PlaceResult[];
  error?: { message?: string };
}

interface GeocodeApiResponse {
  status?: string;
  error_message?: string;
  results?: {
    place_id?: string;
    formatted_address?: string;
    geometry?: { location?: { lat: number; lng: number } };
  }[];
}
