interface AuthErrorDetails {
  code?: unknown;
  message?: unknown;
  statusText?: unknown;
}

const getAuthErrorDetails = (error: unknown): AuthErrorDetails | undefined => {
  if (typeof error !== "object" || error === null || !("error" in error)) {
    return undefined;
  }

  const details = error.error;
  return typeof details === "object" && details !== null
    ? (details as AuthErrorDetails)
    : undefined;
};

export const getAuthErrorCode = (error: unknown) => {
  const code = getAuthErrorDetails(error)?.code;
  return typeof code === "string" ? code : undefined;
};

export const getAuthErrorMessage = (error: unknown) => {
  const details = getAuthErrorDetails(error);
  if (typeof details?.message === "string" && details.message) {
    return details.message;
  }

  if (typeof details?.statusText === "string" && details.statusText) {
    return details.statusText;
  }

  return error instanceof Error ? error.message : "Authentication failed";
};
