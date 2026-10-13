interface ResponseLike {
  json: () => Promise<unknown>;
  ok: boolean;
  status: number;
  statusText: string;
}

type ExtractSuccessPayload<R> = R extends {
  status: 200 | 201 | 202 | 203 | 204 | 206;
  json: () => Promise<infer T>;
}
  ? T
  : R extends { json: () => Promise<infer T>; ok: true }
    ? T
    : never;

type ReadApiJsonResult<T, R> = [T] extends [never]
  ? [ExtractSuccessPayload<R>] extends [never]
    ? unknown
    : ExtractSuccessPayload<R>
  : T;

export async function readApiJson<
  T = never,
  R extends ResponseLike = ResponseLike,
>(request: Promise<R>): Promise<ReadApiJsonResult<T, R>> {
  const response = await request;

  if (!response.ok) {
    // Hono error bodies carry a human-readable `message`; surface it so
    // callers can show why a request failed instead of a bare status text.
    const body = (await response.json().catch(() => null)) as {
      message?: unknown;
    } | null;
    const serverMessage =
      typeof body?.message === "string" && body.message
        ? body.message
        : undefined;
    throw new Error(
      serverMessage ||
        response.statusText ||
        `Request failed with ${response.status}`
    );
  }

  return response.json() as Promise<ReadApiJsonResult<T, R>>;
}
