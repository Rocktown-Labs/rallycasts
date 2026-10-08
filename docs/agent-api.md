# RallyCasts Agent API

Give your AI agent a key and let it upload on your behalf.

## Create a key

Sign in and open **Settings** (`/u/settings`), then use the **Agent keys** card:

1. Name the key (for example `my upload agent`)
2. Click **Create key**
3. Copy the key immediately. It is shown once; RallyCasts only stores a hash

Keys carry the `rak_` prefix, act with your full account access, and can be revoked from the same card at any time. Keep them private: anyone with the key can do anything your account can do.

## Authenticate

Send the key on every request, either way:

```bash
curl -H "x-api-key: rak_..." https://api.rallycasts.com/api/v1/videos
# or the form most agent frameworks emit:
curl -H "Authorization: Bearer rak_..." https://api.rallycasts.com/api/v1/videos
```

Any route your session can use, the key can use. Invalid or revoked keys return `401`.

## Upload a video (horizontal)

Step 1: create an upload target.

```bash
curl -X POST https://api.rallycasts.com/api/v1/upload/mux \
  -H "Authorization: Bearer rak_..." \
  -H "Content-Type: application/json" \
  -d '{
    "mediaType": "video",
    "title": "Friday night open play",
    "visibility": "public",
    "description": "Game 3 at the park"
  }'
```

The response contains `uploadUrl` (a one-time Mux URL) and the created `video` record:

```json
{
  "uploadId": "...",
  "uploadUrl": "https://storage.googleapis.com/...",
  "video": { "id": "...", "status": "uploading" }
}
```

Step 2: PUT the file to `uploadUrl`.

```bash
curl -X PUT --data-binary @match.mp4 "$UPLOAD_URL"
```

Step 3: wait. When Mux finishes processing, the asset webhook publishes the video (`status: "ready"`) and it appears on your profile and in feeds.

## Upload a clip directly (vertical)

You do not need to clip an existing video. Upload a standalone vertical clip the same way with `"mediaType": "short"`:

```bash
curl -X POST https://api.rallycasts.com/api/v1/upload/mux \
  -H "Authorization: Bearer rak_..." \
  -H "Content-Type: application/json" \
  -d '{
    "mediaType": "short",
    "title": "Kitchen put-away",
    "visibility": "public"
  }'
```

Then PUT the vertical file to the returned `uploadUrl`. It lands on the clips shelf on your own page.

## Orientation is enforced by the footage

The content model keeps clips vertical and full videos horizontal, and the uploaded footage wins: when processing completes, a landscape upload declared as a clip is corrected to a regular video, and a vertical upload declared as a video is corrected to a clip. Nothing is rejected; the shelves stay honest.

## Limits

Agent keys are rate limited (100 requests per minute per key) and hit the same API limits as normal requests.
