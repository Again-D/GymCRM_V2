import { ApiClientError } from "../../../api/client";

export function getReservationPanelErrorMessage(
  error: unknown,
  fallbackMessage: string,
) {
  if (error instanceof ApiClientError && error.detail) {
    return error.detail;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallbackMessage;
}
