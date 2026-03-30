import { ApiClientError } from "../api/client";

export function toUserFacingErrorMessage(error: unknown, fallbackMessage: string) {
  if (error instanceof ApiClientError) {
    return fallbackMessage;
  }

  if (error instanceof Error) {
    return fallbackMessage;
  }

  return fallbackMessage;
}
