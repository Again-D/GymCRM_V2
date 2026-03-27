import { useCallback, useRef, useState } from "react";

import { apiGet } from "../../../api/client";
import type {
  TrainerAvailabilityScope,
  TrainerAvailabilitySnapshot,
} from "./types";

function getAvailabilityPath(scope: TrainerAvailabilityScope, month: string) {
  if (scope.type === "me") {
    return `/api/v1/trainers/me/availability?month=${month}`;
  }
  return `/api/v1/trainers/${scope.trainerUserId}/availability?month=${month}`;
}

export function useTrainerAvailabilityQuery() {
  const [snapshot, setSnapshot] = useState<TrainerAvailabilitySnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const loadSnapshot = useCallback(
    async (scope: TrainerAvailabilityScope, month: string) => {
      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;
      setLoading(true);
      setError(null);

      try {
        const response = await apiGet<TrainerAvailabilitySnapshot>(
          getAvailabilityPath(scope, month),
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
            : "스케줄 정보를 불러오지 못했습니다.",
        );
        return null;
      } finally {
        if (requestIdRef.current === requestId) {
          setLoading(false);
        }
      }
    },
    [],
  );

  const reset = useCallback(() => {
    requestIdRef.current += 1;
    setSnapshot(null);
    setLoading(false);
    setError(null);
  }, []);

  const applySnapshot = useCallback(
    (nextSnapshot: TrainerAvailabilitySnapshot | null) => {
      requestIdRef.current += 1;
      setSnapshot(nextSnapshot);
      setLoading(false);
      setError(null);
    },
    [],
  );

  return {
    snapshot,
    loading,
    error,
    loadSnapshot,
    applySnapshot,
    reset,
  } as const;
}
