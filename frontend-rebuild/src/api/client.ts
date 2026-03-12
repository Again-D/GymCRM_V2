const useMockData = import.meta.env.VITE_REBUILD_MOCK_DATA === "1";

export type ApiEnvelope<T> = {
  success: boolean;
  data: T;
  message: string;
  timestamp: string;
  traceId: string;
};

async function resolveMockEnvelope<T>(path: string): Promise<ApiEnvelope<T>> {
  const { getMockResponse } = await import("./mockData");
  const payload = getMockResponse(path) as ApiEnvelope<T> | null;
  if (!payload) {
    throw new Error(`No mock response configured for ${path}`);
  }
  return payload;
}

export async function apiGet<T>(path: string): Promise<ApiEnvelope<T>> {
  if (useMockData) {
    return resolveMockEnvelope<T>(path);
  }

  const response = await fetch(path, {
    credentials: "include"
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return (await response.json()) as ApiEnvelope<T>;
}
