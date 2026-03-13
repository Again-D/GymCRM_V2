import { useCallback, useRef, useState } from "react";

import { apiGet } from "../../../api/client";
import { useQueryInvalidationVersion } from "../../../api/queryInvalidation";
import type { LockerAssignment, LockerFilters, LockerSlot } from "./types";

export function useLockerQueries() {
  const [lockerSlots, setLockerSlots] = useState<LockerSlot[]>([]);
  const [lockerSlotsLoading, setLockerSlotsLoading] = useState(false);
  const [lockerAssignments, setLockerAssignments] = useState<LockerAssignment[]>([]);
  const [lockerAssignmentsLoading, setLockerAssignmentsLoading] = useState(false);
  const [lockerQueryError, setLockerQueryError] = useState<string | null>(null);
  const lockerSlotsRequestIdRef = useRef(0);
  const lockerAssignmentsRequestIdRef = useRef(0);
  const lockerSlotsCacheRef = useRef(new Map<string, LockerSlot[]>());
  const lockerAssignmentsCacheRef = useRef(new Map<string, LockerAssignment[]>());
  const lockerSlotsInflightRef = useRef(new Map<string, Promise<LockerSlot[]>>());
  const lockerAssignmentsInflightRef = useRef(new Map<string, Promise<LockerAssignment[]>>());
  const lockerSlotsVersion = useQueryInvalidationVersion("lockerSlots");
  const lockerAssignmentsVersion = useQueryInvalidationVersion("lockerAssignments");

  const loadLockerSlots = useCallback(async (filters?: LockerFilters) => {
    const requestId = lockerSlotsRequestIdRef.current + 1;
    lockerSlotsRequestIdRef.current = requestId;
    setLockerSlotsLoading(true);
    setLockerQueryError(null);

    try {
      const params = new URLSearchParams();
      if (filters?.lockerStatus) {
        params.set("lockerStatus", filters.lockerStatus);
      }
      if (filters?.lockerZone.trim()) {
        params.set("lockerZone", filters.lockerZone.trim());
      }
      const query = params.toString();
      const cacheKey = `${lockerSlotsVersion}:${query}`;
      if (lockerSlotsCacheRef.current.has(cacheKey)) {
        if (lockerSlotsRequestIdRef.current !== requestId) return;
        setLockerSlots(lockerSlotsCacheRef.current.get(cacheKey) ?? []);
        return;
      }

      let responsePromise = lockerSlotsInflightRef.current.get(cacheKey);
      if (!responsePromise) {
        responsePromise = apiGet<LockerSlot[]>(`/api/v1/lockers/slots${query ? `?${query}` : ""}`)
          .then((response) => response.data)
          .finally(() => lockerSlotsInflightRef.current.delete(cacheKey));
        lockerSlotsInflightRef.current.set(cacheKey, responsePromise);
      }

      const slots = await responsePromise;
      if (lockerSlotsRequestIdRef.current !== requestId) return;
      lockerSlotsCacheRef.current.set(cacheKey, slots);
      setLockerSlots(slots);
    } catch (error) {
      if (lockerSlotsRequestIdRef.current !== requestId) return;
      setLockerSlots([]);
      setLockerQueryError(error instanceof Error ? error.message : "라커 슬롯을 불러오지 못했습니다.");
    } finally {
      if (lockerSlotsRequestIdRef.current === requestId) {
        setLockerSlotsLoading(false);
      }
    }
  }, [lockerSlotsVersion]);

  const loadLockerAssignments = useCallback(async (activeOnly = false) => {
    const requestId = lockerAssignmentsRequestIdRef.current + 1;
    lockerAssignmentsRequestIdRef.current = requestId;
    setLockerAssignmentsLoading(true);
    setLockerQueryError(null);

    try {
      const query = `activeOnly=${activeOnly}`;
      const cacheKey = `${lockerAssignmentsVersion}:${query}`;
      if (lockerAssignmentsCacheRef.current.has(cacheKey)) {
        if (lockerAssignmentsRequestIdRef.current !== requestId) return;
        setLockerAssignments(lockerAssignmentsCacheRef.current.get(cacheKey) ?? []);
        return;
      }

      let responsePromise = lockerAssignmentsInflightRef.current.get(cacheKey);
      if (!responsePromise) {
        responsePromise = apiGet<LockerAssignment[]>(`/api/v1/lockers/assignments?${query}`)
          .then((response) => response.data)
          .finally(() => lockerAssignmentsInflightRef.current.delete(cacheKey));
        lockerAssignmentsInflightRef.current.set(cacheKey, responsePromise);
      }

      const assignments = await responsePromise;
      if (lockerAssignmentsRequestIdRef.current !== requestId) return;
      lockerAssignmentsCacheRef.current.set(cacheKey, assignments);
      setLockerAssignments(assignments);
    } catch (error) {
      if (lockerAssignmentsRequestIdRef.current !== requestId) return;
      setLockerAssignments([]);
      setLockerQueryError(error instanceof Error ? error.message : "라커 배정 목록을 불러오지 못했습니다.");
    } finally {
      if (lockerAssignmentsRequestIdRef.current === requestId) {
        setLockerAssignmentsLoading(false);
      }
    }
  }, [lockerAssignmentsVersion]);

  const reloadLockerData = useCallback(async (filters?: LockerFilters, activeOnly = false) => {
    await Promise.all([loadLockerSlots(filters), loadLockerAssignments(activeOnly)]);
  }, [loadLockerAssignments, loadLockerSlots]);

  const resetLockerQueries = useCallback(() => {
    lockerSlotsRequestIdRef.current += 1;
    lockerAssignmentsRequestIdRef.current += 1;
    setLockerSlots([]);
    setLockerSlotsLoading(false);
    setLockerAssignments([]);
    setLockerAssignmentsLoading(false);
    setLockerQueryError(null);
  }, []);

  return {
    lockerSlots,
    lockerSlotsLoading,
    lockerAssignments,
    lockerAssignmentsLoading,
    lockerQueryError,
    loadLockerSlots,
    loadLockerAssignments,
    reloadLockerData,
    resetLockerQueries
  } as const;
}
