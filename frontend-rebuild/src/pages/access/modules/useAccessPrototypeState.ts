import { useState } from "react";

import { createMockAccessEntry, createMockAccessExit } from "../../../api/mockData";
import { invalidateQueryDomains } from "../../../api/queryInvalidation";

export function useAccessPrototypeState() {
  const [accessActionSubmitting, setAccessActionSubmitting] = useState(false);
  const [accessPanelMessage, setAccessPanelMessage] = useState<string | null>(null);
  const [accessPanelError, setAccessPanelError] = useState<string | null>(null);

  function clearAccessFeedback() {
    setAccessPanelMessage(null);
    setAccessPanelError(null);
  }

  async function handleAccessEntry(memberId: number) {
    clearAccessFeedback();
    setAccessActionSubmitting(true);
    try {
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
