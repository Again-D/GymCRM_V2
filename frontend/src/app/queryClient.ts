import { QueryClient } from "@tanstack/react-query";

import { ApiClientError } from "../api/client";

function shouldRetryRequest(failureCount: number, error: unknown) {
  if (error instanceof ApiClientError && (error.status === 401 || error.status === 403)) {
    return false;
  }

  return failureCount < 1;
}

export const appQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: shouldRetryRequest,
      refetchOnWindowFocus: false,
      staleTime: 30_000
    },
    mutations: {
      retry: shouldRetryRequest
    }
  }
});
