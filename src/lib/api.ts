type ApiError = {
  error?: string;
};

export const apiRequest = async <T>(
  input: RequestInfo,
  init: RequestInit = {},
) => {
  const response = await fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    credentials: "include",
  });

  const payload = (await response.json().catch(() => ({}))) as T & ApiError;

  if (!response.ok) {
    const message = payload?.error || "Request failed.";
    throw new Error(message);
  }

  return payload;
};
