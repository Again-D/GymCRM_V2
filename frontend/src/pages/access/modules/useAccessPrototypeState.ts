import { useState } from "react";

import { apiPost, isMockApiMode } from "../../../api/client";
import { invalidateQueryDomains } from "../../../api/queryInvalidation";
import type { AccessEventRow } from "./types";

export function useAccessPrototypeState() {
  const [accessActionSubmitting, setAccessActionSubmitting] = useState(false);
  const [accessPanelMessage, setAccessPanelMessage] = useState<string | null>(null);
  const [accessPanelError, setAccessPanelError] = useState<string | null>(null);
  const useMockMutations = isMockApiMode();

  function clearAccessFeedback() {
    setAccessPanelMessage(null);
    setAccessPanelError(null);
  }

  async function handleAccessEntry(memberId: number) {
    clearAccessFeedback();
    setAccessActionSubmitting(true);
    try {
      if (!useMockMutations) {
        await apiPost<AccessEventRow>("/api/v1/access/entry", {
          memberId,
          membershipId: null,
          reservationId: null
        });
        invalidateQueryDomains(["accessPresence", "accessEvents"]);
        setAccessPanelMessage("입장 처리되었습니다.");
        return true;
      }

      const { createMockAccessEntry } = await import("../../../api/mockData");
      const result = createMockAccessEntry(memberId);
      invalidateQueryDomains(["accessPresence", "accessEvents"]);
      if (!result.ok) {
        setAccessPanelError(result.message);
        return false;
      }
      setAccessPanelMessage(result.message);
      return true;
    } finally {
      setAccessActionSubmitting(false);
    }
  }

  async function handleAccessExit(memberId: number) {
    clearAccessFeedback();
    setAccessActionSubmitting(true);
    try {
      if (!useMockMutations) {
        await apiPost<AccessEventRow>("/api/v1/access/exit", {
          memberId
        });
        invalidateQueryDomains(["accessPresence", "accessEvents"]);
        setAccessPanelMessage("퇴장 처리되었습니다.");
        return true;
      }

      const { createMockAccessExit } = await import("../../../api/mockData");
      const result = createMockAccessExit(memberId);
      invalidateQueryDomains(["accessPresence", "accessEvents"]);
      if (!result.ok) {
        setAccessPanelError(result.message);
        return false;
      }
      setAccessPanelMessage(result.message);
      return true;
    } finally {
      setAccessActionSubmitting(false);
    }
  }

  return {
    accessActionSubmitting,
    accessPanelMessage,
    accessPanelError,
    clearAccessFeedback,
    handleAccessEntry,
    handleAccessExit
  } as const;
}
