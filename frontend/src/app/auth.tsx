import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";

import { ApiClientError, apiGet, apiPost, configureApiAuth, isMockApiMode } from "../api/client";

export type SecurityMode = "prototype" | "jwt";

export type PrototypeAuthUser = {
  userId: number;
  username: string;
  role: string;
  email?: string;
};

export type AuthState = {
  securityMode: SecurityMode;
  authBootstrapping: boolean;
  authUser: PrototypeAuthUser | null;
};

export type RuntimeAuthPreset = "prototype-admin" | "jwt-anon" | "jwt-admin" | "jwt-trainer";

type HealthPayload = {
  status: string;
  securityMode: string;
  prototypeNoAuth: boolean;
};

type AuthTokenResponse = {
  accessToken: string;
  user: {
    userId: number;
    loginId: string;
    displayName: string;
    roleCode: string;
  };
};

type AuthStateContextValue = AuthState & {
  isMockMode: boolean;
  authError: string | null;
  authStatusMessage: string | null;
  loginSubmitting: boolean;
  setRuntimeAuthPreset: (preset: RuntimeAuthPreset) => void;
  clearRuntimeSession: () => void;
  login: (loginId: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const STORAGE_KEY = "gymcrm-rebuild-auth-state";
let memoryPreset: RuntimeAuthPreset | null = null;

const prototypeAdminUser: PrototypeAuthUser = {
  userId: 1,
  username: "prototype-admin",
  role: "ROLE_CENTER_ADMIN",
  email: "admin@gymcrm.ops"
};

const jwtAdminUser: PrototypeAuthUser = {
  userId: 11,
  username: "jwt-admin",
  role: "ROLE_CENTER_ADMIN",
  email: "ops-lead@gymcrm.ops"
};

const jwtTrainerUser: PrototypeAuthUser = {
  userId: 41,
  username: "jwt-trainer-a",
  role: "ROLE_TRAINER",
  email: "trainer-alpha@gymcrm.ops"
};

const defaultAuthState: AuthState = {
  securityMode: "prototype",
  authBootstrapping: false,
  authUser: prototypeAdminUser
};

const defaultContextValue: AuthStateContextValue = {
  ...defaultAuthState,
  isMockMode: true,
  authError: null,
  authStatusMessage: null,
  loginSubmitting: false,
  setRuntimeAuthPreset: () => undefined,
  clearRuntimeSession: () => undefined,
  login: async () => undefined,
  logout: async () => undefined
};

const AuthStateContext = createContext<AuthStateContextValue>(defaultContextValue);

function useLatestRef<T>(value: T) {
  const ref = useRef(value);
  ref.current = value;
  return ref;
}

function stateFromPreset(preset: RuntimeAuthPreset): AuthState {
  switch (preset) {
    case "prototype-admin":
      return {
        securityMode: "prototype",
        authBootstrapping: false,
        authUser: prototypeAdminUser
      };
    case "jwt-anon":
      return {
        securityMode: "jwt",
        authBootstrapping: false,
        authUser: null
      };
    case "jwt-admin":
      return {
        securityMode: "jwt",
        authBootstrapping: false,
        authUser: jwtAdminUser
      };
    case "jwt-trainer":
      return {
        securityMode: "jwt",
        authBootstrapping: false,
        authUser: jwtTrainerUser
      };
  }
}

function presetFromState(state: AuthState): RuntimeAuthPreset {
  if (state.securityMode === "prototype") {
    return "prototype-admin";
  }
  if (!state.authUser) {
    return "jwt-anon";
  }
  return state.authUser.role === "ROLE_TRAINER" ? "jwt-trainer" : "jwt-admin";
}

function resolveRuntimePreset(): RuntimeAuthPreset {
  if (typeof window !== "undefined") {
    const params = new URLSearchParams(window.location.search);
    const authMode = params.get("authMode");
    const authSession = params.get("authSession");

    if (authMode === "prototype") {
      return "prototype-admin";
    }
    if (authMode === "jwt") {
      if (authSession === "admin") {
        return "jwt-admin";
      }
      if (authSession === "trainer") {
        return "jwt-trainer";
      }
      return "jwt-anon";
    }

    const storedPreset = readStoredPreset();
    if (
      storedPreset === "prototype-admin" ||
      storedPreset === "jwt-anon" ||
      storedPreset === "jwt-admin" ||
      storedPreset === "jwt-trainer"
    ) {
      return storedPreset;
    }
  }

  return "prototype-admin";
}

function readStoredPreset() {
  if (typeof window !== "undefined") {
    const storage = window.localStorage as { getItem?: (key: string) => string | null } | undefined;
    if (storage && typeof storage.getItem === "function") {
      return storage.getItem(STORAGE_KEY);
    }
  }
  return memoryPreset;
}

function writeStoredPreset(preset: RuntimeAuthPreset) {
  memoryPreset = preset;
  if (typeof window !== "undefined") {
    const storage = window.localStorage as { setItem?: (key: string, value: string) => void } | undefined;
    if (storage && typeof storage.setItem === "function") {
      storage.setItem(STORAGE_KEY, preset);
    }
  }
}

function normalizeLiveUser(user: AuthTokenResponse["user"] | null): PrototypeAuthUser | null {
  if (!user) {
    return null;
  }
  return {
    userId: user.userId,
    username: user.displayName || user.loginId,
    role: user.roleCode
  };
}

export function resetRuntimeAuthStorageForTests() {
  memoryPreset = null;
}

export function AuthStateProvider({
  children,
  value
}: PropsWithChildren<{ value?: Partial<AuthState> }>) {
  const isMockMode = isMockApiMode();
  const hasRuntimeOverride = value != null;
  const [runtimeState, setRuntimeState] = useState<AuthState>(() =>
    hasRuntimeOverride
      ? {
          ...defaultAuthState,
          ...value
        }
      : isMockMode
        ? {
            securityMode: "prototype",
            authBootstrapping: true,
            authUser: null
          }
        : {
            securityMode: "jwt",
            authBootstrapping: true,
            authUser: null
          }
  );
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authStatusMessage, setAuthStatusMessage] = useState<string | null>(null);
  const [loginSubmitting, setLoginSubmitting] = useState(false);
  const setRuntimeStateRef = useLatestRef(setRuntimeState);

  useEffect(() => {
    if (hasRuntimeOverride) {
      configureApiAuth(null);
      return;
    }

    if (isMockMode) {
      configureApiAuth(null);
      return;
    }

    configureApiAuth({
      getAccessToken: () => accessToken,
      refreshAccessToken: async () => {
        const response = await apiPost<AuthTokenResponse>("/api/v1/auth/refresh");
        setAccessToken(response.data.accessToken);
        setRuntimeStateRef.current((current) => ({
          ...current,
          securityMode: "jwt",
          authUser: normalizeLiveUser(response.data.user)
        }));
        return response.data.accessToken;
      },
      onUnauthorized: () => {
        setAccessToken(null);
        setAuthStatusMessage("세션이 만료되어 다시 로그인해야 합니다.");
        setRuntimeStateRef.current((current) => ({
          ...current,
          securityMode: "jwt",
          authUser: null
        }));
      }
    });

    return () => configureApiAuth(null);
  }, [accessToken, hasRuntimeOverride, isMockMode, setRuntimeStateRef]);

  useEffect(() => {
    if (hasRuntimeOverride) {
      return;
    }

    if (!isMockMode) {
      return;
    }

    const preset = resolveRuntimePreset();
    setRuntimeState({
      ...stateFromPreset(preset),
      authBootstrapping: false
    });
  }, [hasRuntimeOverride, isMockMode]);

  useEffect(() => {
    if (hasRuntimeOverride) {
      return;
    }

    if (isMockMode) {
      return;
    }

    let cancelled = false;

    async function bootstrapLiveAuth() {
      setRuntimeState((current) => ({ ...current, authBootstrapping: true }));
      setAuthError(null);

      try {
        const health = await apiGet<HealthPayload>("/api/v1/health");
        if (cancelled) {
          return;
        }

        const securityMode = health.data.securityMode === "prototype" ? "prototype" : "jwt";
        setRuntimeState((current) => ({
          ...current,
          securityMode,
          authUser: securityMode === "prototype" && health.data.prototypeNoAuth ? prototypeAdminUser : null
        }));

        if (securityMode === "prototype" && health.data.prototypeNoAuth) {
          setAuthStatusMessage(null);
          setAccessToken(null);
          return;
        }

        try {
          const response = await apiPost<AuthTokenResponse>("/api/v1/auth/refresh");
          if (cancelled) {
            return;
          }
          setAccessToken(response.data.accessToken);
          setRuntimeState((current) => ({
            ...current,
            securityMode: "jwt",
            authUser: normalizeLiveUser(response.data.user)
          }));
          setAuthStatusMessage("기존 세션을 복구했습니다.");
        } catch (error) {
          if (cancelled) {
            return;
          }
          setAccessToken(null);
          setRuntimeState((current) => ({
            ...current,
            securityMode: "jwt",
            authUser: null
          }));
          if (!(error instanceof ApiClientError && error.status === 401)) {
            setAuthError(error instanceof Error ? error.message : "인증 상태를 확인하지 못했습니다.");
          }
        }
      } catch (error) {
        if (cancelled) {
          return;
        }
        setAuthError(error instanceof Error ? error.message : "인증 상태를 확인하지 못했습니다.");
      } finally {
        if (!cancelled) {
          setRuntimeState((current) => ({ ...current, authBootstrapping: false }));
        }
      }
    }

    void bootstrapLiveAuth();
    return () => {
      cancelled = true;
    };
  }, [hasRuntimeOverride, isMockMode]);

  useEffect(() => {
    if (!hasRuntimeOverride) {
      return;
    }

    configureApiAuth(null);
    setRuntimeState({
      ...defaultAuthState,
      ...value
    });
  }, [hasRuntimeOverride, value]);

  useEffect(() => {
    if (hasRuntimeOverride || !isMockMode || runtimeState.authBootstrapping || typeof window === "undefined") {
      return;
    }

    writeStoredPreset(presetFromState(runtimeState));
  }, [hasRuntimeOverride, isMockMode, runtimeState]);

  async function login(loginId: string, password: string) {
    if (hasRuntimeOverride || isMockMode) {
      return;
    }

    setLoginSubmitting(true);
    setAuthError(null);
    setAuthStatusMessage(null);
    try {
      const response = await apiPost<AuthTokenResponse>("/api/v1/auth/login", { loginId, password });
      setAccessToken(response.data.accessToken);
      setRuntimeState((current) => ({
        ...current,
        securityMode: "jwt",
        authUser: normalizeLiveUser(response.data.user)
      }));
      setAuthStatusMessage(response.message);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "로그인에 실패했습니다.");
    } finally {
      setLoginSubmitting(false);
    }
  }

  async function logout() {
    if (hasRuntimeOverride) {
      return;
    }

    if (isMockMode) {
      setRuntimeState(stateFromPreset("jwt-anon"));
      return;
    }

    setAuthError(null);
    try {
      await apiPost<void>("/api/v1/auth/logout");
    } catch {
      // best effort
    } finally {
      setAccessToken(null);
      setRuntimeState((current) => ({
        ...current,
        securityMode: "jwt",
        authUser: null
      }));
      setAuthStatusMessage("로그아웃되었습니다.");
    }
  }

  const contextValue = useMemo<AuthStateContextValue>(
    () => ({
      ...runtimeState,
      isMockMode,
      authError,
      authStatusMessage,
      loginSubmitting,
      setRuntimeAuthPreset: (preset) => {
        if (hasRuntimeOverride || !isMockMode) {
          return;
        }
        setRuntimeState(stateFromPreset(preset));
      },
      clearRuntimeSession: () => {
        if (hasRuntimeOverride) {
          return;
        }
        if (isMockMode) {
          setRuntimeState(stateFromPreset("jwt-anon"));
          return;
        }
        void logout();
      },
      login,
      logout
    }),
    [authError, authStatusMessage, hasRuntimeOverride, isMockMode, loginSubmitting, runtimeState]
  );

  return <AuthStateContext.Provider value={contextValue}>{children}</AuthStateContext.Provider>;
}

export function useAuthState() {
  return useContext(AuthStateContext);
}
