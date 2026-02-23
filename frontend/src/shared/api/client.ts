const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080";

export type ApiEnvelope<T> = {
  success: boolean;
  data: T;
  message: string;
  timestamp: string;
  error: ApiError | null;
};

export type ApiError = {
  code: string;
  status: number;
  detail: string;
};

export class ApiClientError extends Error {
  status: number;
  code?: string;
  detail?: string;

  constructor(message: string, options: { status: number; code?: string; detail?: string }) {
    super(message);
    this.name = "ApiClientError";
    this.status = options.status;
    this.code = options.code;
    this.detail = options.detail;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<ApiEnvelope<T>> {
  const headers = new Headers(init?.headers);
  if (init?.body != null && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers
  });

  let payload: ApiEnvelope<T> | null = null;
  try {
    payload = (await response.json()) as ApiEnvelope<T>;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new ApiClientError(payload?.message ?? `API 요청 실패: ${response.status}`, {
      status: response.status,
      code: payload?.error?.code,
      detail: payload?.error?.detail
    });
  }

  if (!payload) {
    throw new ApiClientError("응답을 해석할 수 없습니다.", { status: response.status });
  }

  return payload;
}

export function apiGet<T>(path: string): Promise<ApiEnvelope<T>> {
  return request<T>(path, { method: "GET" });
}

export function apiPost<T>(path: string, body: unknown): Promise<ApiEnvelope<T>> {
  return request<T>(path, {
    method: "POST",
    body: JSON.stringify(body)
  });
}

export function apiPatch<T>(path: string, body: unknown): Promise<ApiEnvelope<T>> {
  return request<T>(path, {
    method: "PATCH",
    body: JSON.stringify(body)
  });
}
