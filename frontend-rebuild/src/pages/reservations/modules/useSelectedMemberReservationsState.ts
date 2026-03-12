import { useRef, useState } from "react";

import { apiGet } from "../../../api/client";
import type { ReservationRow } from "../../members/modules/types";

type CreateReservationInput = {
  membershipId: number;
  scheduleId: number;
};

function nowText() {
  return new Date().toISOString();
}

export function useSelectedMemberReservationsState() {
  const [selectedMemberReservations, setSelectedMemberReservations] = useState<ReservationRow[]>([]);
  const [selectedMemberReservationsLoading, setSelectedMemberReservationsLoading] = useState(false);
  const [selectedMemberReservationsError, setSelectedMemberReservationsError] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const reservationIdSeedRef = useRef(90000);

  async function loadSelectedMemberReservations(memberId: number) {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setSelectedMemberReservationsLoading(true);
    setSelectedMemberReservationsError(null);

    try {
      const response = await apiGet<ReservationRow[]>(`/api/v1/members/${memberId}/reservations`);
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

  function createReservation(input: CreateReservationInput) {
    reservationIdSeedRef.current += 1;
    const reservation: ReservationRow = {
      reservationId: reservationIdSeedRef.current,
      membershipId: input.membershipId,
      scheduleId: input.scheduleId,
      reservationStatus: "CONFIRMED",
      reservedAt: nowText(),
      cancelledAt: null,
      completedAt: null,
      noShowAt: null,
      checkedInAt: null
    };
    setSelectedMemberReservations((prev) => [reservation, ...prev]);
    return reservation;
  }

  function patchReservation(
    reservationId: number,
    updater: (reservation: ReservationRow) => ReservationRow
  ) {
    setSelectedMemberReservations((prev) =>
      prev.map((reservation) => (reservation.reservationId === reservationId ? updater(reservation) : reservation))
    );
  }

  function checkInReservation(reservationId: number) {
    patchReservation(reservationId, (reservation) => ({
      ...reservation,
      checkedInAt: reservation.checkedInAt ?? nowText()
    }));
  }

  function completeReservation(reservationId: number) {
    patchReservation(reservationId, (reservation) => ({
      ...reservation,
      reservationStatus: "COMPLETED",
      completedAt: nowText()
    }));
  }

  function cancelReservation(reservationId: number) {
    patchReservation(reservationId, (reservation) => ({
      ...reservation,
      reservationStatus: "CANCELLED",
      cancelledAt: nowText()
    }));
  }

  function noShowReservation(reservationId: number) {
    patchReservation(reservationId, (reservation) => ({
      ...reservation,
      reservationStatus: "NO_SHOW",
      noShowAt: nowText()
    }));
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
