import { createRadarClient } from "./radar-client";

export interface VenueGeofence {
  courtCount: number;
  id: string;
  latitude: number;
  longitude: number;
  name: string;
}

export async function syncVenueGeofence(
  secretKey: string,
  venue: VenueGeofence
): Promise<void> {
  const client = createRadarClient(secretKey);

  const radius = venue.courtCount > 4 ? 300 : 200;

  await client.upsertGeofence({
    coordinates: [venue.longitude, venue.latitude],
    description: venue.name,
    externalId: venue.id,
    metadata: {
      courtCount: venue.courtCount,
      venueId: venue.id,
    },
    radius,
    tag: "venue",
  });
}

export async function deleteVenueGeofence(
  secretKey: string,
  venueId: string
): Promise<void> {
  const client = createRadarClient(secretKey);
  await client.deleteGeofence("venue", venueId);
}
