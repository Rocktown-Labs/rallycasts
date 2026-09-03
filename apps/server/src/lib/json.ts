export type JsonPayload =
  | { ok: true; raw: string; value: unknown }
  | { error: "invalid_json"; ok: false; raw: string; value: null };

export const readJsonPayload = async (
  request: Request
): Promise<JsonPayload> => {
  const raw = await request.text();

  if (!raw) {
    return { ok: true, raw: "{}", value: {} };
  }

  try {
    return {
      ok: true,
      raw,
      value: JSON.parse(raw) as unknown,
    };
  } catch {
    return { error: "invalid_json", ok: false, raw, value: null };
  }
};
