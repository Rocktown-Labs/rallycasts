const MUX_API_BASE = "https://api.mux.com/video/v1";
const MUX_REQUEST_TIMEOUT_MS = 10_000;

const base64UrlEncode = (value: Uint8Array): string => {
  let binary = "";
  for (const byte of value) {
    binary += String.fromCodePoint(byte);
  }
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/u, "");
};

const decodeMuxPrivateKey = (value: string): Uint8Array => {
  const normalized = value.replaceAll("\\n", "\n").trim();
  const base64 = normalized.includes("BEGIN PRIVATE KEY")
    ? normalized
        .replace("-----BEGIN PRIVATE KEY-----", "")
        .replace("-----END PRIVATE KEY-----", "")
        .replaceAll(/\s/gu, "")
    : normalized.replaceAll(/\s/gu, "");
  const base64Standard = base64.replaceAll("-", "+").replaceAll("_", "/");
  const paddedBase64 = base64Standard.padEnd(
    base64Standard.length + ((4 - (base64Standard.length % 4)) % 4),
    "="
  );
  return Uint8Array.from(
    atob(paddedBase64),
    (character) => character.codePointAt(0) ?? 0
  );
};

export const createMuxPlaybackToken = async (
  playbackId: string,
  signingKeyId: string,
  privateKey: string,
  expiresInSeconds = 60 * 60
): Promise<string> => {
  const key = await crypto.subtle.importKey(
    "pkcs8",
    decodeMuxPrivateKey(privateKey) as BufferSource,
    { hash: "SHA-256", name: "RSASSA-PKCS1-v1_5" },
    false,
    ["sign"]
  );
  const header = base64UrlEncode(
    new TextEncoder().encode(JSON.stringify({ alg: "RS256", typ: "JWT" }))
  );
  const payload = base64UrlEncode(
    new TextEncoder().encode(
      JSON.stringify({
        aud: "v",
        exp: Math.floor(Date.now() / 1000) + expiresInSeconds,
        kid: signingKeyId,
        sub: playbackId,
      })
    )
  );
  const unsignedToken = `${header}.${payload}`;
  const signature = new Uint8Array(
    await crypto.subtle.sign(
      { name: "RSASSA-PKCS1-v1_5" },
      key,
      new TextEncoder().encode(unsignedToken)
    )
  );
  return `${unsignedToken}.${base64UrlEncode(signature)}`;
};

interface MuxUploadResponse {
  data: {
    id: string;
    status: string;
    url: string;
    new_asset_settings: {
      playback_policy: string[];
    };
  };
}

interface MuxAssetResponse {
  data: {
    id: string;
    status: string;
    playback_ids: {
      id: string;
      policy: string;
    }[];
    duration: number;
    max_stored_resolution: string;
  };
}

export async function createMuxClip(
  sourceAssetId: string,
  startTime: number,
  endTime: number,
  tokenId: string,
  tokenSecret: string,
  videoId: string,
  playbackPolicy: "public" | "signed" = "public"
): Promise<{ assetId: string; playbackId: string | null; status: string }> {
  const response = await fetch(`${MUX_API_BASE}/assets`, {
    body: JSON.stringify({
      inputs: [
        {
          end_time: endTime,
          start_time: startTime,
          url: `mux://assets/${sourceAssetId}`,
        },
      ],
      passthrough: videoId,
      playback_policies: [playbackPolicy],
      video_quality: "basic",
    }),
    headers: {
      Authorization: `Basic ${btoa(`${tokenId}:${tokenSecret}`)}`,
      "Content-Type": "application/json",
    },
    method: "POST",
    signal: AbortSignal.timeout(MUX_REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Mux clip creation failed: ${response.status} ${error}`);
  }

  const result = (await response.json()) as MuxAssetResponse;
  return {
    assetId: result.data.id,
    playbackId: result.data.playback_ids[0]?.id ?? null,
    status: result.data.status,
  };
}

export async function createMuxUploadUrl(
  tokenId: string,
  tokenSecret: string,
  videoId?: string,
  corsOrigin = "*",
  playbackPolicy: "public" | "signed" = "signed"
): Promise<{ uploadId: string; uploadUrl: string }> {
  const response = await fetch(`${MUX_API_BASE}/uploads`, {
    body: JSON.stringify({
      cors_origin: corsOrigin,
      new_asset_settings: {
        passthrough: videoId,
        playback_policy: [playbackPolicy],
      },
    }),
    headers: {
      Authorization: `Basic ${btoa(`${tokenId}:${tokenSecret}`)}`,
      "Content-Type": "application/json",
    },
    method: "POST",
    signal: AbortSignal.timeout(MUX_REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Mux upload creation failed: ${response.status} ${error}`);
  }

  const data = (await response.json()) as MuxUploadResponse;

  return {
    uploadId: data.data.id,
    uploadUrl: data.data.url,
  };
}

const deleteMuxPlaybackId = async (
  assetId: string,
  playbackId: string,
  tokenId: string,
  tokenSecret: string
) => {
  const response = await fetch(
    `${MUX_API_BASE}/assets/${encodeURIComponent(assetId)}/playback-ids/${encodeURIComponent(playbackId)}`,
    {
      headers: {
        Authorization: `Basic ${btoa(`${tokenId}:${tokenSecret}`)}`,
      },
      method: "DELETE",
      signal: AbortSignal.timeout(MUX_REQUEST_TIMEOUT_MS),
    }
  );

  // A failed request can be retried after the old ID was already revoked.
  if (!response.ok && response.status !== 404) {
    throw new Error(
      `Mux previous playback ID deletion failed (${response.status})`
    );
  }
};

export async function replaceMuxAssetPlaybackPolicy(
  assetId: string,
  playbackPolicy: "public" | "signed",
  tokenId: string,
  tokenSecret: string,
  previousPlaybackId?: string | null
): Promise<string> {
  const existingAsset = await getMuxAsset(assetId, tokenId, tokenSecret);
  const existingPlaybackId = existingAsset?.playback_ids.find(
    (playbackId) => playbackId.policy === playbackPolicy
  )?.id;
  if (existingPlaybackId) {
    if (previousPlaybackId && previousPlaybackId !== existingPlaybackId) {
      await deleteMuxPlaybackId(
        assetId,
        previousPlaybackId,
        tokenId,
        tokenSecret
      );
    }
    return existingPlaybackId;
  }

  const response = await fetch(
    `${MUX_API_BASE}/assets/${encodeURIComponent(assetId)}/playback-ids`,
    {
      body: JSON.stringify({ policy: playbackPolicy }),
      headers: {
        Authorization: `Basic ${btoa(`${tokenId}:${tokenSecret}`)}`,
        "Content-Type": "application/json",
      },
      method: "POST",
      signal: AbortSignal.timeout(MUX_REQUEST_TIMEOUT_MS),
    }
  );

  if (!response.ok) {
    throw new Error(`Mux playback ID creation failed (${response.status})`);
  }

  const result = (await response.json()) as {
    data?: { id?: unknown; policy?: unknown };
  };
  const replacementPlaybackId = result.data?.id;
  if (
    typeof replacementPlaybackId !== "string" ||
    result.data?.policy !== playbackPolicy
  ) {
    throw new Error("Mux returned an invalid playback ID");
  }

  if (previousPlaybackId && previousPlaybackId !== replacementPlaybackId) {
    await deleteMuxPlaybackId(
      assetId,
      previousPlaybackId,
      tokenId,
      tokenSecret
    );
  }

  return replacementPlaybackId;
}

export async function getMuxAsset(
  assetId: string,
  tokenId: string,
  tokenSecret: string
): Promise<MuxAssetResponse["data"] | null> {
  const response = await fetch(
    `${MUX_API_BASE}/assets/${encodeURIComponent(assetId)}`,
    {
      headers: {
        Authorization: `Basic ${btoa(`${tokenId}:${tokenSecret}`)}`,
      },
      signal: AbortSignal.timeout(MUX_REQUEST_TIMEOUT_MS),
    }
  );

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as MuxAssetResponse;

  return data.data;
}

export async function getMuxUpload(
  uploadId: string,
  tokenId: string,
  tokenSecret: string
): Promise<{ assetId: string | null; status: string } | null> {
  const response = await fetch(
    `${MUX_API_BASE}/uploads/${encodeURIComponent(uploadId)}`,
    {
      headers: {
        Authorization: `Basic ${btoa(`${tokenId}:${tokenSecret}`)}`,
      },
      signal: AbortSignal.timeout(MUX_REQUEST_TIMEOUT_MS),
    }
  );

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as {
    data: { id: string; status: string; asset_id: string | null };
  };

  return {
    assetId: data.data.asset_id,
    status: data.data.status,
  };
}

export const MUX_RTMP_INGEST_URL = "rtmps://global-live.mux.com:443/app";

export interface MuxLiveStream {
  activeAssetId: string | null;
  id: string;
  latencyMode: string;
  playbackId: string | null;
  playbackPolicy: string | null;
  recentAssetIds: string[];
  reconnectWindow: number;
  status: string;
  streamKey: string;
}

interface MuxLiveStreamResponse {
  data: {
    active_asset_id?: string | null;
    id: string;
    latency_mode?: string;
    playback_ids?: { id: string; policy: string }[];
    recent_asset_ids?: string[];
    reconnect_window?: number;
    status: string;
    stream_key: string;
  };
}

const toMuxLiveStream = (
  data: MuxLiveStreamResponse["data"]
): MuxLiveStream => ({
  activeAssetId: data.active_asset_id ?? null,
  id: data.id,
  latencyMode: data.latency_mode ?? "standard",
  playbackId: data.playback_ids?.[0]?.id ?? null,
  playbackPolicy: data.playback_ids?.[0]?.policy ?? null,
  recentAssetIds: data.recent_asset_ids ?? [],
  reconnectWindow: data.reconnect_window ?? 60,
  status: data.status,
  streamKey: data.stream_key,
});

export async function createMuxLiveStream(
  tokenId: string,
  tokenSecret: string,
  options: {
    latencyMode?: "low" | "reduced" | "standard";
    passthrough?: string;
    playbackPolicy?: "public" | "signed";
    reconnectWindow?: number;
    title: string;
  }
): Promise<MuxLiveStream> {
  const response = await fetch(`${MUX_API_BASE}/live-streams`, {
    body: JSON.stringify({
      latency_mode: options.latencyMode ?? "low",
      meta: { title: options.title },
      new_asset_settings: {
        ...(options.passthrough ? { passthrough: options.passthrough } : {}),
        playback_policies: [options.playbackPolicy ?? "public"],
      },
      ...(options.passthrough ? { passthrough: options.passthrough } : {}),
      playback_policies: [options.playbackPolicy ?? "public"],
      reconnect_window: options.reconnectWindow ?? 60,
    }),
    headers: {
      Authorization: `Basic ${btoa(`${tokenId}:${tokenSecret}`)}`,
      "Content-Type": "application/json",
    },
    method: "POST",
    signal: AbortSignal.timeout(MUX_REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(
      `Mux live stream creation failed: ${response.status} ${error}`
    );
  }

  const result = (await response.json()) as MuxLiveStreamResponse;
  return toMuxLiveStream(result.data);
}

export async function getMuxLiveStream(
  liveStreamId: string,
  tokenId: string,
  tokenSecret: string
): Promise<MuxLiveStream | null> {
  const response = await fetch(
    `${MUX_API_BASE}/live-streams/${encodeURIComponent(liveStreamId)}`,
    {
      headers: {
        Authorization: `Basic ${btoa(`${tokenId}:${tokenSecret}`)}`,
      },
      signal: AbortSignal.timeout(MUX_REQUEST_TIMEOUT_MS),
    }
  );

  if (!response.ok) {
    return null;
  }

  const result = (await response.json()) as MuxLiveStreamResponse;
  return toMuxLiveStream(result.data);
}

export async function resetMuxLiveStreamKey(
  liveStreamId: string,
  tokenId: string,
  tokenSecret: string
): Promise<string> {
  const response = await fetch(
    `${MUX_API_BASE}/live-streams/${encodeURIComponent(liveStreamId)}/reset-stream-key`,
    {
      headers: {
        Authorization: `Basic ${btoa(`${tokenId}:${tokenSecret}`)}`,
      },
      method: "POST",
      signal: AbortSignal.timeout(MUX_REQUEST_TIMEOUT_MS),
    }
  );

  if (!response.ok) {
    throw new Error(
      `Mux live stream key reset failed: ${response.status} ${await response.text()}`
    );
  }

  const result = (await response.json()) as MuxLiveStreamResponse;
  return result.data.stream_key;
}

export async function signalMuxLiveStreamComplete(
  liveStreamId: string,
  tokenId: string,
  tokenSecret: string
): Promise<void> {
  const response = await fetch(
    `${MUX_API_BASE}/live-streams/${encodeURIComponent(liveStreamId)}/complete`,
    {
      headers: {
        Authorization: `Basic ${btoa(`${tokenId}:${tokenSecret}`)}`,
      },
      method: "PUT",
      signal: AbortSignal.timeout(MUX_REQUEST_TIMEOUT_MS),
    }
  );

  if (!response.ok && response.status !== 404) {
    throw new Error(
      `Mux live stream completion failed: ${response.status} ${await response.text()}`
    );
  }
}

export async function deleteMuxLiveStream(
  liveStreamId: string,
  tokenId: string,
  tokenSecret: string
): Promise<boolean> {
  const response = await fetch(
    `${MUX_API_BASE}/live-streams/${encodeURIComponent(liveStreamId)}`,
    {
      headers: {
        Authorization: `Basic ${btoa(`${tokenId}:${tokenSecret}`)}`,
      },
      method: "DELETE",
      signal: AbortSignal.timeout(MUX_REQUEST_TIMEOUT_MS),
    }
  );

  return response.ok || response.status === 404;
}

export async function deleteMuxAsset(
  assetId: string,
  tokenId: string,
  tokenSecret: string
): Promise<boolean> {
  const response = await fetch(
    `${MUX_API_BASE}/assets/${encodeURIComponent(assetId)}`,
    {
      headers: {
        Authorization: `Basic ${btoa(`${tokenId}:${tokenSecret}`)}`,
      },
      method: "DELETE",
      signal: AbortSignal.timeout(MUX_REQUEST_TIMEOUT_MS),
    }
  );

  return response.ok || response.status === 404;
}
