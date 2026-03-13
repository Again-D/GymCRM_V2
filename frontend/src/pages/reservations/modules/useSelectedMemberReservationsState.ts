import { useRef, useState } from "react";

import { apiGet, apiPost, isMockApiMode } from "../../../api/client";
import { createMockReservation, patchMockReservation } from "../../../api/mockData";
import { invalidateQueryDomains, useQueryInvalidationVersion } from "../../../api/queryInvalidation";
import type { ReservationRow } from "../../members/modules/types";

type CreateReservationInput = {
  memberId: number;
  membershipId: number;
  scheduleId: number;
  memo?: string;
};

export function useSelectedMemberReservationsState() {
  const [selectedMemberReservations, setSelectedMemberReservations] = useState<ReservationRow[]>([]);
  const [selectedMemberReservationsLoading, setSelectedMemberReservationsLoading] = useState(false);
  const [selectedMemberReservationsError, setSelectedMemberReservationsError] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const useMockMutations = isMockApiMode();
  const selectedMemberReservationsVersion = useQueryInvalidationVersion("selectedMemberReservations");

  async function loadSelectedMemberReservations(memberId: number) {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setSelectedMemberReservationsLoading(true);
    setSelectedMemberReservationsError(null);

    try {
      const response = await apiGet<ReservationRow[]>(
        `/api/v1/members/${memberId}/reservations?version=${selectedMemberReservationsVersion}`
      );
      if (requestIdRef.current !== requestId) {
        return;
      }
      setSelectedMemberReservations(response.data);
    } catch (error) {
      if (requestIdRef.current !== requestId) {
        return;
      }
      setSelectedMemberReservations([]);
      setSelectedMemberReservationsError(error instanceof Error ? error.message : "예약 이력을 불러오지 못했습니다.");
    } finally {
      if (requestIdRef.current === requestId) {
        setSelectedMemberReservationsLoading(false);
      }
    }
  }

  function resetSelectedMemberReservationsState() {
    requestIdRef.current += 1;
    setSelectedMemberReservations([]);
    setSelectedMemberReservationsLoading(false);
    setSelectedMemberReservationsError(null);
  }

  function replaceReservation(nextReservation: ReservationRow) {
    setSelectedMemberReservations((prev) =>
      prev.map((reservation) =>
        reservation.reservationId === nextReservation.reservationId ? nextReservation : reservation
      )
    );
  }

  async function createReservation(input: CreateReservationInput) {
    if (!useMockMutations) {
      const response = await apiPost<ReservationRow>("/api/v1/reservations", {
        memberId: input.memberId,
        membershipId: input.membershipId,
        scheduleId: input.scheduleId,
        memo: input.memo ?? null
      });
      setSelectedMemberReservations((prev) => [response.data, ...prev]);
      invalidateQueryDomains(["reservationTargets", "selectedMemberReservations"]);
      return response.data;
    }

    const reservation = createMockReservation(input);
    setSelectedMemberReservations((prev) => [reservation, ...prev]);
    invalidateQueryDomains(["reservationTargets", "selectedMemberReservations"]);
    return reservation;
  }

  async function checkInReservation(memberId: number, reservationId: number) {
    if (!useMockMutations) {
      const response = await apiPost<ReservationRow>(`/api/v1/reservations/${reservationId}/check-in`);
      replaceReservation(response.data);
      invalidateQueryDomains(["selectedMemberReservations"]);
      return response.data;
    }

    const nextReservation = patchMockReservation(memberId, reservationId, (reservation) => ({
      ...reservation,
      checkedInAt: reservation.checkedInAt ?? new Date().toISOString()
    }));
    if (!nextReservation) {
      throw new Error("예약을 찾을 수 없습니다.");
    }
    replaceReservation(nextReservation);
    invalidateQueryDomains(["selectedMemberReservations"]);
    return nextReservation;
  }

  async function completeReservation(memberId: number, reservationId: number) {
    if (!useMockMutations) {
      const response = await apiPost<{ reservation: ReservationRow }>(`/api/v1/reservations/${reservationId}/complete`);
      replaceReservation(response.data.reservation);
      invalidateQueryDomains(["reservationTargets", "selectedMemberReservations", "selectedMemberMemberships"]);
      return response.data.reservation;
    }

    const nextReservation = patchMockReservation(memberId, reservationId, (reservation) => ({
      ...reservation,
      reservationStatus: "COMPLETED",
      completedAt: new Date().toISOString()
    }));
    if (!nextReservation) {
      throw new Error("예약을 찾을 수 없습니다.");
    }
    replaceReservation(nextReservation);
    invalidateQueryDomains(["reservationTargets", "selectedMemberReservations", "selectedMemberMemberships"]);
    return nextReservation;
  }

  async function cancelReservation(memberId: number, reservationId: number) {
    if (!useMockMutations) {
      const response = await apiPost<ReservationRow>(`/api/v1/reservations/${reservationId}/cancel`, {
        cancelReason: null
      });
      replaceReservation(response.data);
      invalidateQueryDomains(["reservationTargets", "selectedMemberReservations"]);
      return response.data;
    }

    const nextReservation = patchMockReservation(memberId, reservationId, (reservation) => ({
      ...reservation,
      reservationStatus: "CANCELLED",
      cancelledAt: new Date().toISOString()
    }));
    if (!nextReservation) {
      throw new Error("예약을 찾을 수 없습니다.");
    }
    replaceReservation(nextReservation);
    invalidateQueryDomains(["reservationTargets", "selectedMemberReservations"]);
    return nextReservation;
  }

  async function noShowReservation(memberId: number, reservationId: number) {
    if (!useMockMutations) {
      const response = await apiPost<ReservationRow>(`/api/v1/reservations/${reservationId}/no-show`);
      replaceReservation(response.data);
      invalidateQueryDomains(["reservationTargets", "selectedMemberReservations", "selectedMemberMemberships"]);
      return response.data;
    }

    const nextReservation = patchMockReservation(memberId, reservationId, (reservation) => ({
      ...reservation,
      reservationStatus: "NO_SHOW",
      noShowAt: new Date().toISOString()
    }));
    if (!nextReservation) {
      throw new Error("예약을 찾을 수 없습니다.");
    }
    replaceReservation(nextReservation);
    invalidateQueryDomains(["reservationTargets", "selectedMemberReservations", "selectedMemberMemberships"]);
    return nextReservation;
  }

  return {
    selectedMemberReservations,
    selectedMemberReservationsLoading,
    selectedMemberReservationsError,
    loadSelectedMemberReservations,
    resetSelectedMemberReservationsState,
    createReservation,
    checkInReservation,
    completeReservation,
    cancelReservation,
    noShowReservation
  } as const;
}
