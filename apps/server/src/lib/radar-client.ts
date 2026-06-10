const RADAR_API_BASE = "https://api.radar.io/v1";

export class RadarClient {
  private secretKey: string;

  constructor(secretKey: string) {
    this.secretKey = secretKey;
  }

  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${RADAR_API_BASE}${path}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: this.secretKey,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Radar API error: ${response.status} ${error}`);
    }

    return response.json() as Promise<T>;
  }

  upsertGeofence(params: {
    coordinates: [number, number];
    description: string;
    externalId: string;
    metadata?: Record<string, string | boolean | number>;
    radius: number;
    tag: string;
  }): Promise<{ meta: { code: number } }> {
    return this.request(`/${params.tag}/${params.externalId}`, {
      body: JSON.stringify({
        coordinates: params.coordinates,
        description: params.description,
        metadata: {
          venueId: params.externalId,
          ...params.metadata,
        },
        radius: params.radius,
        type: "circle",
      }),
      method: "PUT",
    });
  }

  deleteGeofence(
    tag: string,
    externalId: string
  ): Promise<{ meta: { code: number } }> {
    return this.request(`/${tag}/${externalId}`, {
      method: "DELETE",
    });
  }

  listGeofences(params?: { limit?: number; tag?: string }): Promise<{
    geofences: {
      description: string;
      externalId: string;
      metadata?: Record<string, unknown>;
      radius: number;
      tag: string;
    }[];
    meta: { code: number };
  }> {
    const query = new URLSearchParams();
    if (params?.limit) {
      query.set("limit", String(params.limit));
    }
    if (params?.tag) {
      query.set("tag", params.tag);
    }
    const queryString = query.toString();
    return this.request(`/geofences${queryString ? `?${queryString}` : ""}`);
  }
}

export function createRadarClient(secretKey: string): RadarClient {
  return new RadarClient(secretKey);
}
