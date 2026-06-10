export async function uploadToR2(
  bucket: R2Bucket,
  key: string,
  body: ArrayBuffer | Uint8Array,
  contentType: string
): Promise<string> {
  await bucket.put(key, body, {
    httpMetadata: {
      contentType,
    },
  });

  return key;
}
