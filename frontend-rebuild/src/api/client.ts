export type ApiEnvelope<T> = {
  success: boolean;
  data: T;
  message: string;
  timestamp: string;
  traceId: string;
};

export async function apiGet<T>(path: string): Promise<ApiEnvelope<T>> {
  const response = await fetch(path, {
    credentials: "include"
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return (await response.json()) as ApiEnvelope<T>;
}
