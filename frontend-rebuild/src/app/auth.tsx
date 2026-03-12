import { createContext, type PropsWithChildren, useContext, useMemo } from "react";

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

const defaultAuthState: AuthState = {
  securityMode: "prototype",
  authBootstrapping: false,
  authUser: {
    userId: 1,
    username: "prototype-admin",
    role: "ROLE_CENTER_ADMIN"
  }
};

const AuthStateContext = createContext<AuthState>(defaultAuthState);

export function AuthStateProvider({
  children,
  value
}: PropsWithChildren<{ value?: Partial<AuthState> }>) {
  const mergedValue = useMemo<AuthState>(
    () => ({
      ...defaultAuthState,
      ...value
    }),
    [value]
  );

  return <AuthStateContext.Provider value={mergedValue}>{children}</AuthStateContext.Provider>;
}

export function useAuthState() {
  return useContext(AuthStateContext);
}
