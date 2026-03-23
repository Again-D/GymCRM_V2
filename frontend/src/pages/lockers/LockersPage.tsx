import { useEffect, useMemo, useState } from "react";

import { useAuthState } from "../../app/auth";
import { hasAnyRole } from "../../app/roles";
import { usePagination } from "../../shared/hooks/usePagination";
import { PaginationControls } from "../../shared/ui/PaginationControls";
import { SelectedMemberContextBadge } from "../members/components/SelectedMemberContextBadge";
import { useMembersQuery } from "../members/modules/useMembersQuery";
import { useSelectedMemberStore } from "../members/modules/SelectedMemberContext";
import { useLockerPrototypeState } from "./modules/useLockerPrototypeState";
import { useLockerQueries } from "./modules/useLockerQueries";
import { Modal } from "../../shared/ui/Modal";

import styles from "./LockersPage.module.css";

const statusMap: Record<string, { label: string; class: string }> = {
  "AVAILABLE": { label: "사용 가능", class: "pill ok" },
  "ASSIGNED": { label: "배정됨", class: "pill info" },
  "MAINTENANCE": { label: "점검 중", class: "pill danger" },
  "ACTIVE": { label: "사용 중", class: "pill ok" },
  "RETURNED": { label: "반납됨", class: "pill muted" }
};

export default function LockersPage() {
  const { authUser, isMockMode } = useAuthState();
  const { selectedMember, selectedMemberId } = useSelectedMemberStore();
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

  const {
    members,
    membersLoading,
    membersQueryError,
    loadMembers,
    resetMembersQuery
  } = useMembersQuery({
    getDefaultFilters: () => ({
      name: "",
      phone: "",
      memberStatus: "",
      membershipOperationalStatus: "",
      dateFrom: "",
      dateTo: ""
    })
  });

  const {
    lockerFilters,
    setLockerFilters,
    lockerAssignForm,
    setLockerAssignForm,
    lockerAssignSubmitting,
    lockerReturnSubmittingId,
    lockerPanelMessage,
    lockerPanelError,
    handleLockerAssign,
    handleLockerReturn
  } = useLockerPrototypeState(selectedMemberId);

  const {
    lockerSlots,
    lockerSlotsLoading,
    lockerAssignments,
    lockerAssignmentsLoading,
    lockerQueryError,
    reloadLockerData,
    resetLockerQueries
  } = useLockerQueries();

  const isLiveLockerRoleSupported =
    isMockMode || hasAnyRole(authUser, ["ROLE_CENTER_ADMIN", "ROLE_DESK"]);

  const slotsPagination = usePagination(lockerSlots, {
    initialPageSize: 10,
    resetDeps: [lockerSlots.length, lockerFilters.lockerStatus, lockerFilters.lockerZone]
  });
  const assignmentsPagination = usePagination(lockerAssignments, {
    initialPageSize: 10,
    resetDeps: [lockerAssignments.length]
  });

  const availableSlots = useMemo(
    () => lockerSlots.filter((slot) => slot.lockerStatus === "AVAILABLE"),
    [lockerSlots]
  );

  useEffect(() => {
    if (!isLiveLockerRoleSupported) {
      resetMembersQuery();
      return;
    }
    void loadMembers();
  }, [isLiveLockerRoleSupported, loadMembers, resetMembersQuery]);

  useEffect(() => {
    if (!isLiveLockerRoleSupported) {
      resetLockerQueries();
      return;
    }
    void reloadLockerData(lockerFilters);
    return () => {
      resetLockerQueries();
    };
  }, [isLiveLockerRoleSupported, lockerFilters, reloadLockerData, resetLockerQueries]);

  async function runLockerAssign() {
    const ok = await handleLockerAssign();
    if (ok) {
      await reloadLockerData(lockerFilters);
      setIsAssignModalOpen(false);
    }
  }

  async function runLockerReturn(lockerAssignmentId: number) {
    const ok = await handleLockerReturn(lockerAssignmentId);
    if (ok) {
      await reloadLockerData(lockerFilters);
    }
  }

  return (
    <section className="ops-shell">
      <div className="ops-hero">
        <div className="ops-hero__copy">
          <span className="ops-eyebrow">보관함 관리</span>
          <h1 className="ops-title">라커 관리</h1>
          <p className="ops-subtitle">라커 재고를 확인하고 현재 배정 현황을 점검하며 신규 배정을 처리할 수 있습니다.</p>
          <div className="ops-meta">
            <span className="ops-meta__pill">라커 재고</span>
            <span className="ops-meta__pill">배정 현황</span>
            <span className="ops-meta__pill">회원 연동 모달</span>
          </div>
        </div>
        <button 
          type="button" 
          className="primary-button" 
          onClick={() => setIsAssignModalOpen(true)}
          disabled={!isLiveLockerRoleSupported}
        >
          신규 배정
        </button>
      </div>

      <div className="ops-stat-strip">
        <div className="ops-stat-card">
          <span className="ops-stat-card__label">전체 라커</span>
          <span className="ops-stat-card__value">{lockerSlots.length}</span>
          <span className="ops-stat-card__hint">시스템에 등록된 전체 라커 수</span>
        </div>
        <div className="ops-stat-card">
          <span className="ops-stat-card__label">사용 가능</span>
          <span className={`ops-stat-card__value ${styles.ok}`}>{availableSlots.length}</span>
          <span className="ops-stat-card__hint">즉시 배정 가능한 공여 라커 수</span>
        </div>
        <div className="ops-stat-card">
          <span className="ops-stat-card__label">현재 배정</span>
          <span className={`ops-stat-card__value ${styles.info}`}>
            {lockerAssignments.filter(a => a.assignmentStatus === 'ACTIVE').length}
          </span>
          <span className="ops-stat-card__hint">실제 사용 중인 활성 배정 건수</span>
        </div>
        <div className="ops-stat-card">
          <span className="ops-stat-card__label">시스템 권한</span>
          <span className="ops-stat-card__value">{isLiveLockerRoleSupported ? "풀 액서스" : "조회 전용"}</span>
          <span className="ops-stat-card__hint">{isLiveLockerRoleSupported ? "배정 및 반납 처리가 가능합니다." : "작업 권한이 제한된 상태입니다."}</span>
        </div>
      </div>
      
      <section className="ops-surface-grid">
      <article className="panel-card">
        <div className="ops-section__header">
          <div>
            <h2 className="ops-section__title">라커 목록</h2>
            <p className="ops-section__subtitle">가용 라커와 구역 정보를 확인하고 배정 작업을 준비합니다.</p>
          </div>
        </div>

        <div className={`members-filter-grid ${styles.filterHeader}`}>
          <label className="stack-sm">
            <span className="text-xs text-muted brand-title">상태 필터</span>
            <select
              className="input"
              value={lockerFilters.lockerStatus}
              disabled={!isLiveLockerRoleSupported}
              onChange={(event) =>
                setLockerFilters((prev) => ({ ...prev, lockerStatus: event.target.value as typeof prev.lockerStatus }))
              }
            >
              <option value="">전체 상태</option>
              <option value="AVAILABLE">사용 가능</option>
              <option value="ASSIGNED">배정됨</option>
              <option value="MAINTENANCE">점검 중</option>
            </select>
          </label>
          <label className="stack-sm">
            <span className="text-xs text-muted brand-title">구역 검색</span>
            <input
              className="input"
              value={lockerFilters.lockerZone}
              disabled={!isLiveLockerRoleSupported}
              onChange={(event) => setLockerFilters((prev) => ({ ...prev, lockerZone: event.target.value }))}
              placeholder="예: A구역"
            />
          </label>
        </div>

        {!isLiveLockerRoleSupported && (
          <div className="field-ops-note field-ops-note--restricted mb-md">
            <span className="field-ops-note__label">운영 권한 제한</span>
            <div className="text-sm brand-title mt-xs">현재 관리자 권한이 없어 라커 배정 및 수정 작업을 실행할 수 없습니다.</div>
            <div className="mt-xs text-sm">데모 세션 또는 실제 관리자 세션으로의 전환이 필요합니다.</div>
          </div>
        )}

        {(lockerPanelMessage || lockerPanelError || lockerQueryError) && (
          <div className="ops-feedback-stack mb-md">
            {lockerPanelMessage && <div className="pill ok full-span">{lockerPanelMessage}</div>}
            {(lockerPanelError || lockerQueryError) && <div className="pill danger full-span">{lockerPanelError ?? lockerQueryError}</div>}
          </div>
        )}

        <div className="table-shell">
          <table className="members-table">
            <thead>
              <tr>
                <th>라커</th>
                <th>등급</th>
                <th>상태</th>
                <th className="ops-right">메모</th>
              </tr>
            </thead>
            <tbody>
              {slotsPagination.pagedItems.map((slot: any) => {
                const status = statusMap[slot.lockerStatus] || { label: slot.lockerStatus, class: 'pill muted' };
                return (
                  <tr key={slot.lockerSlotId}>
                    <td>
                      <div className="stack-sm">
                        <span className="text-sm brand-title">{slot.lockerCode}</span>
                        <span className="text-xs text-muted">구역: {slot.lockerZone ?? "-"}</span>
                      </div>
                    </td>
                    <td><span className="text-xs">{slot.lockerGrade ?? "-"}</span></td>
                    <td><span className={status.class}>{status.label}</span></td>
                    <td className="ops-right"><span className="text-xs text-muted">{slot.memo ?? "-"}</span></td>
                  </tr>
                );
              })}
              {slotsPagination.pagedItems.length === 0 && (
                <tr>
                  <td colSpan={4} className="empty-cell">
                    {lockerSlotsLoading ? "라커 목록 불러오는 중..." : "조건에 맞는 라커가 없습니다."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-md">
          <PaginationControls {...slotsPagination} pageSizeOptions={[10, 20]} onPageChange={slotsPagination.setPage} onPageSizeChange={slotsPagination.setPageSize} />
        </div>
      </article>

      {/* ASSIGNMENTS PANEL */}
      <article className="stack-lg">
        
        <section className="panel-card">
          <div className="ops-section__header">
            <div>
              <h2 className="ops-section__title">현재 배정 현황</h2>
              <p className="ops-section__subtitle">사용 중인 라커와 기간, 반납 처리 가능 상태를 확인합니다.</p>
            </div>
          </div>

          <div className="table-shell">
            <table className="members-table">
              <thead>
                <tr>
                  <th>라커 / 회원</th>
                  <th>사용 기간</th>
                  <th className="ops-right">액션</th>
                </tr>
              </thead>
              <tbody>
                {assignmentsPagination.pagedItems.map((assignment: any) => {
                   const status = statusMap[assignment.assignmentStatus] || { label: assignment.assignmentStatus, class: 'pill muted' };
                   const isActive = assignment.assignmentStatus === "ACTIVE";
                   return (
                    <tr key={assignment.lockerAssignmentId}>
                      <td>
                        <div className="stack-sm">
                          <span className="text-sm brand-title">{assignment.lockerCode}</span>
                          <span className="text-xs text-muted">{assignment.memberName} (#{assignment.memberId})</span>
                        </div>
                      </td>
                      <td>
                        <div className="stack-sm">
                          <span className="text-xs brand-title">{assignment.startDate}</span>
                          <span className="text-xs text-muted">to {assignment.endDate}</span>
                        </div>
                      </td>
                      <td className="ops-right">
                        {isActive ? (
                           <button
                             type="button"
                             className={`secondary-button ops-action-button ${styles.danger}`}
                             disabled={lockerReturnSubmittingId === assignment.lockerAssignmentId || !isLiveLockerRoleSupported}
                             onClick={() => void runLockerReturn(assignment.lockerAssignmentId)}
                           >
                             {lockerReturnSubmittingId === assignment.lockerAssignmentId ? "반납 처리 중..." : "반납"}
                           </button>
                        ) : (
                          <span className={status.class}>{status.label}</span>
                        )}
                      </td>
                    </tr>
                   );
                })}
                {assignmentsPagination.pagedItems.length === 0 && (
                  <tr>
                    <td colSpan={3} className="empty-cell">
                      {lockerAssignmentsLoading ? "배정 내역 불러오는 중..." : "현재 배정 내역이 없습니다."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="mt-md">
            <PaginationControls {...assignmentsPagination} pageSizeOptions={[10, 20]} onPageChange={assignmentsPagination.setPage} onPageSizeChange={assignmentsPagination.setPageSize} />
          </div>
        </section>

        {!isLiveLockerRoleSupported && (
          <div className="field-ops-note field-ops-note--restricted">
            <span className="field-ops-note__label">정보 접근 제한</span>
            <div className="text-sm brand-title mt-xs">배정 및 반납 변경 기능이 잠겨 있습니다.</div>
            <div className="mt-xs text-sm">운영 로그 조회는 가능하나 실제 데이터 변경은 상위 권한이 필요합니다.</div>
          </div>
        )}
      </article>

      {/* ASSIGNMENT MODAL */}
      <Modal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        title="라커 배정 등록"
        footer={
          <>
            <button className="secondary-button" onClick={() => setIsAssignModalOpen(false)}>취소</button>
            <button 
              className="primary-button" 
              onClick={() => void runLockerAssign()}
              disabled={lockerAssignSubmitting || !lockerAssignForm.lockerSlotId || !lockerAssignForm.memberId}
            >
              {lockerAssignSubmitting ? "처리 중..." : "배정 확정"}
            </button>
          </>
        }
      >
        <div className="stack-md">
          <SelectedMemberContextBadge />
          
          <div className="ops-field-grid-2">
            <label className="stack-sm">
              <span className="text-sm">대상 라커</span>
              <select
                className="input"
                name="lockerSlotId"
                value={lockerAssignForm.lockerSlotId}
                onChange={(event) => setLockerAssignForm(prev => ({ ...prev, lockerSlotId: event.target.value }))}
              >
                <option value="">-- 사용 가능한 라커 선택 --</option>
                {availableSlots.map(slot => (
                  <option key={slot.lockerSlotId} value={slot.lockerSlotId}>{slot.lockerCode} ({slot.lockerZone})</option>
                ))}
              </select>
            </label>

            <label className="stack-sm">
              <span className="text-sm">회원 선택</span>
              <select
                className="input"
                name="memberId"
                value={lockerAssignForm.memberId}
                onChange={(event) => setLockerAssignForm(prev => ({ ...prev, memberId: event.target.value }))}
              >
                <option value="">-- 회원 선택 --</option>
                {members.map(m => (
                  <option key={m.memberId} value={m.memberId}>{m.memberName} (#{m.memberId})</option>
                ))}
              </select>
            </label>
          </div>

          <div className="ops-field-grid-2">
            <label className="stack-sm">
              <span className="text-sm">시작일</span>
              <input
                className="input"
                type="date"
                value={lockerAssignForm.startDate}
                onChange={(event) => setLockerAssignForm(prev => ({ ...prev, startDate: event.target.value }))}
              />
            </label>
            <label className="stack-sm">
              <span className="text-sm">종료일</span>
              <input
                className="input"
                type="date"
                value={lockerAssignForm.endDate}
                onChange={(event) => setLockerAssignForm(prev => ({ ...prev, endDate: event.target.value }))}
              />
            </label>
          </div>

          <label className="stack-sm">
            <span className="text-sm">운영 메모</span>
            <textarea
              className={`input ${styles.memoArea}`}
              value={lockerAssignForm.memo}
              onChange={(event) => setLockerAssignForm(prev => ({ ...prev, memo: event.target.value }))}
              placeholder="배정 관련 메모를 입력하세요"
            />
          </label>
        </div>
      </Modal>

      </section>
    </section>
  );
}
