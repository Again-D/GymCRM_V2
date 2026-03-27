import { useCallback, useRef, useState } from "react";

import { apiGet } from "../../../api/client";
import type { GxScheduleSnapshot } from "./types";

export function useGxScheduleSnapshotQuery() {
  const [snapshot, setSnapshot] = useState<GxScheduleSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const loadSnapshot = useCallback(async (month: string) => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setLoading(true);
    setError(null);

    try {
      const response = await apiGet<GxScheduleSnapshot>(
        `/api/v1/reservations/gx/snapshot?month=${month}`,
      );
      if (requestIdRef.current !== requestId) {
        return null;
      }
      setSnapshot(response.data);
      return response.data;
    } catch (caught) {
      if (requestIdRef.current !== requestId) {
        return null;
      }
      setSnapshot(null);
      setError(
        caught instanceof Error
          ? caught.message
          : "GX 스케줄을 불러오지 못했습니다.",
      );
      return null;
    } finally {
      if (requestIdRef.current === requestId) {
        setLoading(false);
      }
    }
  }, []);

  const applySnapshot = useCallback((nextSnapshot: GxScheduleSnapshot | null) => {
    requestIdRef.current += 1;
    setSnapshot(nextSnapshot);
    setLoading(false);
    setError(null);
  }, []);

  return {
    snapshot,
    loading,
    error,
    loadSnapshot,
    applySnapshot,
  } as const;
}
