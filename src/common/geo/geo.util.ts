/** [longitude, latitude] — GeoJSON order. */
export type LngLat = [number, number];

const EARTH_RADIUS_KM = 6371;

/**
 * Straight-line distance underestimates real driving distance, so we scale it
 * up by this factor to approximate road distance for fee/ETA purposes. A real
 * routing API (Google/Mapbox Distance Matrix) can replace this later without
 * touching callers.
 */
export const ROAD_DISTANCE_FACTOR = 1.3;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Great-circle distance in km between two [lng, lat] points. */
export function haversineKm(a: LngLat, b: LngLat): number {
  const [lng1, lat1] = a;
  const [lng2, lat2] = b;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.asin(Math.sqrt(s));
}

/** Approximate road distance in km (haversine scaled by ROAD_DISTANCE_FACTOR). */
export function roadDistanceKm(a: LngLat, b: LngLat): number {
  return haversineKm(a, b) * ROAD_DISTANCE_FACTOR;
}

export interface DeliveryPricing {
  baseFee: number;
  perKmFee: number;
  /** Distance covered by baseFee before per-km charges kick in. */
  freeRadiusKm: number;
  /** Beyond this, delivery is refused. */
  maxRadiusKm: number;
  minFee: number;
  maxFee: number;
}

/**
 * Distance-based delivery fee: baseFee covers freeRadiusKm, then perKmFee per
 * extra km. Rounded to the nearest ₦50 and clamped to [minFee, maxFee].
 */
export function computeDeliveryFee(
  distanceKm: number,
  p: DeliveryPricing,
): number {
  const chargeableKm = Math.max(0, distanceKm - p.freeRadiusKm);
  const raw = p.baseFee + p.perKmFee * chargeableKm;
  const rounded = Math.round(raw / 50) * 50;
  return Math.min(p.maxFee, Math.max(p.minFee, rounded));
}
