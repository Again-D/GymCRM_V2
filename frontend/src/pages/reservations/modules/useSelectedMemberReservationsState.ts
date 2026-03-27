import { useCallback, useRef, useState } from "react";

import { apiGet, apiPost, isMockApiMode } from "../../../api/client";
import {
  invalidateQueryDomains,
  useQueryInvalidationVersion,
} from "../../../api/queryInvalidation";
import type { ReservationRow } from "../../members/modules/types";

type CreateReservationInput = {
  memberId: number;
  membershipId: number;
  scheduleId: number;
  memo?: string;
};

type CreatePtReservationInput = {
  memberId: number;
  membershipId: number;
  trainerUserId: number;
  startAt: string;
  memo?: string;
};

export function useSelectedMemberReservationsState() {
  const [selectedMemberReservations, setSelectedMemberReservations] = useState<
    ReservationRow[]
  >([]);
  const [
    selectedMemberReservationsLoading,
    setSelectedMemberReservationsLoading,
  ] = useState(false);
  const [selectedMemberReservationsError, setSelectedMemberReservationsError] =
    useState<string | null>(null);
  const requestIdRef = useRef(0);
  const useMockMutations = isMockApiMode();
  const selectedMemberReservationsVersion = useQueryInvalidationVersion(
    "selectedMemberReservations",
  );

  const loadSelectedMemberReservations = useCallback(
    async (memberId: number) => {
      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;
      setSelectedMemberReservationsLoading(true);
      setSelectedMemberReservationsError(null);

      try {
        const params = new URLSearchParams({
          memberId: String(memberId),
          version: String(selectedMemberReservationsVersion),
        });
        const response = await apiGet<ReservationRow[]>(
          `/api/v1/reservations?${params.toString()}`,
        );
        if (requestIdRef.current !== requestId) {
          return;
        }
        setSelectedMemberReservations(response.data);
      } catch (error) {
        if (requestIdRef.current !== requestId) {
          return;
        }
        setSelectedMemberReservations((prev) =>
          prev.length === 0 ? prev : [],
        );
        setSelectedMemberReservationsError(
          error instanceof Error
            ? error.message
            : "예약 이력을 불러오지 못했습니다.",
        );
      } finally {
        if (requestIdRef.current === requestId) {
          setSelectedMemberReservationsLoading(false);
        }
      }
    },
    [selectedMemberReservationsVersion],
  );

  const resetSelectedMemberReservationsState = useCallback(() => {
    requestIdRef.current += 1;
    setSelectedMemberReservations((prev) => (prev.length === 0 ? prev : []));
    setSelectedMemberReservationsLoading(false);
    setSelectedMemberReservationsError(null);
  }, []);

  function replaceReservation(nextReservation: ReservationRow) {
    setSelectedMemberReservations((prev) =>
      prev.map((reservation) =>
        reservation.reservationId === nextReservation.reservationId
          ? nextReservation
          : reservation,
      ),
    );
  }

  const createReservation = useCallback(
    async (input: CreateReservationInput) => {
      if (!useMockMutations) {
        const response = await apiPost<ReservationRow>("/api/v1/reservations", {
          memberId: input.memberId,
          membershipId: input.membershipId,
          scheduleId: input.scheduleId,
          memo: input.memo ?? null,
        });
        setSelectedMemberReservations((prev) => [response.data, ...prev]);
        invalidateQueryDomains([
          "trainers",
          "reservationTargets",
          "selectedMemberReservations",
        ]);
        return response.data;
      }

      const { createMockReservation } = await import("../../../api/mockData");
      const reservation = createMockReservation(input);
      setSelectedMemberReservations((prev) => [reservation, ...prev]);
      invalidateQueryDomains([
        "trainers",
        "reservationTargets",
        "selectedMemberReservations",
      ]);
      return reservation;
    },
    [useMockMutations],
  );

  const createPtReservation = useCallback(
    async (input: CreatePtReservationInput) => {
      if (!useMockMutations) {
        const response = await apiPost<ReservationRow>("/api/v1/reservations/pt", {
          memberId: input.memberId,
          membershipId: input.membershipId,
          trainerUserId: input.trainerUserId,
          startAt: input.startAt,
          memo: input.memo ?? null,
        });
        setSelectedMemberReservations((prev) => [response.data, ...prev]);
        invalidateQueryDomains([
          "trainers",
          "reservationTargets",
          "selectedMemberReservations",
          "selectedMemberMemberships",
        ]);
        return response.data;
      }

      const { createMockPtReservation } = await import("../../../api/mockData");
      const reservation = createMockPtReservation(input);
      setSelectedMemberReservations((prev) => [reservation, ...prev]);
      invalidateQueryDomains([
        "trainers",
        "reservationTargets",
        "selectedMemberReservations",
        "selectedMemberMemberships",
      ]);
      return reservation;
    },
    [useMockMutations],
  );

  const checkInReservation = useCallback(
    async (memberId: number, reservationId: number) => {
      if (!useMockMutations) {
        const response = await apiPost<ReservationRow>(
          `/api/v1/reservations/${reservationId}/check-in`,
        );
        replaceReservation(response.data);
        invalidateQueryDomains(["selectedMemberReservations"]);
        return response.data;
      }

      const { patchMockReservation } = await import("../../../api/mockData");
      const nextReservation = patchMockReservation(
        memberId,
        reservationId,
        (reservation) => ({
          ...reservation,
          checkedInAt: reservation.checkedInAt ?? new Date().toISOString(),
        }),
      );
      if (!nextReservation) {
        throw new Error("예약을 찾을 수 없습니다.");
      }
      replaceReservation(nextReservation);
      invalidateQueryDomains(["selectedMemberReservations"]);
      return nextReservation;
    },
    [useMockMutations],
  );

  const completeReservation = useCallback(
    async (memberId: number, reservationId: number) => {
      if (!useMockMutations) {
        const response = await apiPost<{ reservation: ReservationRow }>(
          `/api/v1/reservations/${reservationId}/complete`,
        );
        replaceReservation(response.data.reservation);
        invalidateQueryDomains([
          "trainers",
          "reservationTargets",
          "selectedMemberReservations",
          "selectedMemberMemberships",
        ]);
        return response.data.reservation;
      }

      const { patchMockReservation } = await import("../../../api/mockData");
      const nextReservation = patchMockReservation(
        memberId,
        reservationId,
        (reservation) => ({
          ...reservation,
          reservationStatus: "COMPLETED",
          completedAt: new Date().toISOString(),
        }),
      );
      if (!nextReservation) {
        throw new Error("예약을 찾을 수 없습니다.");
      }
      replaceReservation(nextReservation);
      invalidateQueryDomains([
        "trainers",
        "reservationTargets",
        "selectedMemberReservations",
        "selectedMemberMemberships",
      ]);
      return nextReservation;
    },
    [useMockMutations],
  );

  const cancelReservation = useCallback(
    async (memberId: number, reservationId: number) => {
      if (!useMockMutations) {
        const response = await apiPost<ReservationRow>(
          `/api/v1/reservations/${reservationId}/cancel`,
          {
            cancelReason: null,
          },
        );
        replaceReservation(response.data);
        invalidateQueryDomains([
          "trainers",
          "reservationTargets",
          "selectedMemberReservations",
        ]);
        return response.data;
      }

      const { patchMockReservation } = await import("../../../api/mockData");
      const nextReservation = patchMockReservation(
        memberId,
        reservationId,
        (reservation) => ({
          ...reservation,
          reservationStatus: "CANCELLED",
          cancelledAt: new Date().toISOString(),
        }),
      );
      if (!nextReservation) {
        throw new Error("예약을 찾을 수 없습니다.");
      }
      replaceReservation(nextReservation);
      invalidateQueryDomains([
        "trainers",
        "reservationTargets",
        "selectedMemberReservations",
      ]);
      return nextReservation;
    },
    [useMockMutations],
  );

  const noShowReservation = useCallback(
    async (memberId: number, reservationId: number) => {
      if (!useMockMutations) {
        const response = await apiPost<ReservationRow>(
          `/api/v1/reservations/${reservationId}/no-show`,
        );
        replaceReservation(response.data);
        invalidateQueryDomains([
          "trainers",
          "reservationTargets",
          "selectedMemberReservations",
          "selectedMemberMemberships",
        ]);
        return response.data;
      }

      const { patchMockReservation } = await import("../../../api/mockData");
      const nextReservation = patchMockReservation(
        memberId,
        reservationId,
        (reservation) => ({
          ...reservation,
          reservationStatus: "NO_SHOW",
          noShowAt: new Date().toISOString(),
        }),
      );
      if (!nextReservation) {
        throw new Error("예약을 찾을 수 없습니다.");
      }
      replaceReservation(nextReservation);
      invalidateQueryDomains([
        "trainers",
        "reservationTargets",
        "selectedMemberReservations",
        "selectedMemberMemberships",
      ]);
      return nextReservation;
    },
    [useMockMutations],
  );

  return {
    selectedMemberReservations,
    selectedMemberReservationsLoading,
    selectedMemberReservationsError,
    loadSelectedMemberReservations,
    resetSelectedMemberReservationsState,
    createReservation,
    createPtReservation,
    checkInReservation,
    completeReservation,
    cancelReservation,
    noShowReservation,
  } as const;
}
