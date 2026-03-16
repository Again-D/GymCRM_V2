import { useCallback, useRef, useState } from "react";

import { apiGet } from "../../../api/client";
import { useQueryInvalidationVersion } from "../../../api/queryInvalidation";
import type { AccessEventRow, AccessPresenceSummary } from "./types";

export function useAccessQueries() {
  const [accessEvents, setAccessEvents] = useState<AccessEventRow[]>([]);
  const [accessPresence, setAccessPresence] =
    useState<AccessPresenceSummary | null>(null);
  const [accessEventsLoading, setAccessEventsLoading] = useState(false);
  const [accessPresenceLoading, setAccessPresenceLoading] = useState(false);
  const [accessQueryError, setAccessQueryError] = useState<string | null>(null);
  const accessEventsRequestIdRef = useRef(0);
  const accessPresenceRequestIdRef = useRef(0);
  const accessEventsCacheRef = useRef(new Map<string, AccessEventRow[]>());
  const accessPresenceCacheRef = useRef(
    new Map<string, AccessPresenceSummary>(),
  );
  const accessEventsInflightRef = useRef(
    new Map<string, Promise<AccessEventRow[]>>(),
  );
  const accessPresenceInflightRef = useRef(
    new Map<string, Promise<AccessPresenceSummary>>(),
  );
  const accessEventsVersion = useQueryInvalidationVersion("accessEvents");
  const accessPresenceVersion = useQueryInvalidationVersion("accessPresence");

  const loadAccessEvents = useCallback(
    async (memberId?: number | null) => {
      const requestId = accessEventsRequestIdRef.current + 1;
      accessEventsRequestIdRef.current = requestId;
      setAccessEventsLoading(true);
      setAccessQueryError(null);

      try {
        const params = new URLSearchParams();
        params.set("limit", "100");
        if (memberId != null) {
          params.set("memberId", String(memberId));
        }
        const query = params.toString();
        const cacheKey = `${accessEventsVersion}:${query}`;
        if (accessEventsCacheRef.current.has(cacheKey)) {
          if (accessEventsRequestIdRef.current !== requestId) return;
          setAccessEvents(accessEventsCacheRef.current.get(cacheKey) ?? []);
          return;
        }

        let responsePromise = accessEventsInflightRef.current.get(cacheKey);
        if (!responsePromise) {
          responsePromise = apiGet<AccessEventRow[]>(
            `/api/v1/access/events?${query}`,
          )
            .then((response) => response.data)
            .finally(() => accessEventsInflightRef.current.delete(cacheKey));
          accessEventsInflightRef.current.set(cacheKey, responsePromise);
        }

        const events = await responsePromise;
        if (accessEventsRequestIdRef.current !== requestId) return;
        accessEventsCacheRef.current.set(cacheKey, events);
        setAccessEvents(events);
      } catch (error) {
        if (accessEventsRequestIdRef.current !== requestId) return;
        setAccessEvents([]);
        setAccessQueryError(
          error instanceof Error
            ? error.message
            : "출입 이벤트를 불러오지 못했습니다.",
        );
      } finally {
        if (accessEventsRequestIdRef.current === requestId) {
          setAccessEventsLoading(false);
        }
      }
    },
    [accessEventsVersion],
  );

  const loadAccessPresence = useCallback(async () => {
    const requestId = accessPresenceRequestIdRef.current + 1;
    accessPresenceRequestIdRef.current = requestId;
    setAccessPresenceLoading(true);
    setAccessQueryError(null);

    try {
      const cacheKey = `${accessPresenceVersion}`;
      if (accessPresenceCacheRef.current.has(cacheKey)) {
        if (accessPresenceRequestIdRef.current !== requestId) return;
        setAccessPresence(accessPresenceCacheRef.current.get(cacheKey) ?? null);
        return;
      }

      let responsePromise = accessPresenceInflightRef.current.get(cacheKey);
      if (!responsePromise) {
        responsePromise = apiGet<AccessPresenceSummary>(
          "/api/v1/access/presence",
        )
          .then((response) => response.data)
          .finally(() => accessPresenceInflightRef.current.delete(cacheKey));
        accessPresenceInflightRef.current.set(cacheKey, responsePromise);
      }

      const presence = await responsePromise;
      if (accessPresenceRequestIdRef.current !== requestId) return;
      accessPresenceCacheRef.current.set(cacheKey, presence);
      setAccessPresence(presence);
    } catch (error) {
      if (accessPresenceRequestIdRef.current !== requestId) return;
      setAccessPresence(null);
      setAccessQueryError(
        error instanceof Error
          ? error.message
          : "현재 입장 현황을 불러오지 못했습니다.",
      );
    } finally {
      if (accessPresenceRequestIdRef.current === requestId) {
        setAccessPresenceLoading(false);
      }
    }
  }, [accessPresenceVersion]);

  const reloadAccessData = useCallback(
    async (memberId?: number | null) => {
      await Promise.all([loadAccessPresence(), loadAccessEvents(memberId)]);
    },
    [loadAccessEvents, loadAccessPresence],
  );

  const resetAccessQueries = useCallback(() => {
    accessEventsRequestIdRef.current += 1;
    accessPresenceRequestIdRef.current += 1;
    setAccessEvents([]);
    setAccessPresence(null);
    setAccessEventsLoading(false);
    setAccessPresenceLoading(false);
    setAccessQueryError(null);
  }, []);

  return {
    accessEvents,
    accessPresence,
    accessEventsLoading,
    accessPresenceLoading,
    accessQueryError,
    loadAccessEvents,
    loadAccessPresence,
    reloadAccessData,
    resetAccessQueries,
  } as const;
}
