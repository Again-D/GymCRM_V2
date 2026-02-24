const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

type ApiAuthHooks = {
  getAccessToken: () => string | null;
  refreshAccessToken: () => Promise<string | null>;
  onUnauthorized?: () => void;
};

let apiAuthHooks: ApiAuthHooks | null = null;
let refreshInFlight: Promise<string | null> | null = null;

export type ApiEnvelope<T> = {
  success: boolean;
  data: T;
  message: string;
  timestamp: string;
  traceId: string;
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
  traceId?: string;

  constructor(message: string, options: { status: number; code?: string; detail?: string; traceId?: string }) {
    super(message);
    this.name = "ApiClientError";
    this.status = options.status;
    this.code = options.code;
    this.detail = options.detail;
    this.traceId = options.traceId;
  }
}

export function configureApiAuth(hooks: ApiAuthHooks | null) {
  apiAuthHooks = hooks;
  refreshInFlight = null;
}

async function refreshAccessTokenShared(): Promise<string | null> {
  if (!apiAuthHooks) {
    return null;
  }
  if (!refreshInFlight) {
    refreshInFlight = apiAuthHooks.refreshAccessToken().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

async function request<T>(
  path: string,
  init?: RequestInit,
  options?: { skipAuthRetry?: boolean; overrideAccessToken?: string | null }
): Promise<ApiEnvelope<T>> {
  const headers = new Headers(init?.headers);
  if (init?.body != null && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const accessToken = options?.overrideAccessToken ?? apiAuthHooks?.getAccessToken();
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
    credentials: "include"
  });

  let payload: ApiEnvelope<T> | null = null;
  try {
    payload = (await response.json()) as ApiEnvelope<T>;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const isAuth401 =
      response.status === 401 &&
      !options?.skipAuthRetry &&
      apiAuthHooks != null &&
      !path.startsWith("/api/v1/auth/login") &&
      !path.startsWith("/api/v1/auth/refresh") &&
      !path.startsWith("/api/v1/auth/logout");

    if (isAuth401) {
      try {
        const nextAccessToken = await refreshAccessTokenShared();
        if (nextAccessToken) {
          return request<T>(path, init, { skipAuthRetry: true, overrideAccessToken: nextAccessToken });
        }
      } catch {
        // Fall through to unauthorized handling below.
      }
      apiAuthHooks?.onUnauthorized?.();
    }

    throw new ApiClientError(payload?.message ?? `API 요청 실패: ${response.status}`, {
      status: response.status,
      code: payload?.error?.code,
      detail: payload?.error?.detail,
      traceId: payload?.traceId
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

export function apiPost<T>(path: string, body?: unknown): Promise<ApiEnvelope<T>> {
  const hasBody = body !== undefined;
  return request<T>(path, {
    method: "POST",
    body: hasBody ? JSON.stringify(body) : undefined
  });
}

export function apiPatch<T>(path: string, body: unknown): Promise<ApiEnvelope<T>> {
  return request<T>(path, {
    method: "PATCH",
    body: JSON.stringify(body)
  });
}
