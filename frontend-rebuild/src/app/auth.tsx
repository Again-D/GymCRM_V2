import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";

export type SecurityMode = "prototype" | "jwt";

export type PrototypeAuthUser = {
  userId: number;
  username: string;
  role: string;
};

export type AuthState = {
  securityMode: SecurityMode;
  authBootstrapping: boolean;
  authUser: PrototypeAuthUser | null;
};

type RuntimeAuthPreset = "prototype-admin" | "jwt-anon" | "jwt-admin" | "jwt-trainer";

type AuthStateContextValue = AuthState & {
  setRuntimeAuthPreset: (preset: RuntimeAuthPreset) => void;
  clearRuntimeSession: () => void;
};

const STORAGE_KEY = "gymcrm-rebuild-auth-state";
let memoryPreset: RuntimeAuthPreset | null = null;

const prototypeAdminUser: PrototypeAuthUser = {
  userId: 1,
  username: "prototype-admin",
  role: "ROLE_CENTER_ADMIN"
};

const jwtAdminUser: PrototypeAuthUser = {
  userId: 11,
  username: "jwt-admin",
  role: "ROLE_CENTER_ADMIN"
};

const jwtTrainerUser: PrototypeAuthUser = {
  userId: 41,
  username: "jwt-trainer-a",
  role: "ROLE_TRAINER"
};

const defaultAuthState: AuthState = {
  securityMode: "prototype",
  authBootstrapping: false,
  authUser: prototypeAdminUser
};

const defaultContextValue: AuthStateContextValue = {
  ...defaultAuthState,
  setRuntimeAuthPreset: () => undefined,
  clearRuntimeSession: () => undefined
};

const AuthStateContext = createContext<AuthStateContextValue>(defaultContextValue);

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

export function resetRuntimeAuthStorageForTests() {
  memoryPreset = null;
}

export function AuthStateProvider({
  children,
  value
}: PropsWithChildren<{ value?: Partial<AuthState> }>) {
  const hasRuntimeOverride = value != null;
  const [runtimeState, setRuntimeState] = useState<AuthState>(() =>
    hasRuntimeOverride
      ? {
          ...defaultAuthState,
          ...value
        }
      : {
          securityMode: "prototype",
          authBootstrapping: true,
          authUser: null
        }
  );

  useEffect(() => {
    if (hasRuntimeOverride) {
      return;
    }

    const preset = resolveRuntimePreset();
    setRuntimeState({
      ...stateFromPreset(preset),
      authBootstrapping: false
    });
  }, [hasRuntimeOverride]);

  useEffect(() => {
    if (hasRuntimeOverride || runtimeState.authBootstrapping || typeof window === "undefined") {
      return;
    }

    writeStoredPreset(presetFromState(runtimeState));
  }, [hasRuntimeOverride, runtimeState]);

  const contextValue = useMemo<AuthStateContextValue>(
    () => ({
      ...runtimeState,
      setRuntimeAuthPreset: (preset) => {
        if (hasRuntimeOverride) {
          return;
        }
        setRuntimeState(stateFromPreset(preset));
      },
      clearRuntimeSession: () => {
        if (hasRuntimeOverride) {
          return;
        }
        setRuntimeState(stateFromPreset("jwt-anon"));
      }
    }),
    [hasRuntimeOverride, runtimeState]
  );

  return <AuthStateContext.Provider value={contextValue}>{children}</AuthStateContext.Provider>;
}

export function useAuthState() {
  return useContext(AuthStateContext);
}
