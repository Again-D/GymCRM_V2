import { useEffect, useMemo } from "react";

import { useAuthState } from "../../app/auth";
import { usePagination } from "../../shared/hooks/usePagination";
import { PaginationControls } from "../../shared/ui/PaginationControls";
import { SelectedMemberContextBadge } from "../members/components/SelectedMemberContextBadge";
import { useMembersQuery } from "../members/modules/useMembersQuery";
import { useSelectedMemberStore } from "../members/modules/SelectedMemberContext";
import { useLockerPrototypeState } from "./modules/useLockerPrototypeState";
import { useLockerQueries } from "./modules/useLockerQueries";
import { EmptyState } from "../../shared/ui/EmptyState";
import { SkeletonLoader } from "../../shared/ui/SkeletonLoader";

import styles from "./LockersPage.module.css";

export default function LockersPage() {
  const { authUser, isMockMode } = useAuthState();
  const { selectedMember, selectedMemberId } = useSelectedMemberStore();
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
    loadLockerSlots,
    loadLockerAssignments,
    reloadLockerData,
    resetLockerQueries
  } = useLockerQueries();
  const isLiveLockerRoleSupported =
    isMockMode || authUser?.role === "ROLE_CENTER_ADMIN" || authUser?.role === "ROLE_DESK";

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
    }
  }

  async function runLockerReturn(lockerAssignmentId: number) {
    const ok = await handleLockerReturn(lockerAssignmentId);
    if (ok) {
      await reloadLockerData(lockerFilters);
    }
  }

  return (
    <section className={styles["members-prototype-layout"]}>
      <article className="panel-card">
        <div className="panel-card-header">
          <div>
            <h1>라커 관리 프로토타입</h1>
            <p>global read surface는 그대로 유지하고, selected member는 라커 배정 form의 optional prefill로만 사용합니다.</p>
          </div>
        </div>

        {!isLiveLockerRoleSupported ? (
          <div className="selected-member-card mb-md">
            <div className="selected-member-card-header">
              <div>
                <h2>이 역할은 live 라커 관리 미지원</h2>
                <p>현재 live backend는 라커 조회/배정/반납 API를 관리자 또는 데스크 계정에만 열어두고 있습니다.</p>
              </div>
            </div>
          </div>
        ) : null}

        <SelectedMemberContextBadge />

        <div className="selected-member-card mb-md">
          <div className="selected-member-card-header">
            <div>
              <h2>선택 회원 컨텍스트</h2>
              <p>
                {selectedMember
                  ? `현재 배정 form에 #${selectedMember.memberId} ${selectedMember.memberName} 이(가) 기본 선택됩니다.`
                  : "선택 회원이 없어도 라커 슬롯 조회와 배정 목록은 그대로 사용할 수 있습니다."}
              </p>
            </div>
          </div>
        </div>

        <div className="selected-member-card mb-md">
          <h2>라커 슬롯 조회</h2>
          <div className={styles["members-filter-grid"]}>
            <label>
              상태
              <select
                value={lockerFilters.lockerStatus}
                disabled={!isLiveLockerRoleSupported}
                onChange={(event) =>
                  setLockerFilters((prev) => ({ ...prev, lockerStatus: event.target.value as typeof prev.lockerStatus }))
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
                disabled={!isLiveLockerRoleSupported}
                onChange={(event) => setLockerFilters((prev) => ({ ...prev, lockerZone: event.target.value }))}
                placeholder="예: A"
              />
            </label>
          </div>

          {lockerPanelMessage ? <p>{lockerPanelMessage}</p> : null}
          {lockerPanelError || lockerQueryError ? <p className="error-text">{lockerPanelError ?? lockerQueryError}</p> : null}

          <div className={styles["table-shell"]}>
            <table className="members-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>코드</th>
                  <th>구역</th>
                  <th>등급</th>
                  <th>상태</th>
                  <th>메모</th>
                </tr>
              </thead>
              <tbody>
                {slotsPagination.pagedItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className={styles["empty-cell"]}>
                      {!isLiveLockerRoleSupported
                        ? "현재 역할에서는 live 라커 슬롯을 조회할 수 없습니다."
                        : lockerSlotsLoading
                          ? "라커 슬롯을 불러오는 중..."
                          : "조회된 라커 슬롯이 없습니다."}
                    </td>
                  </tr>
                ) : (
                  slotsPagination.pagedItems.map((slot: any) => (
                    <tr key={slot.lockerSlotId}>
                      <td>{slot.lockerSlotId}</td>
                      <td>{slot.lockerCode}</td>
                      <td>{slot.lockerZone ?? "-"}</td>
                      <td>{slot.lockerGrade ?? "-"}</td>
                      <td>
                        <span className={slot.lockerStatus === "AVAILABLE" ? "pill ok" : "pill muted"}>{slot.lockerStatus}</span>
                      </td>
                      <td>{slot.memo ?? "-"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <PaginationControls
            page={slotsPagination.page}
            totalPages={slotsPagination.totalPages}
            pageSize={slotsPagination.pageSize}
            pageSizeOptions={[10, 20]}
            totalItems={slotsPagination.totalItems}
            startItemIndex={slotsPagination.startItemIndex}
            endItemIndex={slotsPagination.endItemIndex}
            onPageChange={slotsPagination.setPage}
            onPageSizeChange={slotsPagination.setPageSize}
          />
        </div>

        <div className="selected-member-card">
          <h2>라커 배정</h2>
          <div className={styles["members-filter-grid"]}>
            <label>
              라커 슬롯
              <select
                value={lockerAssignForm.lockerSlotId}
                disabled={!isLiveLockerRoleSupported}
                onChange={(event) => setLockerAssignForm((prev) => ({ ...prev, lockerSlotId: event.target.value }))}
              >
                <option value="">선택</option>
                {availableSlots.map((slot) => (
                  <option key={slot.lockerSlotId} value={slot.lockerSlotId}>
                    {slot.lockerCode} ({slot.lockerZone ?? "-"})
                  </option>
                ))}
              </select>
            </label>

            <label>
              회원
              <select
                value={lockerAssignForm.memberId}
                disabled={!isLiveLockerRoleSupported}
                onChange={(event) => setLockerAssignForm((prev) => ({ ...prev, memberId: event.target.value }))}
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
              시작일
              <input
                type="date"
                value={lockerAssignForm.startDate}
                disabled={!isLiveLockerRoleSupported}
                onChange={(event) => setLockerAssignForm((prev) => ({ ...prev, startDate: event.target.value }))}
              />
            </label>

            <label>
              종료일
              <input
                type="date"
                value={lockerAssignForm.endDate}
                disabled={!isLiveLockerRoleSupported}
                onChange={(event) => setLockerAssignForm((prev) => ({ ...prev, endDate: event.target.value }))}
              />
            </label>
          </div>

          <label className="stack-sm mt-md">
            메모
            <input
              value={lockerAssignForm.memo}
              disabled={!isLiveLockerRoleSupported}
              onChange={(event) => setLockerAssignForm((prev) => ({ ...prev, memo: event.target.value }))}
              placeholder="예: 1개월 계약"
            />
          </label>

          <div className={`${styles["toolbar-actions"]} mt-md`}>
            <button
              type="button"
              className="primary-button"
              disabled={lockerAssignSubmitting || !isLiveLockerRoleSupported}
              onClick={() => void runLockerAssign()}
            >
              {lockerAssignSubmitting ? "배정 중..." : "라커 배정"}
            </button>
            <span>
              {!isLiveLockerRoleSupported ? "현재 역할에서는 live 라커 배정이 비활성화됩니다." : membersLoading ? "회원 목록 로딩 중..." : `배정 가능한 슬롯 ${availableSlots.length}건`}
            </span>
          </div>
          {membersQueryError ? <p className="error-text">{membersQueryError}</p> : null}
        </div>
      </article>

      <aside className={`selected-member-card ${styles["panel-stack"]}`}>
        <section>
          <h2>배정 목록</h2>
          <div className="table-shell">
            <table className="members-table">
              <thead>
                <tr>
                  <th>배정ID</th>
                  <th>라커</th>
                  <th>회원</th>
                  <th>상태</th>
                  <th>시작일</th>
                  <th>종료일</th>
                  <th>액션</th>
                </tr>
              </thead>
              <tbody>
                {assignmentsPagination.pagedItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className={styles["empty-cell"]}>
                      {!isLiveLockerRoleSupported
                        ? "현재 역할에서는 live 라커 배정 목록을 조회할 수 없습니다."
                        : lockerAssignmentsLoading
                          ? <SkeletonLoader type="rectangular" height={40} />
                          : <EmptyState message="라커 배정 이력이 없습니다." />}
                    </td>
                  </tr>
                ) : (
                  assignmentsPagination.pagedItems.map((assignment: any) => (
                    <tr key={assignment.lockerAssignmentId}>
                      <td>{assignment.lockerAssignmentId}</td>
                      <td>{assignment.lockerCode}</td>
                      <td>
                        #{assignment.memberId} {assignment.memberName}
                      </td>
                      <td>{assignment.assignmentStatus}</td>
                      <td>{assignment.startDate}</td>
                      <td>{assignment.endDate}</td>
                      <td>
                        {assignment.assignmentStatus === "ACTIVE" ? (
                          <button
                            type="button"
                            className="secondary-button"
                            disabled={lockerReturnSubmittingId === assignment.lockerAssignmentId || !isLiveLockerRoleSupported}
                            onClick={() => void runLockerReturn(assignment.lockerAssignmentId)}
                          >
                            {lockerReturnSubmittingId === assignment.lockerAssignmentId ? "반납 중..." : "반납"}
                          </button>
                        ) : (
                          "-"
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <PaginationControls
            page={assignmentsPagination.page}
            totalPages={assignmentsPagination.totalPages}
            pageSize={assignmentsPagination.pageSize}
            pageSizeOptions={[10, 20]}
            totalItems={assignmentsPagination.totalItems}
            startItemIndex={assignmentsPagination.startItemIndex}
            endItemIndex={assignmentsPagination.endItemIndex}
            onPageChange={assignmentsPagination.setPage}
            onPageSizeChange={assignmentsPagination.setPageSize}
          />
        </section>
      </aside>
    </section>
  );
}
