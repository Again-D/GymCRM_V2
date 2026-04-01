import { toUserFacingErrorMessage } from "../../../app/uiError";

export function getReservationPanelErrorMessage(
  error: unknown,
  fallbackMessage: string,
) {
  return toUserFacingErrorMessage(error, fallbackMessage);
}
