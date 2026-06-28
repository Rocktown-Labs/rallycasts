const MUX_API_BASE = "https://api.mux.com/video/v1";

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
  videoId: string
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
      playback_policies: ["public"],
      video_quality: "basic",
    }),
    headers: {
      Authorization: `Basic ${btoa(`${tokenId}:${tokenSecret}`)}`,
      "Content-Type": "application/json",
    },
    method: "POST",
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
  corsOrigin = "*"
): Promise<{ uploadId: string; uploadUrl: string }> {
  const response = await fetch(`${MUX_API_BASE}/uploads`, {
    body: JSON.stringify({
      cors_origin: corsOrigin,
      new_asset_settings: {
        passthrough: videoId,
        playback_policy: ["public"],
      },
    }),
    headers: {
      Authorization: `Basic ${btoa(`${tokenId}:${tokenSecret}`)}`,
      "Content-Type": "application/json",
    },
    method: "POST",
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

export async function getMuxAsset(
  assetId: string,
  tokenId: string,
  tokenSecret: string
): Promise<MuxAssetResponse["data"] | null> {
  const response = await fetch(`${MUX_API_BASE}/assets/${assetId}`, {
    headers: {
      Authorization: `Basic ${btoa(`${tokenId}:${tokenSecret}`)}`,
    },
  });

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
  const response = await fetch(`${MUX_API_BASE}/uploads/${uploadId}`, {
    headers: {
      Authorization: `Basic ${btoa(`${tokenId}:${tokenSecret}`)}`,
    },
  });

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
