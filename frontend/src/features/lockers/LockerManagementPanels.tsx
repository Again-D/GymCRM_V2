import type { Dispatch, FormEvent, SetStateAction } from "react";
import { EmptyTableRow } from "../../shared/ui/EmptyTableRow";
import { NoticeText } from "../../shared/ui/NoticeText";
import { PanelHeader } from "../../shared/ui/PanelHeader";
import { formatCurrency, formatDate, formatDateTime } from "../../shared/utils/format";

type LockerStatus = "AVAILABLE" | "ASSIGNED" | "MAINTENANCE";

type LockerFiltersState = {
  lockerStatus: "" | LockerStatus;
  lockerZone: string;
};

type LockerSlotRow = {
  lockerSlotId: number;
  centerId: number;
  lockerCode: string;
  lockerZone: string | null;
  lockerGrade: string | null;
  lockerStatus: LockerStatus;
  memo: string | null;
  createdAt: string;
  updatedAt: string;
};

type LockerAssignmentRow = {
  lockerAssignmentId: number;
  centerId: number;
  lockerSlotId: number;
  memberId: number;
  assignmentStatus: "ACTIVE" | "RETURNED";
  assignedAt: string;
  startDate: string;
  endDate: string;
  returnedAt: string | null;
  refundAmount: number | null;
  returnReason: string | null;
  memo: string | null;
  createdAt: string;
  updatedAt: string;
};

type MemberOption = {
  memberId: number;
  memberName: string;
  phone: string;
};

type LockerAssignFormFields = {
  lockerSlotId: string;
  memberId: string;
  startDate: string;
  endDate: string;
  memo: string;
};

type LockerManagementPanelsProps = {
  lockerFilters: LockerFiltersState;
  setLockerFilters: Dispatch<SetStateAction<LockerFiltersState>>;
  loadLockerSlots: (filters?: LockerFiltersState) => Promise<void>;
  lockerSlotsLoading: boolean;
  lockerSlots: LockerSlotRow[];
  lockerAssignmentsLoading: boolean;
  lockerAssignments: LockerAssignmentRow[];
  lockerAssignForm: LockerAssignFormFields;
  setLockerAssignForm: Dispatch<SetStateAction<LockerAssignFormFields>>;
  handleLockerAssignSubmit: (event: FormEvent<HTMLFormElement>) => void;
  lockerAssignSubmitting: boolean;
  lockerReturnSubmittingId: number | null;
  handleLockerReturn: (lockerAssignmentId: number) => Promise<void>;
  lockerPanelMessage: string | null;
  lockerPanelError: string | null;
  members: MemberOption[];
};

export function LockerManagementPanels({
  lockerFilters,
  setLockerFilters,
  loadLockerSlots,
  lockerSlotsLoading,
  lockerSlots,
  lockerAssignmentsLoading,
  lockerAssignments,
  lockerAssignForm,
  setLockerAssignForm,
  handleLockerAssignSubmit,
  lockerAssignSubmitting,
  lockerReturnSubmittingId,
  handleLockerReturn,
  lockerPanelMessage,
  lockerPanelError,
  members
}: LockerManagementPanelsProps) {
  const availableSlots = lockerSlots.filter((slot) => slot.lockerStatus === "AVAILABLE");
  const activeAssignments = lockerAssignments.filter((assignment) => assignment.assignmentStatus === "ACTIVE");

  return (
    <>
      <article className="panel">
        <PanelHeader title="라커 슬롯 조회" />
        <form
          className="toolbar-grid products-toolbar-grid"
          onSubmit={(event) => {
            event.preventDefault();
            void loadLockerSlots();
          }}
        >
          <label>
            상태
            <select
              value={lockerFilters.lockerStatus}
              onChange={(event) =>
                setLockerFilters((prev) => ({
                  ...prev,
                  lockerStatus: event.target.value as LockerFiltersState["lockerStatus"]
                }))
              }
            >
              <option value="">전체</option>
              <option value="AVAILABLE">AVAILABLE</option>
              <option value="ASSIGNED">ASSIGNED</option>
              <option value="MAINTENANCE">MAINTENANCE</option>
            </select>
          </label>
          <label>
            구역
            <input
              value={lockerFilters.lockerZone}
              onChange={(event) => setLockerFilters((prev) => ({ ...prev, lockerZone: event.target.value }))}
              placeholder="예: A"
            />
          </label>
          <div className="toolbar-actions">
            <button type="submit" className="primary-button" disabled={lockerSlotsLoading}>
              {lockerSlotsLoading ? "조회 중..." : "조회"}
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                const emptyFilters: LockerFiltersState = { lockerStatus: "", lockerZone: "" };
                setLockerFilters(emptyFilters);
                void loadLockerSlots(emptyFilters);
              }}
            >
              초기화
            </button>
          </div>
        </form>

        {lockerPanelMessage ? <NoticeText tone="success">{lockerPanelMessage}</NoticeText> : null}
        {lockerPanelError ? <NoticeText tone="error">{lockerPanelError}</NoticeText> : null}

        <div className="list-shell deferred-list-surface">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>코드</th>
                <th>구역</th>
                <th>등급</th>
                <th>상태</th>
                <th>메모</th>
                <th>수정시각</th>
              </tr>
            </thead>
            <tbody>
              {lockerSlots.length === 0 ? (
                <EmptyTableRow colSpan={7} message={lockerSlotsLoading ? "로딩 중..." : "조회된 라커 슬롯이 없습니다."} />
              ) : (
                lockerSlots.map((slot) => (
                  <tr key={slot.lockerSlotId}>
                    <td>{slot.lockerSlotId}</td>
                    <td>{slot.lockerCode}</td>
                    <td>{slot.lockerZone ?? "-"}</td>
                    <td>{slot.lockerGrade ?? "-"}</td>
                    <td>
                      <span className={slot.lockerStatus === "AVAILABLE" ? "pill ok" : "pill muted"}>{slot.lockerStatus}</span>
                    </td>
                    <td>{slot.memo ?? "-"}</td>
                    <td>{formatDateTime(slot.updatedAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </article>

      <article className="panel">
        <PanelHeader title="라커 배정" />
        <form className="form-grid" onSubmit={handleLockerAssignSubmit}>
          <label>
            라커 슬롯 *
            <select
              value={lockerAssignForm.lockerSlotId}
              onChange={(event) => setLockerAssignForm((prev) => ({ ...prev, lockerSlotId: event.target.value }))}
              required
            >
              <option value="">선택</option>
              {availableSlots.map((slot) => (
                <option key={slot.lockerSlotId} value={slot.lockerSlotId}>
                  #{slot.lockerSlotId} {slot.lockerCode} ({slot.lockerZone ?? "-"})
                </option>
              ))}
            </select>
          </label>

          <label>
            회원 *
            <select
              value={lockerAssignForm.memberId}
              onChange={(event) => setLockerAssignForm((prev) => ({ ...prev, memberId: event.target.value }))}
              required
            >
              <option value="">선택</option>
              {members.map((member) => (
                <option key={member.memberId} value={member.memberId}>
                  #{member.memberId} {member.memberName} ({member.phone})
                </option>
              ))}
            </select>
          </label>

          <label>
            시작일 *
            <input
              type="date"
              value={lockerAssignForm.startDate}
              onChange={(event) => setLockerAssignForm((prev) => ({ ...prev, startDate: event.target.value }))}
              required
            />
          </label>

          <label>
            종료일 *
            <input
              type="date"
              value={lockerAssignForm.endDate}
              onChange={(event) => setLockerAssignForm((prev) => ({ ...prev, endDate: event.target.value }))}
              required
            />
          </label>

          <label className="full-row">
            메모
            <input
              value={lockerAssignForm.memo}
              onChange={(event) => setLockerAssignForm((prev) => ({ ...prev, memo: event.target.value }))}
              placeholder="예: 3개월 계약"
            />
          </label>

          <div className="form-actions full-row">
            <button type="submit" className="primary-button" disabled={lockerAssignSubmitting}>
              {lockerAssignSubmitting ? "배정 처리 중..." : "라커 배정"}
            </button>
            <span className="muted-text">가능 슬롯: {availableSlots.length}건</span>
          </div>
        </form>
      </article>

      <article className="panel">
        <PanelHeader title="활성 배정 목록" />
        <div className="list-shell deferred-list-surface">
          <table>
            <thead>
              <tr>
                <th>배정ID</th>
                <th>슬롯ID</th>
                <th>회원ID</th>
                <th>시작일</th>
                <th>종료일</th>
                <th>배정시각</th>
                <th>메모</th>
                <th>반납</th>
              </tr>
            </thead>
            <tbody>
              {activeAssignments.length === 0 ? (
                <EmptyTableRow
                  colSpan={8}
                  message={lockerAssignmentsLoading ? "로딩 중..." : "활성 배정 건이 없습니다."}
                />
              ) : (
                activeAssignments.map((assignment) => (
                  <tr key={assignment.lockerAssignmentId}>
                    <td>{assignment.lockerAssignmentId}</td>
                    <td>{assignment.lockerSlotId}</td>
                    <td>{assignment.memberId}</td>
                    <td>{formatDate(assignment.startDate)}</td>
                    <td>{formatDate(assignment.endDate)}</td>
                    <td>{formatDateTime(assignment.assignedAt)}</td>
                    <td>{assignment.memo ?? "-"}</td>
                    <td>
                      <button
                        type="button"
                        className="secondary-button"
                        disabled={lockerReturnSubmittingId === assignment.lockerAssignmentId}
                        onClick={() => void handleLockerReturn(assignment.lockerAssignmentId)}
                      >
                        {lockerReturnSubmittingId === assignment.lockerAssignmentId ? "반납 중..." : "반납"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </article>

      <article className="panel">
        <PanelHeader title="최근 반납 이력" />
        <div className="list-shell deferred-list-surface">
          <table>
            <thead>
              <tr>
                <th>배정ID</th>
                <th>회원ID</th>
                <th>반납시각</th>
                <th>환불금액</th>
                <th>반납사유</th>
              </tr>
            </thead>
            <tbody>
              {lockerAssignments.filter((assignment) => assignment.assignmentStatus === "RETURNED").length === 0 ? (
                <EmptyTableRow colSpan={5} message="반납 이력이 없습니다." />
              ) : (
                lockerAssignments
                  .filter((assignment) => assignment.assignmentStatus === "RETURNED")
                  .slice(0, 10)
                  .map((assignment) => (
                    <tr key={assignment.lockerAssignmentId}>
                      <td>{assignment.lockerAssignmentId}</td>
                      <td>{assignment.memberId}</td>
                      <td>{assignment.returnedAt ? formatDateTime(assignment.returnedAt) : "-"}</td>
                      <td>{assignment.refundAmount == null ? "-" : formatCurrency(assignment.refundAmount)}</td>
                      <td>{assignment.returnReason ?? "-"}</td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </article>
    </>
  );
}
