import { useCallback, useRef, useState } from "react";

import { apiGet } from "../../../api/client";
import type { PtReservationCandidatesPayload } from "../../members/modules/types";

type LoadPtReservationCandidatesInput = {
  membershipId: number;
  trainerUserId: number;
  date: string;
};

export function usePtReservationCandidatesQuery() {
  const [ptReservationCandidates, setPtReservationCandidates] = useState<PtReservationCandidatesPayload | null>(null);
  const [ptReservationCandidatesLoading, setPtReservationCandidatesLoading] = useState(false);
  const [ptReservationCandidatesError, setPtReservationCandidatesError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const loadPtReservationCandidates = useCallback(async (input: LoadPtReservationCandidatesInput) => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setPtReservationCandidatesLoading(true);
    setPtReservationCandidatesError(null);

    try {
      const params = new URLSearchParams({
        membershipId: String(input.membershipId),
        trainerUserId: String(input.trainerUserId),
        date: input.date,
      });
      const response = await apiGet<PtReservationCandidatesPayload>(
        `/api/v1/reservations/pt-candidates?${params.toString()}`,
      );
      if (requestIdRef.current !== requestId) {
        return;
      }
      setPtReservationCandidates(response.data);
    } catch (error) {
      if (requestIdRef.current !== requestId) {
        return;
      }
      setPtReservationCandidates(null);
      setPtReservationCandidatesError(
        error instanceof Error ? error.message : "PT 예약 가능 시각을 불러오지 못했습니다.",
      );
    } finally {
      if (requestIdRef.current === requestId) {
        setPtReservationCandidatesLoading(false);
      }
    }
  }, []);

  const resetPtReservationCandidatesQuery = useCallback(() => {
    requestIdRef.current += 1;
    setPtReservationCandidates(null);
    setPtReservationCandidatesLoading(false);
    setPtReservationCandidatesError(null);
  }, []);

  return {
    ptReservationCandidates,
    ptReservationCandidatesLoading,
    ptReservationCandidatesError,
    loadPtReservationCandidates,
    resetPtReservationCandidatesQuery,
  } as const;
}
