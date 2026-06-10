export const readApiJson = async <T>(
  request: Promise<{
    json: () => Promise<T>;
    ok: boolean;
    status: number;
    statusText: string;
  }>
) => {
  const response = await request;

  if (!response.ok) {
    throw new Error(
      response.statusText || `Request failed with ${response.status}`
    );
  }

  return response.json();
};
