type ResponseLike =
  | { json: () => Promise<unknown>; ok: boolean; status: number; statusText: string }
  | Response;

export async function readApiJson<T = unknown>(
  request: Promise<unknown>
): Promise<T> {
  const response = (await request) as ResponseLike;

  if (!response.ok) {
    throw new Error(
      response.statusText || `Request failed with status ${response.status}`
    );
  }

  return (await response.json()) as T;
}
