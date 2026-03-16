const DEFAULT_USE_MOCK_DATA =
  import.meta.env.MODE === "test" ||
  import.meta.env.VITE_REBUILD_MOCK_DATA === "1";
// In local dev we want to default to Vite's same-origin /api proxy. Falling back to the root app's
// VITE_API_BASE_URL makes the rebuild app call the backend directly from a different origin (5176),
// which turns local staging-profile smoke into a CORS problem instead of an auth/runtime check.
const API_BASE_URL = import.meta.env.DEV
  ? (import.meta.env.VITE_REBUILD_API_BASE_URL ?? "")
  : (import.meta.env.VITE_REBUILD_API_BASE_URL ??
    import.meta.env.VITE_API_BASE_URL ??
    "");
let mockApiModeOverride: boolean | null = null;

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
  error?: ApiError | null;
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

  constructor(
    message: string,
    options: {
      status: number;
      code?: string;
      detail?: string;
      traceId?: string;
    },
  ) {
    super(message);
    this.name = "ApiClientError";
    this.status = options.status;
    this.code = options.code;
    this.detail = options.detail;
    this.traceId = options.traceId;
  }
}

export function isMockApiMode() {
  return mockApiModeOverride ?? DEFAULT_USE_MOCK_DATA;
}

export function setMockApiModeForTests(value: boolean | null) {
  mockApiModeOverride = value;
}

export function configureApiAuth(hooks: ApiAuthHooks | null) {
  apiAuthHooks = hooks;
  refreshInFlight = null;
}

async function resolveMockEnvelope<T>(path: string): Promise<ApiEnvelope<T>> {
  const { getMockResponse } = await import("./mockData");
  const payload = getMockResponse(path) as ApiEnvelope<T> | null;
  if (!payload) {
    throw new Error(`No mock response configured for ${path}`);
  }
  return payload;
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
  options?: { skipAuthRetry?: boolean; overrideAccessToken?: string | null },
): Promise<ApiEnvelope<T>> {
  if (isMockApiMode()) {
    return resolveMockEnvelope<T>(path);
  }

  const headers = new Headers(init?.headers);
  if (init?.body != null && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const accessToken =
    options?.overrideAccessToken ?? apiAuthHooks?.getAccessToken();
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
    credentials: "include",
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
          return request<T>(path, init, {
            skipAuthRetry: true,
            overrideAccessToken: nextAccessToken,
          });
        }
      } catch {
        // Fall through to unauthorized handling.
      }
      apiAuthHooks?.onUnauthorized?.();
    }

    throw new ApiClientError(
      payload?.message ?? `API request failed: ${response.status}`,
      {
        status: response.status,
        code: payload?.error?.code,
        detail: payload?.error?.detail,
        traceId: payload?.traceId,
      },
    );
  }

  if (!payload) {
    throw new ApiClientError("응답을 해석할 수 없습니다.", {
      status: response.status,
    });
  }

  return payload;
}

export function apiGet<T>(path: string): Promise<ApiEnvelope<T>> {
  return request<T>(path, { method: "GET" });
}

export function apiPost<T>(
  path: string,
  body?: unknown,
): Promise<ApiEnvelope<T>> {
  return request<T>(path, {
    method: "POST",
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export function apiPatch<T>(
  path: string,
  body: unknown,
): Promise<ApiEnvelope<T>> {
  return request<T>(path, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}
