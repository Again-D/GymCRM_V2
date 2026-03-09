import { useRef, useState } from "react";
import { apiGet } from "../../shared/api/client";
import type { AccessEventRecord, AccessPresenceSummary } from "./useAccessWorkspaceState";

type CommitGuard = () => boolean;

type UseAccessQueriesOptions = {
  formatError: (error: unknown) => string;
};

function useLatestRef<T>(value: T) {
  const ref = useRef(value);
  ref.current = value;
  return ref;
}

function canCommitState(shouldCommit?: CommitGuard) {
  return shouldCommit?.() ?? true;
}

export function useAccessQueries({ formatError }: UseAccessQueriesOptions) {
  const [accessEvents, setAccessEvents] = useState<AccessEventRecord[]>([]);
  const [accessPresence, setAccessPresence] = useState<AccessPresenceSummary | null>(null);
  const [accessEventsLoading, setAccessEventsLoading] = useState(false);
  const [accessPresenceLoading, setAccessPresenceLoading] = useState(false);
  const [accessQueryError, setAccessQueryError] = useState<string | null>(null);
  const formatErrorRef = useLatestRef(formatError);
  const accessEventsRequestIdRef = useRef(0);
  const accessPresenceRequestIdRef = useRef(0);

  async function loadAccessEvents(memberId?: number | null, shouldCommit?: CommitGuard) {
    const requestId = accessEventsRequestIdRef.current + 1;
    accessEventsRequestIdRef.current = requestId;
    setAccessEventsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", "100");
      if (memberId != null) {
        params.set("memberId", String(memberId));
      }
      const response = await apiGet<AccessEventRecord[]>(`/api/v1/access/events?${params.toString()}`);
      if (accessEventsRequestIdRef.current !== requestId || !canCommitState(shouldCommit)) {
        return;
      }
      setAccessEvents(response.data);
    } catch (error) {
      if (accessEventsRequestIdRef.current !== requestId || !canCommitState(shouldCommit)) {
        return;
      }
      setAccessQueryError(formatErrorRef.current(error));
    } finally {
      if (accessEventsRequestIdRef.current === requestId && canCommitState(shouldCommit)) {
        setAccessEventsLoading(false);
      }
    }
  }

  async function loadAccessPresence(shouldCommit?: CommitGuard) {
    const requestId = accessPresenceRequestIdRef.current + 1;
    accessPresenceRequestIdRef.current = requestId;
    setAccessPresenceLoading(true);
    try {
      const response = await apiGet<AccessPresenceSummary>("/api/v1/access/presence");
      if (accessPresenceRequestIdRef.current !== requestId || !canCommitState(shouldCommit)) {
        return;
      }
      setAccessPresence(response.data);
    } catch (error) {
      if (accessPresenceRequestIdRef.current !== requestId || !canCommitState(shouldCommit)) {
        return;
      }
      setAccessQueryError(formatErrorRef.current(error));
    } finally {
      if (accessPresenceRequestIdRef.current === requestId && canCommitState(shouldCommit)) {
        setAccessPresenceLoading(false);
      }
    }
  }

  async function reloadAccessData(memberId?: number | null, shouldCommit?: CommitGuard) {
    setAccessQueryError(null);
    await Promise.all([loadAccessPresence(shouldCommit), loadAccessEvents(memberId, shouldCommit)]);
  }

  function resetAccessQueries() {
    accessEventsRequestIdRef.current += 1;
    accessPresenceRequestIdRef.current += 1;
    setAccessEvents([]);
    setAccessPresence(null);
    setAccessEventsLoading(false);
    setAccessPresenceLoading(false);
    setAccessQueryError(null);
  }

  return {
    accessEvents,
    accessPresence,
    accessEventsLoading,
    accessPresenceLoading,
    accessQueryError,
    loadAccessEvents,
    loadAccessPresence,
    reloadAccessData,
    resetAccessQueries
  } as const;
}
