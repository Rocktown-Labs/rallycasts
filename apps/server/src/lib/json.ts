export const readJsonPayload = async (request: Request) => {
  const text = await request.text();

  if (!text) {
    return {
      raw: "{}",
      value: {},
    };
  }

  return {
    raw: text,
    value: JSON.parse(text) as unknown,
  };
};
