import { useCallback, useEffect, useMemo, useState } from "react";

import { formatDate } from "../../shared/format";
import { useDebouncedValue } from "../../shared/hooks/useDebouncedValue";
import { usePagination } from "../../shared/hooks/usePagination";
import { PaginationControls } from "../../shared/ui/PaginationControls";
import { todayLocalDate } from "../../shared/date";
import { useSelectedMemberMembershipsQuery } from "../member-context/modules/useSelectedMemberMembershipsQuery";
import { SelectedMemberContextBadge } from "../members/components/SelectedMemberContextBadge";
import { useSelectedMemberStore } from "../members/modules/SelectedMemberContext";
import type { ReservationRow } from "../members/modules/types";
import { isMembershipReservableOn } from "./modules/reservableMemberships";
import { useReservationSchedulesQuery } from "./modules/useReservationSchedulesQuery";
import { useReservationTargetsQuery } from "./modules/useReservationTargetsQuery";
import { useSelectedMemberReservationsState } from "./modules/useSelectedMemberReservationsState";
import { Modal } from "../../shared/ui/Modal";

import styles from "./ReservationsPage.module.css";

type ReservationCreateForm = {
  membershipId: string;
  scheduleId: string;
  memo: string;
};

function formatDateTime(value: string | null) {
  if (!value) {
    return "-";
  }
  return new Date(value).toLocaleString("ko-KR", {
    dateStyle: "short",
    timeStyle: "short"
  });
}

const statusMap: Record<string, { label: string; class: string }> = {
  "CONFIRMED": { label: "CONFIRMED", class: "pill ok" },
  "ATTENDED": { label: "ATTENDED", class: "pill info" },
  "CANCELLED": { label: "CANCELLED", class: "pill muted" },
  "NO_SHOW": { label: "NO-SHOW", class: "pill danger" }
};

export default function ReservationsPage() {
  const { selectedMember, selectedMemberId, selectMember, selectedMemberLoading } = useSelectedMemberStore();
  const {
    reservationTargets,
    reservationTargetsKeyword,
    setReservationTargetsKeyword,
    reservationTargetsLoading,
    reservationTargetsError,
    loadReservationTargets
  } = useReservationTargetsQuery();
  const debouncedReservationTargetsKeyword = useDebouncedValue(reservationTargetsKeyword, 250);
  const {
    selectedMemberMemberships,
    selectedMemberMembershipsLoading,
    selectedMemberMembershipsError,
    loadSelectedMemberMemberships,
    resetSelectedMemberMembershipsQuery
  } = useSelectedMemberMembershipsQuery();
  const {
    reservationSchedules,
    reservationSchedulesLoading,
    reservationSchedulesError,
    loadReservationSchedules,
    resetReservationSchedulesQuery
  } = useReservationSchedulesQuery();
  const {
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
  } = useSelectedMemberReservationsState();

  const [reservationCreateForm, setReservationCreateForm] = useState<ReservationCreateForm>({
    membershipId: "",
    scheduleId: "",
    memo: ""
  });
  const [reservationPanelMessage, setReservationPanelMessage] = useState<string | null>(null);
  const [reservationPanelError, setReservationPanelError] = useState<string | null>(null);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);

  const targetsPagination = usePagination(reservationTargets, {
    initialPageSize: 10,
    resetDeps: [reservationTargetsKeyword, reservationTargets.length]
  });
  const reservationsPagination = usePagination(selectedMemberReservations, {
    initialPageSize: 10,
    resetDeps: [selectedMemberId, selectedMemberReservations.length]
  });

  const businessDateText = todayLocalDate();
  const reservableMemberships = selectedMemberMemberships.filter((membership) =>
    isMembershipReservableOn(membership, businessDateText)
  );

  useEffect(() => {
    void loadReservationTargets(debouncedReservationTargetsKeyword);
  }, [debouncedReservationTargetsKeyword, loadReservationTargets]);

  useEffect(() => {
    void loadReservationSchedules();
    return () => {
      resetReservationSchedulesQuery();
    };
  }, [loadReservationSchedules, resetReservationSchedulesQuery]);

  useEffect(() => {
    if (selectedMemberId == null) {
      resetSelectedMemberMembershipsQuery();
      resetSelectedMemberReservationsState();
      setReservationCreateForm({ membershipId: "", scheduleId: "", memo: "" });
      setReservationPanelMessage(null);
      setReservationPanelError(null);
      return;
    }

    void loadSelectedMemberMemberships(selectedMemberId);
    void loadSelectedMemberReservations(selectedMemberId);
    setReservationCreateForm({ membershipId: "", scheduleId: "", memo: "" });
    setReservationPanelMessage(null);
    setReservationPanelError(null);
  }, [
    loadSelectedMemberMemberships,
    loadSelectedMemberReservations,
    resetSelectedMemberMembershipsQuery,
    resetSelectedMemberReservationsState,
    selectedMemberId
  ]);

  const clearPanelFeedback = useCallback(() => {
    setReservationPanelMessage(null);
    setReservationPanelError(null);
  }, []);

  const handleReservationCreateSubmit = async () => {
    clearPanelFeedback();

    if (!selectedMemberId) {
      setReservationPanelError("Member not selected.");
      return;
    }

    const membershipId = Number(reservationCreateForm.membershipId);
    const scheduleId = Number(reservationCreateForm.scheduleId);
    const membership = reservableMemberships.find((item) => item.membershipId === membershipId);
    const schedule = reservationSchedules.find((item) => item.scheduleId === scheduleId);

    if (!membership || !schedule) {
      setReservationPanelError("Missing membership or schedule selection.");
      return;
    }

    try {
      const reservation = await createReservation({
        memberId: selectedMemberId,
        membershipId,
        scheduleId,
        memo: reservationCreateForm.memo
      });
      await Promise.all([
        loadSelectedMemberReservations(selectedMemberId),
        loadSelectedMemberMemberships(selectedMemberId),
        loadReservationTargets(debouncedReservationTargetsKeyword)
      ]);
      setReservationCreateForm({ membershipId: "", scheduleId: "", memo: "" });
      setReservationPanelMessage(`Success: Reservation #${reservation.reservationId} created.`);
      setIsNewModalOpen(false);
    } catch (error) {
      setReservationPanelError(error instanceof Error ? error.message : "Failed to create reservation.");
    }
  };

  const mutateReservation = useCallback(async (
    reservationId: number,
    actionLabel: string,
    mutate: () => Promise<void>,
    canMutate: boolean,
    errorMessage: string
  ) => {
    clearPanelFeedback();
    if (!canMutate) {
      setReservationPanelError(errorMessage);
      return;
    }
    if (!selectedMemberId) return;

    try {
      await mutate();
      await Promise.all([
        loadSelectedMemberReservations(selectedMemberId),
        loadSelectedMemberMemberships(selectedMemberId),
        loadReservationTargets(debouncedReservationTargetsKeyword)
      ]);
      setReservationPanelMessage(`Success: ${actionLabel}`);
    } catch (error) {
      setReservationPanelError(error instanceof Error ? error.message : `${actionLabel} failed.`);
    }
  }, [
    clearPanelFeedback,
    debouncedReservationTargetsKeyword,
    loadReservationTargets,
    loadSelectedMemberMemberships,
    loadSelectedMemberReservations,
    selectedMemberId
  ]);

  return (
    <section className="ops-shell">
      <div className="ops-hero">
        <div className="ops-hero__copy">
          <span className="ops-eyebrow">Booking Surface</span>
          <h1 className="ops-title">Reservation Operations</h1>
          <p className="ops-subtitle">Select a member, inspect active bookings, and issue new reservations without leaving the operational workbench.</p>
          <div className="ops-meta">
            <span className="ops-meta__pill">Directory + workbench</span>
            <span className="ops-meta__pill">Membership aware</span>
            <span className="ops-meta__pill">Fast state actions</span>
          </div>
        </div>
      </div>

      <div className="ops-stat-strip">
        <div className="ops-stat-card">
          <span className="ops-stat-card__label">Reservation Targets</span>
          <span className="ops-stat-card__value">{reservationTargets.length}</span>
          <span className="ops-stat-card__hint">Members currently available in the reservation directory</span>
        </div>
        <div className="ops-stat-card">
          <span className="ops-stat-card__label">Focused Member</span>
          <span className="ops-stat-card__value">{selectedMember ? `#${selectedMember.memberId}` : "-"}</span>
          <span className="ops-stat-card__hint">{selectedMember?.memberName ?? "No member selected yet"}</span>
        </div>
        <div className="ops-stat-card">
          <span className="ops-stat-card__label">Current Bookings</span>
          <span className="ops-stat-card__value">{selectedMemberReservations.length}</span>
          <span className="ops-stat-card__hint">Rows loaded in the active workbench</span>
        </div>
      </div>

    <section className="ops-split-grid">
      
      {/* DIRECTORY PANEL */}
      <article className="panel-card">
        <div className="ops-section__header">
          <div>
            <h2 className="ops-section__title">Reservation Directory</h2>
            <p className="ops-section__subtitle">Find a member and pin them into the booking workbench.</p>
          </div>
        </div>

        <form
          className="context-fallback-toolbar"
          style={{ marginBottom: '24px' }}
          onSubmit={(event) => {
            event.preventDefault();
            void loadReservationTargets(reservationTargetsKeyword);
          }}
        >
          <label className="stack-sm">
            <span className="text-xs text-muted" style={{ fontWeight: 600 }}>Member Lookup</span>
            <input
              className="input"
              value={reservationTargetsKeyword}
              onChange={(event) => setReservationTargetsKeyword(event.target.value)}
              placeholder="Name or Phone..."
            />
          </label>
        </form>

        <div className="table-shell">
          <table className="members-table">
            <thead>
              <tr>
                <th>Member</th>
                <th style={{ textAlign: 'center' }}>Active</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {targetsPagination.pagedItems.length === 0 ? (
                <tr><td colSpan={3} className="empty-cell" style={{ padding: '32px' }}>No records found.</td></tr>
              ) : (
                targetsPagination.pagedItems.map((target) => (
                  <tr key={target.memberId} className={selectedMember?.memberId === target.memberId ? "is-selected-row" : undefined}>
                    <td>
                      <div className="stack-sm">
                        <span style={{ fontWeight: 600 }}>{target.memberName}</span>
                        <span className="text-xs text-muted">{target.phone}</span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="pill info" style={{ fontSize: '11px' }}>{target.confirmedReservationCount} Slots</span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className={selectedMember?.memberId === target.memberId ? "primary-button" : "secondary-button"}
                        style={{ padding: '6px 10px', fontSize: '12px' }}
                        disabled={selectedMemberLoading}
                        onClick={() => void selectMember(target.memberId)}
                      >
                        {selectedMember?.memberId === target.memberId ? "Active" : "Focus"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-md">
          <PaginationControls
            page={targetsPagination.page}
            totalPages={targetsPagination.totalPages}
            pageSize={targetsPagination.pageSize}
            pageSizeOptions={[10, 20]}
            totalItems={targetsPagination.totalItems}
            startItemIndex={targetsPagination.startItemIndex}
            endItemIndex={targetsPagination.endItemIndex}
            onPageChange={targetsPagination.setPage}
            onPageSizeChange={targetsPagination.setPageSize}
          />
        </div>
      </article>

      {/* WORKBENCH PANEL */}
      <article className="panel-card">
        <header className="panel-card-header mb-md">
          <div>
            <h2 className="brand-title" style={{ fontSize: '1.25rem' }}>Operational Workbench</h2>
            <p className="text-muted text-xs">Actions and histories for the focused member.</p>
          </div>
          {selectedMember && (
            <button 
              type="button" 
              className="primary-button"
              onClick={() => setIsNewModalOpen(true)}
            >
              New Booking
            </button>
          )}
        </header>

        {!selectedMember ? (
          <div className="ops-empty">
            Select a member from the directory to start reservation operations.
          </div>
        ) : (
          <div className="stack-lg">
            <SelectedMemberContextBadge />

            <section>
              <div className="ops-section__header">
                <div>
                  <h3 className="ops-section__title">Current Reservations</h3>
                  <p className="ops-section__subtitle">Confirmed, attended, cancelled, and no-show history for the focused member.</p>
                </div>
              </div>
              <div className="table-shell">
                <table className="members-table">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reservationsPagination.pagedItems.length === 0 ? (
                      <tr><td colSpan={3} className="empty-cell" style={{ padding: '32px' }}>No bookings on record.</td></tr>
                    ) : (
                      reservationsPagination.pagedItems.map((reservation) => {
                        const statusInfo = statusMap[reservation.reservationStatus] || { label: reservation.reservationStatus, class: 'pill muted' };
                        const canMutate = reservation.reservationStatus === "CONFIRMED";
                        const canCheckIn = canMutate && !reservation.checkedInAt;

                        return (
                          <tr key={reservation.reservationId}>
                            <td>
                              <div className="stack-sm">
                                <span className="text-sm" style={{ fontWeight: 600 }}>{formatDateTime(reservation.reservedAt)}</span>
                                <span className="text-xs text-muted">ID: #{reservation.reservationId}</span>
                              </div>
                            </td>
                            <td>
                              <span className={statusInfo.class}>{statusInfo.label}</span>
                            </td>
                            <td>
                              <div className="ops-table-actions">
                                <button 
                                  type="button" 
                                  className="secondary-button ops-action-button"
                                  disabled={!canCheckIn}
                                  onClick={() => mutateReservation(reservation.reservationId, "Checked-in", () => checkInReservation(selectedMemberId!, reservation.reservationId).then(()=>undefined), canCheckIn, "Already checked in or invalid status.")}
                                >
                                  CheckIn
                                </button>
                                <button 
                                  type="button" 
                                  className="secondary-button ops-action-button"
                                  disabled={!canMutate}
                                  onClick={() => mutateReservation(reservation.reservationId, "Marked Complete", () => completeReservation(selectedMemberId!, reservation.reservationId).then(()=>undefined), canMutate, "Only confirmed bookings can be completed.")}
                                >
                                  Done
                                </button>
                                <button 
                                  type="button" 
                                  className="secondary-button ops-action-button"
                                  style={{ color: 'var(--status-danger)' }}
                                  disabled={!canMutate}
                                  onClick={() => mutateReservation(reservation.reservationId, "Cancelled", () => cancelReservation(selectedMemberId!, reservation.reservationId).then(()=>undefined), canMutate, "Only confirmed bookings can be cancelled.")}
                                >
                                  Void
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}

        {(reservationPanelMessage || reservationPanelError) && (
          <div className="mt-md">
            {reservationPanelMessage && <div className="pill ok full-span" style={{ justifyContent: 'center' }}>{reservationPanelMessage}</div>}
            {reservationPanelError && <div className="pill danger full-span" style={{ justifyContent: 'center' }}>{reservationPanelError}</div>}
          </div>
        )}

        <Modal
          isOpen={isNewModalOpen}
          onClose={() => setIsNewModalOpen(false)}
          title="Create New Booking"
          footer={
            <>
              <button type="button" className="secondary-button" onClick={() => setIsNewModalOpen(false)}>Cancel</button>
              <button 
                type="button" 
                className="primary-button"
                disabled={!reservationCreateForm.membershipId || !reservationCreateForm.scheduleId}
                onClick={handleReservationCreateSubmit}
              >
                Confirm Booking
              </button>
            </>
          }
        >
          <div className="stack-md">
            <label className="stack-sm">
                <span className="text-sm">Target Membership</span>
                <select
                  className="input"
                  value={reservationCreateForm.membershipId}
                  onChange={(event) =>
                    setReservationCreateForm((prev) => ({ ...prev, membershipId: event.target.value }))
                  }
                >
                  <option value="">-- Select Valid Subscription --</option>
                  {reservableMemberships.map((membership) => (
                    <option key={membership.membershipId} value={membership.membershipId}>
                      #{membership.membershipId} · {membership.productNameSnapshot}
                    </option>
                  ))}
                </select>
                {reservableMemberships.length === 0 && (
                  <span className="text-xs text-danger">No valid memberships available for this member.</span>
                )}
              </label>
              
              <label className="stack-sm">
                <span className="text-sm">Available Slots</span>
                <select
                  className="input"
                  value={reservationCreateForm.scheduleId}
                  onChange={(event) =>
                    setReservationCreateForm((prev) => ({ ...prev, scheduleId: event.target.value }))
                  }
                >
                  <option value="">-- Choose Schedule --</option>
                  {reservationSchedules.map((schedule) => (
                    <option key={schedule.scheduleId} value={schedule.scheduleId}>
                      {schedule.slotTitle} ({schedule.trainerName}) · {formatDate(schedule.startAt)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="stack-sm">
                <span className="text-sm">Internal Note</span>
                <textarea
                  className="input"
                  style={{ minHeight: '80px', resize: 'vertical' }}
                  placeholder="Operational notes..."
                  value={reservationCreateForm.memo}
                  onChange={(event) => setReservationCreateForm((prev) => ({ ...prev, memo: event.target.value }))}
                />
              </label>
          </div>
        </Modal>
      </article>
    </section>
    </section>
  );
}
