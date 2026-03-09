import { useEffect, useState } from "react";

export type ReservationScheduleSummary = {
  scheduleId: number;
  centerId: number;
  scheduleType: "PT" | "GX";
  trainerName: string;
  slotTitle: string;
  startAt: string;
  endAt: string;
  capacity: number;
  currentCount: number;
  memo: string | null;
};

export type ReservationRecord = {
  reservationId: number;
  centerId: number;
  memberId: number;
  membershipId: number;
  scheduleId: number;
  reservationStatus: "CONFIRMED" | "CANCELLED" | "COMPLETED" | "NO_SHOW";
  reservedAt: string;
  cancelledAt: string | null;
  completedAt: string | null;
  noShowAt: string | null;
  checkedInAt: string | null;
  cancelReason: string | null;
  memo: string | null;
};

export type ReservationCompleteResponse = {
  reservation: ReservationRecord;
  membershipId: number;
  membershipStatus: string;
  remainingCount: number | null;
  usedCount: number;
  countDeducted: boolean;
};

export type ReservationCreateFormState = {
  scheduleId: string;
  membershipId: string;
  memo: string;
};

export const EMPTY_RESERVATION_CREATE_FORM: ReservationCreateFormState = {
  scheduleId: "",
  membershipId: "",
  memo: ""
};

export function useReservationWorkspaceState(selectedMemberId: number | null) {
  const [reservationRowsByMemberId, setReservationRowsByMemberId] = useState<Record<number, ReservationRecord[]>>({});
  const [reservationLoading, setReservationLoading] = useState(false);
  const [reservationCreateForm, setReservationCreateForm] =
    useState<ReservationCreateFormState>(EMPTY_RESERVATION_CREATE_FORM);
  const [reservationCreateSubmitting, setReservationCreateSubmitting] = useState(false);
  const [reservationActionSubmittingId, setReservationActionSubmittingId] = useState<number | null>(null);
  const [reservationPanelMessage, setReservationPanelMessage] = useState<string | null>(null);
  const [reservationPanelError, setReservationPanelError] = useState<string | null>(null);

  useEffect(() => {
    setReservationCreateForm({ ...EMPTY_RESERVATION_CREATE_FORM });
    setReservationCreateSubmitting(false);
    setReservationActionSubmittingId(null);
    setReservationPanelMessage(null);
    setReservationPanelError(null);
  }, [selectedMemberId]);

  function resetReservationWorkspace() {
    setReservationRowsByMemberId({});
    setReservationLoading(false);
    setReservationCreateForm({ ...EMPTY_RESERVATION_CREATE_FORM });
    setReservationCreateSubmitting(false);
    setReservationActionSubmittingId(null);
    setReservationPanelMessage(null);
    setReservationPanelError(null);
  }

  return {
    reservationRowsByMemberId,
    setReservationRowsByMemberId,
    reservationLoading,
    setReservationLoading,
    reservationCreateForm,
    setReservationCreateForm,
    reservationCreateSubmitting,
    setReservationCreateSubmitting,
    reservationActionSubmittingId,
    setReservationActionSubmittingId,
    reservationPanelMessage,
    setReservationPanelMessage,
    reservationPanelError,
    setReservationPanelError,
    resetReservationWorkspace
  };
}
