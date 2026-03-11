import { useEffect, useRef, useState } from "react";
import { ApiClientError, apiGet, apiPost, configureApiAuth } from "../api/client";

export type SecurityMode = "unknown" | "prototype" | "jwt";

export type HealthPayload = {
  status: string;
  securityMode: string;
  prototypeNoAuth: boolean;
  currentUserId: number | null;
};

export type AuthUserSession = {
  userId: number;
  centerId: number;
  loginId: string;
  displayName: string;
  roleCode: "ROLE_CENTER_ADMIN" | "ROLE_DESK" | "ROLE_TRAINER";
};

export type AuthTokenResponse = {
  accessToken: string;
  accessTokenExpiresInSeconds: number;
  accessTokenExpiresAt: string;
  user: AuthUserSession;
};

type UseAuthSessionOptions = {
  formatError: (error: unknown) => string;
  onProtectedUiReset: () => void;
};

function useLatestRef<T>(value: T) {
  const ref = useRef(value);
  ref.current = value;
  return ref;
}

export function useAuthSession({ formatError, onProtectedUiReset }: UseAuthSessionOptions) {
  const [securityMode, setSecurityMode] = useState<SecurityMode>("unknown");
  const [prototypeNoAuth, setPrototypeNoAuth] = useState(false);
  const [authBootstrapping, setAuthBootstrapping] = useState(true);
  const [authAccessToken, setAuthAccessToken] = useState<string | null>(null);
  const [authUser, setAuthUser] = useState<AuthUserSession | null>(null);
  const [authStatusMessage, setAuthStatusMessage] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [loginSubmitting, setLoginSubmitting] = useState(false);
  const formatErrorRef = useLatestRef(formatError);
  const onProtectedUiResetRef = useLatestRef(onProtectedUiReset);

  const isPrototypeMode = securityMode === "prototype";
  const isJwtMode = securityMode === "jwt";
  const isAuthenticated = isPrototypeMode || (isJwtMode && authUser != null && authAccessToken != null);

  useEffect(() => {
    if (!isJwtMode) {
      configureApiAuth(null);
      return;
    }

    configureApiAuth({
      getAccessToken: () => authAccessToken,
      refreshAccessToken: async () => {
        const response = await apiPost<AuthTokenResponse>("/api/v1/auth/refresh");
        setAuthAccessToken(response.data.accessToken);
        setAuthUser(response.data.user);
        return response.data.accessToken;
      },
      onUnauthorized: () => {
        setAuthAccessToken(null);
        setAuthUser(null);
        setAuthStatusMessage("세션이 만료되어 다시 로그인해야 합니다.");
        onProtectedUiResetRef.current();
      }
    });

    return () => configureApiAuth(null);
  }, [authAccessToken, isJwtMode, onProtectedUiResetRef]);

  useEffect(() => {
    let cancelled = false;

    async function bootstrapAuthMode() {
      setAuthBootstrapping(true);
      setAuthError(null);
      try {
        const health = await apiGet<HealthPayload>("/api/v1/health");
        if (cancelled) {
          return;
        }
        const mode = health.data.securityMode === "jwt" ? "jwt" : "prototype";
        setSecurityMode(mode);
        setPrototypeNoAuth(Boolean(health.data.prototypeNoAuth));

        if (mode === "prototype") {
          setAuthAccessToken(null);
          setAuthUser(null);
          setAuthStatusMessage(null);
          return;
        }

        try {
          const refreshResponse = await apiPost<AuthTokenResponse>("/api/v1/auth/refresh");
          if (cancelled) {
            return;
          }
          setAuthAccessToken(refreshResponse.data.accessToken);
          setAuthUser(refreshResponse.data.user);
          setAuthStatusMessage("기존 세션을 복구했습니다.");
        } catch (refreshError) {
          if (cancelled) {
            return;
          }
          setAuthAccessToken(null);
          setAuthUser(null);
          if (!(refreshError instanceof ApiClientError && refreshError.status === 401)) {
            setAuthError(formatErrorRef.current(refreshError));
          }
        }
      } catch (error) {
        if (cancelled) {
          return;
        }
        setSecurityMode("unknown");
        setAuthError(formatErrorRef.current(error));
      } finally {
        if (!cancelled) {
          setAuthBootstrapping(false);
        }
      }
    }

    void bootstrapAuthMode();
    return () => {
      cancelled = true;
    };
  }, [formatErrorRef]);

  async function login(loginId: string, password: string) {
    setLoginSubmitting(true);
    setAuthError(null);
    setAuthStatusMessage(null);
    try {
      const response = await apiPost<AuthTokenResponse>("/api/v1/auth/login", {
        loginId,
        password
      });
      setAuthAccessToken(response.data.accessToken);
      setAuthUser(response.data.user);
      setAuthStatusMessage(response.message);
    } catch (error) {
      setAuthError(formatErrorRef.current(error));
    } finally {
      setLoginSubmitting(false);
    }
  }

  async function logout() {
    setAuthError(null);
    try {
      await apiPost<void>("/api/v1/auth/logout");
    } catch {
      // Logout is best-effort; clear local session even if request fails.
    } finally {
      setAuthAccessToken(null);
      setAuthUser(null);
      setAuthStatusMessage("로그아웃되었습니다.");
      onProtectedUiResetRef.current();
    }
  }

  return {
    securityMode,
    prototypeNoAuth,
    authBootstrapping,
    authAccessToken,
    authUser,
    authStatusMessage,
    authError,
    loginSubmitting,
    isPrototypeMode,
    isJwtMode,
    isAuthenticated,
    login,
    logout
  } as const;
}
