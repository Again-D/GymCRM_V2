import { ApiClientError } from "../api/client";

export function toUserFacingErrorMessage(error: unknown, fallbackMessage: string) {
  if (error instanceof ApiClientError) {
    if (error.status === 401 || error.status === 403) {
      return "접근 권한이 없거나 로그인이 만료되었습니다.";
    }

    if (error.status >= 500) {
      return "서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
    }

    if (error.status === 404) {
      return "요청한 데이터를 찾을 수 없습니다.";
    }

    // Do NOT expose traceId or detail to UI, but allow specific business codes if needed later.
    return fallbackMessage;
  }

  if (error instanceof Error) {
    return fallbackMessage; // Standard errors only get the fallback
  }

  return fallbackMessage;
}
