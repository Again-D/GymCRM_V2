import { useRef, useState } from "react";
import { apiGet } from "../../shared/api/client";
import type { LockerAssignment, LockerFilters, LockerSlot } from "./useLockerWorkspaceState";

type CommitGuard = () => boolean;

type UseLockerQueriesOptions = {
  getDefaultFilters: () => LockerFilters;
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

export function useLockerQueries({ getDefaultFilters, formatError }: UseLockerQueriesOptions) {
  const [lockerSlots, setLockerSlots] = useState<LockerSlot[]>([]);
  const [lockerSlotsLoading, setLockerSlotsLoading] = useState(false);
  const [lockerAssignments, setLockerAssignments] = useState<LockerAssignment[]>([]);
  const [lockerAssignmentsLoading, setLockerAssignmentsLoading] = useState(false);
  const [lockerQueryError, setLockerQueryError] = useState<string | null>(null);
  const getDefaultFiltersRef = useLatestRef(getDefaultFilters);
  const formatErrorRef = useLatestRef(formatError);
  const lockerSlotsRequestIdRef = useRef(0);
  const lockerAssignmentsRequestIdRef = useRef(0);

  async function loadLockerSlots(filters?: LockerFilters, shouldCommit?: CommitGuard) {
    const requestId = lockerSlotsRequestIdRef.current + 1;
    lockerSlotsRequestIdRef.current = requestId;
    setLockerSlotsLoading(true);
    try {
      const effectiveFilters = filters ?? getDefaultFiltersRef.current();
      const params = new URLSearchParams();
      if (effectiveFilters.lockerStatus) {
        params.set("lockerStatus", effectiveFilters.lockerStatus);
      }
      if (effectiveFilters.lockerZone.trim()) {
        params.set("lockerZone", effectiveFilters.lockerZone.trim());
      }
      const query = params.toString();
      const response = await apiGet<LockerSlot[]>(`/api/v1/lockers/slots${query ? `?${query}` : ""}`);
      if (lockerSlotsRequestIdRef.current !== requestId || !canCommitState(shouldCommit)) {
        return;
      }
      setLockerSlots(response.data);
    } catch (error) {
      if (lockerSlotsRequestIdRef.current !== requestId || !canCommitState(shouldCommit)) {
        return;
      }
      setLockerQueryError(formatErrorRef.current(error));
    } finally {
      if (lockerSlotsRequestIdRef.current === requestId && canCommitState(shouldCommit)) {
        setLockerSlotsLoading(false);
      }
    }
  }

  async function loadLockerAssignments(activeOnly = false, shouldCommit?: CommitGuard) {
    const requestId = lockerAssignmentsRequestIdRef.current + 1;
    lockerAssignmentsRequestIdRef.current = requestId;
    setLockerAssignmentsLoading(true);
    try {
      const response = await apiGet<LockerAssignment[]>(`/api/v1/lockers/assignments?activeOnly=${activeOnly}`);
      if (lockerAssignmentsRequestIdRef.current !== requestId || !canCommitState(shouldCommit)) {
        return;
      }
      setLockerAssignments(response.data);
    } catch (error) {
      if (lockerAssignmentsRequestIdRef.current !== requestId || !canCommitState(shouldCommit)) {
        return;
      }
      setLockerQueryError(formatErrorRef.current(error));
    } finally {
      if (lockerAssignmentsRequestIdRef.current === requestId && canCommitState(shouldCommit)) {
        setLockerAssignmentsLoading(false);
      }
    }
  }

  function resetLockerQueries() {
    lockerSlotsRequestIdRef.current += 1;
    lockerAssignmentsRequestIdRef.current += 1;
    setLockerSlots([]);
    setLockerSlotsLoading(false);
    setLockerAssignments([]);
    setLockerAssignmentsLoading(false);
    setLockerQueryError(null);
  }

  return {
    lockerSlots,
    lockerSlotsLoading,
    lockerAssignments,
    lockerAssignmentsLoading,
    lockerQueryError,
    loadLockerSlots,
    loadLockerAssignments,
    resetLockerQueries
  } as const;
}
