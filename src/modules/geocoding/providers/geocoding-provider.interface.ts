/** A single autocomplete suggestion, trimmed to what the address picker needs. */
export interface PlaceSuggestion {
  /** Opaque provider place id — pass back to `placeDetails` to resolve coords. */
  placeId: string;
  /** Bold line, e.g. "Babcock University". */
  primary: string;
  /** Muted line, e.g. "Ilishan-Remo, Ogun State, Nigeria". */
  secondary: string;
  /** The full one-line label, for accessibility and fallback rendering. */
  full: string;
}

/** A resolved place with coordinates, produced when the user picks a suggestion. */
export interface PlaceDetails {
  placeId: string;
  /** Provider-formatted address line to prefill the delivery field. */
  address: string;
  /** Short display name of the place, when the provider gives one. */
  name: string;
  lat: number;
  lng: number;
  /**
   * Whether the resolved coordinates fall inside the delivery area. Lets the
   * client flag an out-of-area pick ("we don't deliver here yet") instead of
   * hiding out-of-area suggestions up front — the picker stays useful while the
   * delivery guarantee is enforced on the actual coordinates.
   */
  inServiceArea: boolean;
}

/**
 * Provider contract for address autocomplete + place resolution. Mirrors the
 * SMS/WhatsApp driver pattern: the GeocodingService depends on this, never on a
 * concrete vendor, so Google can be swapped for Mapbox etc. without touching
 * callers or the controller.
 *
 * `sessionToken` ties an autocomplete session to its final details lookup so the
 * provider can bill the pair as one session — callers must generate it once per
 * search and pass the same value to both methods.
 */
export interface GeocodingProvider {
  readonly name: string;
  isConfigured(): boolean;
  autocomplete(query: string, sessionToken: string): Promise<PlaceSuggestion[]>;
  placeDetails(placeId: string, sessionToken: string): Promise<PlaceDetails>;
  /**
   * Full-text place search. Broader coverage than autocomplete for obscure
   * local spots, and returns resolved coordinates inline — used as a fallback
   * when autocomplete finds nothing. Callers append the service area to the
   * query so a sparse local term ("hassan dudu") resolves.
   */
  textSearch(query: string): Promise<PlaceDetails[]>;
  /** Resolve raw device coordinates (from "use my location") into an address. */
  reverseGeocode(lat: number, lng: number): Promise<PlaceDetails>;
  /** Whether a coordinate falls inside the configured delivery area. */
  isWithinServiceArea(lat: number, lng: number): boolean;
}
