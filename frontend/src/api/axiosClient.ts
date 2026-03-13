export type ApiClientConfig = {
  baseUrl?: string;
};

export function createApiClient(config: ApiClientConfig = {}) {
  return {
    baseUrl: config.baseUrl ?? "/api"
  };
}
