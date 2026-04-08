import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { useStore } from "zustand";

import { ApiClientError, apiGet, apiPost, configureApiAuth, isMockApiMode } from "../api/client";
import {
  createAuthStore,
  initialAuthStoreState,
  type AuthStoreApi,
  type AuthStoreState
} from "./authStore";

export type SecurityMode = "prototype" | "jwt";

export type PrototypeAuthUser = {
  userId: number;
  centerId?: number;
  username: string;
  primaryRole: string;
  roles: string[];
  email?: string;
};

export type AuthState = {
  securityMode: SecurityMode;
  authBootstrapping: boolean;
  authUser: PrototypeAuthUser | null;
};

type AuthStateOverride = Readonly<{
  securityMode?: SecurityMode;
  authBootstrapping?: boolean;
  authUser?: PrototypeAuthUser | null;
}>;

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
    centerId: number;
    loginId: string;
    userName: string;
    primaryRole?: string;
    roles?: string[];
    roleCode?: string;
  };
};

export type AuthStateContextValue = AuthState & {
  isMockMode: boolean;
  authError: string | null;
  authStatusMessage: string | null;
  loginSubmitting: boolean;
  setRuntimeAuthPreset: (preset: RuntimeAuthPreset) => void;
  clearRuntimeSession: () => void;
  login: (loginId: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

type AuthActions = Pick<
  AuthStateContextValue,
  "setRuntimeAuthPreset" | "clearRuntimeSession" | "login" | "logout"
>;

const STORAGE_KEY = "gymcrm-rebuild-auth-state";
let memoryPreset: RuntimeAuthPreset | null = null;

const prototypeAdminUser: PrototypeAuthUser = {
  userId: 1,
  centerId: 1,
  username: "prototype-admin",
  primaryRole: "ROLE_CENTER_ADMIN",
  roles: ["ROLE_CENTER_ADMIN"],
  email: "admin@gymcrm.ops"
};

const jwtAdminUser: PrototypeAuthUser = {
  userId: 11,
  centerId: 1,
  username: "jwt-admin",
  primaryRole: "ROLE_CENTER_ADMIN",
  roles: ["ROLE_CENTER_ADMIN"],
  email: "ops-lead@gymcrm.ops"
};

const jwtTrainerUser: PrototypeAuthUser = {
  userId: 41,
  centerId: 1,
  username: "jwt-trainer-a",
  primaryRole: "ROLE_TRAINER",
  roles: ["ROLE_TRAINER"],
  email: "trainer-alpha@gymcrm.ops"
};

const defaultAuthState: AuthState = {
  securityMode: "prototype",
  authBootstrapping: false,
  authUser: prototypeAdminUser
};

const defaultActions: AuthActions = {
  setRuntimeAuthPreset: () => undefined,
  clearRuntimeSession: () => undefined,
  login: async () => undefined,
  logout: async () => undefined
};

const AuthStoreContext = createContext<AuthStoreApi | null>(null);
const AuthActionsContext = createContext<AuthActions>(defaultActions);

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
  return state.authUser.primaryRole === "ROLE_TRAINER" ? "jwt-trainer" : "jwt-admin";
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

function normalizeRoleSet(user: AuthTokenResponse["user"]) {
  const primaryRole = user.primaryRole ?? user.roleCode ?? null;
  const roles = Array.isArray(user.roles) && user.roles.length > 0
    ? Array.from(new Set(user.roles))
    : primaryRole
      ? [primaryRole]
      : [];
  return {
    primaryRole: primaryRole ?? roles[0] ?? "",
    roles
  };
}

function normalizeLiveUser(user: AuthTokenResponse["user"] | null): PrototypeAuthUser | null {
  if (!user) {
    return null;
  }
  const normalizedRoles = normalizeRoleSet(user);
  return {
    userId: user.userId,
    centerId: user.centerId,
    username: user.userName || user.loginId,
    primaryRole: normalizedRoles.primaryRole,
    roles: normalizedRoles.roles
  };
}

function toAuthMessage(error: unknown, fallbackMessage: string) {
  return error instanceof Error ? error.message : fallbackMessage;
}

function createInitialAuthStoreState({
  isMockMode,
  value
}: {
  isMockMode: boolean;
  value?: AuthStateOverride;
}): AuthStoreState {
  const runtimeState = value != null
    ? {
        ...defaultAuthState,
        ...value
      }
    : isMockMode
      ? {
          securityMode: "prototype" as const,
          authBootstrapping: true,
          authUser: null
        }
      : {
          securityMode: "jwt" as const,
          authBootstrapping: true,
          authUser: null
        };

  return {
    ...initialAuthStoreState,
    ...runtimeState,
    isMockMode
  };
}

export function resetRuntimeAuthStorageForTests() {
  memoryPreset = null;
}

export function AuthStateProvider({
  children,
  value
}: PropsWithChildren<{ value?: AuthStateOverride }>) {
  const isMockMode = isMockApiMode();
  const hasRuntimeOverride = value != null;
  const storeRef = useRef<AuthStoreApi | null>(null);

  if (!storeRef.current) {
    storeRef.current = createAuthStore(createInitialAuthStoreState({ isMockMode, value }));
  }

  const store = storeRef.current;
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const updateRuntimeStateRef = useLatestRef(store.getState().updateRuntimeState);

  useEffect(() => {
    store.getState().hydrate(createInitialAuthStoreState({ isMockMode, value }));
  }, [isMockMode, store, value]);

  function clearJwtSession(statusMessage: string | null) {
    setAccessToken(null);
    store.getState().setAuthError(null);
    updateRuntimeStateRef.current((current) => ({
      ...current,
      securityMode: "jwt",
      authUser: null
    }));
    store.getState().setAuthStatusMessage(statusMessage);
  }

  useEffect(() => {
    if (hasRuntimeOverride || isMockMode) {
      configureApiAuth(null);
      return;
    }

    configureApiAuth({
      getAccessToken: () => accessToken,
      refreshAccessToken: async () => {
        const response = await apiPost<AuthTokenResponse>("/api/v1/auth/refresh");
        setAccessToken(response.data.accessToken);
        updateRuntimeStateRef.current((current) => ({
          ...current,
          securityMode: "jwt",
          authUser: normalizeLiveUser(response.data.user)
        }));
        return response.data.accessToken;
      },
      onUnauthorized: () => {
        clearJwtSession("세션이 만료되어 다시 로그인해야 합니다.");
      }
    });

    return () => configureApiAuth(null);
  }, [accessToken, hasRuntimeOverride, isMockMode, updateRuntimeStateRef]);

  useEffect(() => {
    if (hasRuntimeOverride || !isMockMode) {
      return;
    }

    const preset = resolveRuntimePreset();
    store.getState().setRuntimeState({
      ...stateFromPreset(preset),
      authBootstrapping: false
    });
  }, [hasRuntimeOverride, isMockMode, store]);

  useEffect(() => {
    if (hasRuntimeOverride || isMockMode) {
      return;
    }

    let cancelled = false;

    async function bootstrapLiveAuth() {
      store.getState().updateRuntimeState((current) => ({
        ...current,
        authBootstrapping: true
      }));
      store.getState().setAuthError(null);

      try {
        const health = await apiGet<HealthPayload>("/api/v1/health");
        if (cancelled) {
          return;
        }

        const securityMode = health.data.securityMode === "prototype" ? "prototype" : "jwt";
        store.getState().updateRuntimeState((current) => ({
          ...current,
          securityMode,
          authUser: securityMode === "prototype" && health.data.prototypeNoAuth ? prototypeAdminUser : null
        }));

        if (securityMode === "prototype" && health.data.prototypeNoAuth) {
          store.getState().setAuthStatusMessage(null);
          setAccessToken(null);
          return;
        }

        try {
          const response = await apiPost<AuthTokenResponse>("/api/v1/auth/refresh");
          if (cancelled) {
            return;
          }
          setAccessToken(response.data.accessToken);
          store.getState().updateRuntimeState((current) => ({
            ...current,
            securityMode: "jwt",
            authUser: normalizeLiveUser(response.data.user)
          }));
          store.getState().setAuthStatusMessage("기존 세션을 복구했습니다.");
        } catch (error) {
          if (cancelled) {
            return;
          }
          clearJwtSession(null);
          if (!(error instanceof ApiClientError && error.status === 401)) {
            store.getState().setAuthError(toAuthMessage(error, "인증 상태를 확인하지 못했습니다."));
          }
        }
      } catch (error) {
        if (cancelled) {
          return;
        }
        store.getState().setAuthError(toAuthMessage(error, "인증 상태를 확인하지 못했습니다."));
      } finally {
        if (!cancelled) {
          store.getState().updateRuntimeState((current) => ({
            ...current,
            authBootstrapping: false
          }));
        }
      }
    }

    void bootstrapLiveAuth();
    return () => {
      cancelled = true;
    };
  }, [hasRuntimeOverride, isMockMode, store]);

  const securityMode = useStore(store, (state) => state.securityMode);
  const authBootstrapping = useStore(store, (state) => state.authBootstrapping);
  const authUser = useStore(store, (state) => state.authUser);

  useEffect(() => {
    if (hasRuntimeOverride || !isMockMode || authBootstrapping || typeof window === "undefined") {
      return;
    }

    writeStoredPreset(presetFromState({ securityMode, authBootstrapping, authUser }));
  }, [authBootstrapping, authUser, hasRuntimeOverride, isMockMode, securityMode]);

  const actions = useMemo<AuthActions>(() => {
    async function login(loginId: string, password: string) {
      if (hasRuntimeOverride || isMockMode) {
        return;
      }

      store.getState().setLoginSubmitting(true);
      store.getState().setAuthError(null);
      store.getState().setAuthStatusMessage(null);
      try {
        const response = await apiPost<AuthTokenResponse>("/api/v1/auth/login", { loginId, password });
        setAccessToken(response.data.accessToken);
        store.getState().updateRuntimeState((current) => ({
          ...current,
          securityMode: "jwt",
          authUser: normalizeLiveUser(response.data.user)
        }));
        store.getState().setAuthStatusMessage(response.message);
      } catch (error) {
        store.getState().setAuthError(toAuthMessage(error, "로그인에 실패했습니다."));
      } finally {
        store.getState().setLoginSubmitting(false);
      }
    }

    async function logout() {
      if (hasRuntimeOverride) {
        return;
      }

      if (isMockMode) {
        store.getState().setRuntimeState(stateFromPreset("jwt-anon"));
        return;
      }

      store.getState().setAuthError(null);
      try {
        await apiPost<void>("/api/v1/auth/logout");
      } catch {
        // best effort
      } finally {
        clearJwtSession("로그아웃되었습니다.");
      }
    }

    return {
      setRuntimeAuthPreset: (preset) => {
        if (hasRuntimeOverride || !isMockMode) {
          return;
        }
        store.getState().setRuntimeState(stateFromPreset(preset));
      },
      clearRuntimeSession: () => {
        if (hasRuntimeOverride) {
          return;
        }
        if (isMockMode) {
          store.getState().setRuntimeState(stateFromPreset("jwt-anon"));
          return;
        }
        void logout();
      },
      login,
      logout
    };
  }, [hasRuntimeOverride, isMockMode, store]);

  return (
    <AuthStoreContext.Provider value={store}>
      <AuthActionsContext.Provider value={actions}>{children}</AuthActionsContext.Provider>
    </AuthStoreContext.Provider>
  );
}

export function useAuthState() {
  const store = useContext(AuthStoreContext);
  const actions = useContext(AuthActionsContext);
  if (!store) {
    return {
      ...defaultAuthState,
      isMockMode: isMockApiMode(),
      authError: null,
      authStatusMessage: null,
      loginSubmitting: false,
      ...actions
    } satisfies AuthStateContextValue;
  }

  const securityMode = useStore(store, (state) => state.securityMode);
  const authBootstrapping = useStore(store, (state) => state.authBootstrapping);
  const authUser = useStore(store, (state) => state.authUser);
  const isMockMode = useStore(store, (state) => state.isMockMode);
  const authError = useStore(store, (state) => state.authError);
  const authStatusMessage = useStore(store, (state) => state.authStatusMessage);
  const loginSubmitting = useStore(store, (state) => state.loginSubmitting);

  return {
    securityMode,
    authBootstrapping,
    authUser,
    isMockMode,
    authError,
    authStatusMessage,
    loginSubmitting,
    ...actions
  } satisfies AuthStateContextValue;
}
