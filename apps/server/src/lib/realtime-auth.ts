interface RealtimeClaims {
  exp: number;
  name: string;
  resourceId: string;
  userId: string;
}

const textEncoder = new TextEncoder();

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

const base64UrlDecode = (value: string): Uint8Array | null => {
  try {
    const base64 = value.replaceAll("-", "+").replaceAll("_", "/");
    const padded = `${base64}${"=".repeat((4 - (base64.length % 4)) % 4)}`;
    return Uint8Array.from(
      atob(padded),
      (character) => character.codePointAt(0) ?? 0
    );
  } catch {
    return null;
  }
};

const signClaims = async (payload: string, secret: string) => {
  const key = await crypto.subtle.importKey(
    "raw",
    textEncoder.encode(secret),
    { hash: "SHA-256", name: "HMAC" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    textEncoder.encode(payload)
  );
  return base64UrlEncode(new Uint8Array(signature));
};

export const createRealtimeAccessToken = async (
  secret: string | undefined,
  claims: Omit<RealtimeClaims, "exp">,
  expiresInSeconds = 5 * 60
): Promise<string | null> => {
  if (!secret || !Number.isInteger(expiresInSeconds) || expiresInSeconds <= 0) {
    return null;
  }
  const payload = base64UrlEncode(
    textEncoder.encode(
      JSON.stringify({
        ...claims,
        exp: Math.floor(Date.now() / 1000) + expiresInSeconds,
      } satisfies RealtimeClaims)
    )
  );
  return `${payload}.${await signClaims(payload, secret)}`;
};

export const verifyRealtimeAccessToken = async (
  token: string | undefined,
  secret: string | undefined,
  resourceId: string,
  expectedUserId?: string
): Promise<RealtimeClaims | null> => {
  if (!token || !secret) {
    return null;
  }
  const [payload, signature, extra] = token.split(".");
  if (!(payload && signature) || extra) {
    return null;
  }
  const signatureBytes = base64UrlDecode(signature);
  const payloadBytes = base64UrlDecode(payload);
  if (!(signatureBytes && payloadBytes)) {
    return null;
  }

  const key = await crypto.subtle.importKey(
    "raw",
    textEncoder.encode(secret),
    { hash: "SHA-256", name: "HMAC" },
    false,
    ["verify"]
  );
  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    signatureBytes as BufferSource,
    textEncoder.encode(payload)
  );
  if (!valid) {
    return null;
  }

  try {
    const claims = JSON.parse(
      new TextDecoder().decode(payloadBytes)
    ) as Partial<RealtimeClaims>;
    if (
      typeof claims.exp !== "number" ||
      !Number.isFinite(claims.exp) ||
      claims.exp <= Math.floor(Date.now() / 1000) ||
      typeof claims.name !== "string" ||
      typeof claims.resourceId !== "string" ||
      claims.resourceId !== resourceId ||
      typeof claims.userId !== "string" ||
      (expectedUserId && claims.userId !== expectedUserId)
    ) {
      return null;
    }
    return claims as RealtimeClaims;
  } catch {
    return null;
  }
};
