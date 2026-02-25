import type { Dispatch, FormEvent, SetStateAction } from "react";
import { EmptyTableRow } from "../../shared/ui/EmptyTableRow";
import { InlineHelpText } from "../../shared/ui/InlineHelpText";
import { NoticeText } from "../../shared/ui/NoticeText";
import { PanelHeader } from "../../shared/ui/PanelHeader";
import { formatDateTime } from "../../shared/utils/format";

type ReservableMembershipRow = {
  membershipId: number;
  productNameSnapshot: string;
  productTypeSnapshot: "DURATION" | "COUNT";
  remainingCount: number | null;
  endDate: string | null;
};

type ReservationScheduleRow = {
  scheduleId: number;
  scheduleType: "PT" | "GX";
  trainerName: string;
  slotTitle: string;
  startAt: string;
  endAt: string;
  capacity: number;
  currentCount: number;
};

type ReservationRow = {
  reservationId: number;
  membershipId: number;
  scheduleId: number;
  reservationStatus: "CONFIRMED" | "CANCELLED" | "COMPLETED" | "NO_SHOW";
  reservedAt: string;
  cancelledAt: string | null;
  completedAt: string | null;
  noShowAt: string | null;
  checkedInAt: string | null;
};

type ReservationCreateFormFields = {
  scheduleId: string;
  membershipId: string;
  memo: string;
};

type ReservationManagementPanelsProps = {
  reservationSchedulesLoading: boolean;
  handleReservationCreateSubmit: (event: FormEvent<HTMLFormElement>) => void;
  reservationCreateForm: ReservationCreateFormFields;
  setReservationCreateForm: Dispatch<SetStateAction<ReservationCreateFormFields>>;
  reservableMemberships: ReservableMembershipRow[];
  reservationSchedules: ReservationScheduleRow[];
  reservationCreateSubmitting: boolean;
  loadReservationSchedules: () => Promise<void>;
  selectedMemberId: number | null;
  loadReservationsForMember: (memberId: number) => Promise<void>;
  reservationLoading: boolean;
  selectedMemberReservations: ReservationRow[];
  reservationActionSubmittingId: number | null;
  handleReservationCheckIn: (reservationId: number) => Promise<void>;
  handleReservationComplete: (reservationId: number) => Promise<void>;
  handleReservationCancel: (reservationId: number) => Promise<void>;
  handleReservationNoShow: (reservationId: number) => Promise<void>;
};

export function ReservationManagementPanels({
  reservationSchedulesLoading,
  handleReservationCreateSubmit,
  reservationCreateForm,
  setReservationCreateForm,
  reservableMemberships,
  reservationSchedules,
  reservationCreateSubmitting,
  loadReservationSchedules,
  selectedMemberId,
  loadReservationsForMember,
  reservationLoading,
  selectedMemberReservations,
  reservationActionSubmittingId,
  handleReservationCheckIn,
  handleReservationComplete,
  handleReservationCancel,
  handleReservationNoShow
}: ReservationManagementPanelsProps) {
  return (
    <>
      <article className="panel">
        <PanelHeader
          title="예약 생성"
          suffix={reservationSchedulesLoading ? <span className="muted-text">스케줄 로딩 중...</span> : undefined}
        />
        <form className="form-grid" onSubmit={handleReservationCreateSubmit}>
          <label>
            사용할 회원권 *
            <select
              value={reservationCreateForm.membershipId}
              onChange={(e) => setReservationCreateForm((prev) => ({ ...prev, membershipId: e.target.value }))}
            >
              <option value="">선택하세요</option>
              {reservableMemberships.map((membership) => (
                <option key={membership.membershipId} value={membership.membershipId}>
                  #{membership.membershipId} · {membership.productNameSnapshot} ({membership.productTypeSnapshot})
                  {membership.productTypeSnapshot === "COUNT"
                    ? ` · 잔여 ${membership.remainingCount ?? 0}`
                    : membership.endDate
                      ? ` · 만료 ${membership.endDate}`
                      : ""}
                </option>
              ))}
            </select>
          </label>
          <label>
            예약 스케줄 *
            <select
              value={reservationCreateForm.scheduleId}
              onChange={(e) => setReservationCreateForm((prev) => ({ ...prev, scheduleId: e.target.value }))}
            >
              <option value="">선택하세요</option>
              {reservationSchedules.map((schedule) => (
                <option key={schedule.scheduleId} value={schedule.scheduleId}>
                  #{schedule.scheduleId} · [{schedule.scheduleType}] {schedule.slotTitle} · {schedule.trainerName} ·{" "}
                  {formatDateTime(schedule.startAt)} ({schedule.currentCount}/{schedule.capacity})
                </option>
              ))}
            </select>
          </label>
          <label className="full-row">
            메모(선택)
            <textarea
              rows={2}
              value={reservationCreateForm.memo}
              onChange={(e) => setReservationCreateForm((prev) => ({ ...prev, memo: e.target.value }))}
            />
          </label>
          <div className="form-actions full-row">
            <button
              type="submit"
              className="primary-button"
              disabled={
                reservationCreateSubmitting || !reservationCreateForm.membershipId || !reservationCreateForm.scheduleId
              }
            >
              {reservationCreateSubmitting ? "예약 생성 중..." : "예약 생성"}
            </button>
          </div>
        </form>
        {reservableMemberships.length === 0 ? (
          <NoticeText compact>예약에 사용할 ACTIVE 회원권(세션 기준)이 없습니다.</NoticeText>
        ) : null}
      </article>

      <article className="panel">
        <PanelHeader
          title="예약 스케줄 목록"
          actions={
            <button
              type="button"
              className="secondary-button"
              onClick={() => void loadReservationSchedules()}
              disabled={reservationSchedulesLoading}
            >
              {reservationSchedulesLoading ? "새로고침 중..." : "새로고침"}
            </button>
          }
        />
        <div className="list-shell">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>유형</th>
                <th>타이틀</th>
                <th>트레이너</th>
                <th>시작</th>
                <th>종료</th>
                <th>정원</th>
              </tr>
            </thead>
            <tbody>
              {reservationSchedules.length === 0 ? (
                <EmptyTableRow colSpan={7} message="예약 스케줄이 없습니다." />
              ) : (
                reservationSchedules.map((schedule) => (
                  <tr key={schedule.scheduleId}>
                    <td>{schedule.scheduleId}</td>
                    <td>{schedule.scheduleType}</td>
                    <td>{schedule.slotTitle}</td>
                    <td>{schedule.trainerName}</td>
                    <td>{formatDateTime(schedule.startAt)}</td>
                    <td>{formatDateTime(schedule.endAt)}</td>
                    <td>
                      {schedule.currentCount}/{schedule.capacity}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </article>

      <article className="panel">
        <PanelHeader
          title="선택 회원 예약 목록"
          actions={
            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                if (selectedMemberId != null) {
                  void loadReservationsForMember(selectedMemberId);
                }
              }}
              disabled={reservationLoading || selectedMemberId == null}
            >
              {reservationLoading ? "조회 중..." : "새로고침"}
            </button>
          }
        />
        <div className="list-shell">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>스케줄ID</th>
                <th>회원권ID</th>
                <th>상태</th>
                <th>예약시각</th>
                <th>체크인시각</th>
                <th>취소시각</th>
                <th>완료시각</th>
                <th>노쇼시각</th>
                <th>액션</th>
              </tr>
            </thead>
            <tbody>
              {selectedMemberReservations.length === 0 ? (
                <EmptyTableRow colSpan={10} message="선택 회원의 예약 이력이 없습니다." />
              ) : (
                selectedMemberReservations.map((reservation) => {
                  const isPendingAction = reservationActionSubmittingId === reservation.reservationId;
                  const canMutate = reservation.reservationStatus === "CONFIRMED";
                  const schedule = reservationSchedules.find((item) => item.scheduleId === reservation.scheduleId);
                  const nowMs = Date.now();
                  const scheduleEndMs = schedule ? Date.parse(schedule.endAt) : Number.NaN;
                  const canNoShowByTime = Number.isFinite(scheduleEndMs) && scheduleEndMs <= nowMs;
                  const canCheckIn = canMutate && !reservation.checkedInAt;
                  const canNoShow = canMutate && !reservation.checkedInAt && canNoShowByTime;

                  return (
                    <tr key={reservation.reservationId}>
                      <td>{reservation.reservationId}</td>
                      <td>{reservation.scheduleId}</td>
                      <td>{reservation.membershipId}</td>
                      <td>{reservation.reservationStatus}</td>
                      <td>{formatDateTime(reservation.reservedAt)}</td>
                      <td>{formatDateTime(reservation.checkedInAt)}</td>
                      <td>{formatDateTime(reservation.cancelledAt)}</td>
                      <td>{formatDateTime(reservation.completedAt)}</td>
                      <td>{formatDateTime(reservation.noShowAt)}</td>
                      <td>
                        <div className="inline-actions">
                          <button
                            type="button"
                            className="secondary-button"
                            disabled={!canCheckIn || isPendingAction}
                            onClick={() => void handleReservationCheckIn(reservation.reservationId)}
                            title={
                              reservation.checkedInAt
                                ? "이미 체크인 처리됨"
                                : reservation.reservationStatus !== "CONFIRMED"
                                  ? "CONFIRMED 예약만 체크인 가능"
                                  : undefined
                            }
                          >
                            {isPendingAction ? "처리 중..." : "체크인"}
                          </button>
                          <button
                            type="button"
                            className="secondary-button"
                            disabled={!canMutate || isPendingAction}
                            onClick={() => void handleReservationComplete(reservation.reservationId)}
                          >
                            {isPendingAction ? "처리 중..." : "완료"}
                          </button>
                          <button
                            type="button"
                            className="secondary-button"
                            disabled={!canMutate || isPendingAction}
                            onClick={() => void handleReservationCancel(reservation.reservationId)}
                          >
                            취소
                          </button>
                          <button
                            type="button"
                            className="secondary-button"
                            disabled={!canNoShow || isPendingAction}
                            onClick={() => void handleReservationNoShow(reservation.reservationId)}
                            title={
                              reservation.checkedInAt
                                ? "체크인된 예약은 노쇼 처리 불가"
                                : reservation.reservationStatus !== "CONFIRMED"
                                  ? "CONFIRMED 예약만 노쇼 처리 가능"
                                  : !canNoShowByTime
                                    ? "수업 종료 시간 이후에만 노쇼 처리 가능"
                                    : undefined
                            }
                          >
                            {isPendingAction ? "처리 중..." : "노쇼"}
                          </button>
                        </div>
                        {reservation.checkedInAt ? (
                          <InlineHelpText>체크인됨: 노쇼 처리 불가</InlineHelpText>
                        ) : null}
                        {canMutate && !canNoShowByTime ? (
                          <InlineHelpText>노쇼는 종료 후 가능</InlineHelpText>
                        ) : null}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </article>
    </>
  );
}
