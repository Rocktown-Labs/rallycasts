import { and, gte, isNotNull, lte } from "drizzle-orm";
import type { SQLiteColumn } from "drizzle-orm/sqlite-core";

const EARTH_RADIUS_MILES = 3959;
export const MILES_PER_LATITUDE_DEGREE = 69;

const toRad = (deg: number) => (deg * Math.PI) / 180;

export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_MILES * c;
}

export const getBoundingBox = (
  lat: number,
  lng: number,
  radiusMiles: number
) => {
  const latitudeDelta = radiusMiles / MILES_PER_LATITUDE_DEGREE;
  const longitudeDelta =
    radiusMiles /
    (MILES_PER_LATITUDE_DEGREE *
      Math.max(Math.cos((lat * Math.PI) / 180), 0.01));

  return {
    maxLat: lat + latitudeDelta,
    maxLng: lng + longitudeDelta,
    minLat: lat - latitudeDelta,
    minLng: lng - longitudeDelta,
  };
};

export const locationBounds = (
  lat: number,
  lng: number,
  radiusMiles: number,
  latitudeColumn: SQLiteColumn,
  longitudeColumn: SQLiteColumn
) => {
  const box = getBoundingBox(lat, lng, radiusMiles);

  return and(
    isNotNull(latitudeColumn),
    isNotNull(longitudeColumn),
    gte(latitudeColumn, box.minLat),
    lte(latitudeColumn, box.maxLat),
    gte(longitudeColumn, box.minLng),
    lte(longitudeColumn, box.maxLng)
  );
};

export const byDistance =
  (lat: number, lng: number) =>
  <
    T extends {
      latitude: number | null;
      longitude: number | null;
    },
  >(
    left: T,
    right: T
  ) =>
    haversineDistance(lat, lng, left.latitude ?? 0, left.longitude ?? 0) -
    haversineDistance(lat, lng, right.latitude ?? 0, right.longitude ?? 0);

export const withinRadius = (
  lat: number,
  lng: number,
  itemLat: number | null,
  itemLng: number | null,
  radiusMiles: number
) =>
  itemLat !== null &&
  itemLng !== null &&
  haversineDistance(lat, lng, itemLat, itemLng) <= radiusMiles;

export { EARTH_RADIUS_MILES };
