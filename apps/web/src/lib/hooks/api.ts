interface ResponseLike {
  json: () => Promise<unknown>;
  ok: boolean;
  status: number;
  statusText: string;
}

type ExtractSuccessPayload<R> = R extends {
  status: 200 | 201 | 202 | 203 | 204 | 206;
  json(): Promise<infer T>;
}
  ? T
  : R extends { ok: true; json(): Promise<infer T> }
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
    throw new Error(
      response.statusText || `Request failed with ${response.status}`
    );
  }

  return response.json() as Promise<ReadApiJsonResult<T, R>>;
}
