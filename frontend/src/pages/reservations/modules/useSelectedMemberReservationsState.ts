import { useCallback, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { apiGet, apiPost, isMockApiMode } from "../../../api/client";
import { queryKeys, queryPolicies } from "../../../app/queryHelpers";
import { toUserFacingErrorMessage } from "../../../app/uiError";
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
  const queryClient = useQueryClient();
  const [activeMemberId, setActiveMemberId] = useState<number | null>(null);
  const useMockMutations = isMockApiMode();

  const queryKey = queryKeys.reservations.list({ memberId: activeMemberId });

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      if (activeMemberId == null) return [];
      const response = await apiGet<ReservationRow[]>(
        `/api/v1/reservations?memberId=${activeMemberId}`,
      );
      return Array.isArray(response.data) ? response.data : [];
    },
    enabled: activeMemberId !== null,
    staleTime: queryPolicies.list.staleTime,
    gcTime: queryPolicies.list.gcTime,
  });

  const loadSelectedMemberReservations = useCallback(
    async (memberId: number) => {
      setActiveMemberId(memberId);
    },
    [],
  );

  const resetSelectedMemberReservationsState = useCallback(() => {
    setActiveMemberId(null);
  }, []);

  const invalidateRelated = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.trainers.all });
    void queryClient.invalidateQueries({ queryKey: queryKeys.reservations.all });
    void queryClient.invalidateQueries({ queryKey: queryKeys.memberships.all });
  }, [queryClient]);

  const replaceReservation = useCallback((nextReservation: ReservationRow) => {
    queryClient.setQueryData<ReservationRow[]>(queryKey, (prev) => {
      const arr = Array.isArray(prev) ? prev : [];
      return arr.map((reservation) =>
        reservation.reservationId === nextReservation.reservationId
          ? nextReservation
          : reservation,
      );
    });
  }, [queryClient, queryKey]);

  const createReservation = useCallback(
    async (input: CreateReservationInput) => {
      const targetQueryKey = queryKeys.reservations.list({ memberId: input.memberId });
      if (!useMockMutations) {
        const response = await apiPost<ReservationRow>("/api/v1/reservations", {
          memberId: input.memberId,
          membershipId: input.membershipId,
          scheduleId: input.scheduleId,
          memo: input.memo ?? null,
        });
        queryClient.setQueryData<ReservationRow[]>(targetQueryKey, (prev) => {
          const arr = Array.isArray(prev) ? prev : [];
          return [response.data, ...arr];
        });
        invalidateRelated();
        return response.data;
      }

      const { createMockReservation } = await import("../../../api/mockData");
      const reservation = createMockReservation(input);
      queryClient.setQueryData<ReservationRow[]>(targetQueryKey, (prev) => {
        const arr = Array.isArray(prev) ? prev : [];
        return [reservation, ...arr];
      });
      invalidateRelated();
      return reservation;
    },
    [useMockMutations, queryClient, invalidateRelated],
  );

  const createPtReservation = useCallback(
    async (input: CreatePtReservationInput) => {
      const targetQueryKey = queryKeys.reservations.list({ memberId: input.memberId });
      if (!useMockMutations) {
        const response = await apiPost<ReservationRow>("/api/v1/reservations/pt", {
          memberId: input.memberId,
          membershipId: input.membershipId,
          trainerUserId: input.trainerUserId,
          startAt: input.startAt,
          memo: input.memo ?? null,
        });
        queryClient.setQueryData<ReservationRow[]>(targetQueryKey, (prev) => {
          const arr = Array.isArray(prev) ? prev : [];
          return [response.data, ...arr];
        });
        invalidateRelated();
        return response.data;
      }

      const { createMockPtReservation } = await import("../../../api/mockData");
      const reservation = createMockPtReservation(input);
      queryClient.setQueryData<ReservationRow[]>(targetQueryKey, (prev) => {
        const arr = Array.isArray(prev) ? prev : [];
        return [reservation, ...arr];
      });
      invalidateRelated();
      return reservation;
    },
    [useMockMutations, queryClient, invalidateRelated],
  );

  const checkInReservation = useCallback(
    async (memberId: number, reservationId: number) => {
      if (!useMockMutations) {
        const response = await apiPost<ReservationRow>(
          `/api/v1/reservations/${reservationId}/check-in`,
        );
        replaceReservation(response.data);
        invalidateRelated();
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
      invalidateRelated();
      return nextReservation;
    },
    [useMockMutations, replaceReservation, invalidateRelated],
  );

  const completeReservation = useCallback(
    async (memberId: number, reservationId: number) => {
      if (!useMockMutations) {
        const response = await apiPost<{ reservation: ReservationRow }>(
          `/api/v1/reservations/${reservationId}/complete`,
        );
        replaceReservation(response.data.reservation);
        invalidateRelated();
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
      invalidateRelated();
      return nextReservation;
    },
    [useMockMutations, replaceReservation, invalidateRelated],
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
        invalidateRelated();
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
      invalidateRelated();
      return nextReservation;
    },
    [useMockMutations, replaceReservation, invalidateRelated],
  );

  const noShowReservation = useCallback(
    async (memberId: number, reservationId: number) => {
      if (!useMockMutations) {
        const response = await apiPost<ReservationRow>(
          `/api/v1/reservations/${reservationId}/no-show`,
        );
        replaceReservation(response.data);
        invalidateRelated();
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
      invalidateRelated();
      return nextReservation;
    },
    [useMockMutations, replaceReservation, invalidateRelated],
  );

  return {
    selectedMemberReservations: Array.isArray(query.data) ? query.data : [],
    selectedMemberReservationsLoading: query.isFetching || query.isPending,
    selectedMemberReservationsError: query.error ? toUserFacingErrorMessage(query.error, "예약 이력을 불러오지 못했습니다.") : null,
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
