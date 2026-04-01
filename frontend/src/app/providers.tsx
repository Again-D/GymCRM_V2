import { QueryClientProvider } from "@tanstack/react-query";
import { App as AntdApp, ConfigProvider } from "antd";
import { type PropsWithChildren, useMemo } from "react";
import { BrowserRouter } from "react-router-dom";

import { type AuthState, AuthStateProvider } from "./auth";
import { buildAntdTheme } from "./antdTheme";
import { FeedbackProvider } from "./feedback";
import { appQueryClient } from "./queryClient";
import { ThemeProvider, useThemeStore } from "./theme";

function FoundationBridge({ children }: PropsWithChildren) {
  const { resolvedTheme } = useThemeStore();
  const antdTheme = useMemo(() => buildAntdTheme(resolvedTheme), [resolvedTheme]);

  return (
    <QueryClientProvider client={appQueryClient}>
      <ConfigProvider theme={antdTheme}>
        <AntdApp>
          <FeedbackProvider>{children}</FeedbackProvider>
        </AntdApp>
      </ConfigProvider>
    </QueryClientProvider>
  );
}

export function FoundationProviders({
  children,
  authValue
}: PropsWithChildren<{ authValue?: Partial<AuthState> }>) {
  return (
    <ThemeProvider>
      <AuthStateProvider value={authValue}>
        <FoundationBridge>{children}</FoundationBridge>
      </AuthStateProvider>
    </ThemeProvider>
  );
}

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <FoundationProviders>
      <BrowserRouter>{children}</BrowserRouter>
    </FoundationProviders>
  );
}
