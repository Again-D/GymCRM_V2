import { useEffect, useState } from "react";

import styles from "../MemberList.module.css";
import { useNavigate } from "react-router-dom";

import { formatDate } from "../../../shared/format";
import { usePagination } from "../../../shared/hooks/usePagination";
import { Modal } from "../../../shared/ui/Modal";
import { PaginationControls } from "../../../shared/ui/PaginationControls";
import { MembershipPeriodFilter } from "./MembershipPeriodFilter";
import { SelectedMemberContextBadge } from "./SelectedMemberContextBadge";
import { SelectedMemberSummaryCard } from "./SelectedMemberSummaryCard";
import { useMembershipDateFilter } from "../modules/useMembershipDateFilter";
import { useMemberManagementState } from "../modules/useMemberManagementState";
import { useMembersQuery } from "../modules/useMembersQuery";
import { useSelectedMemberStore } from "../modules/SelectedMemberContext";

function operationalStatusClass(status: "정상" | "홀딩중" | "만료임박" | "만료" | "없음") {
  if (status === "정상") return "pill ok";
  if (status === "홀딩중") return "pill hold";
  if (status === "만료임박") return "pill warn";
  if (status === "만료") return "pill danger";
  return "pill muted";
}

export function MemberListSection() {
  const navigate = useNavigate();
  const { dateFilter, applyPreset, setDateFrom, setDateTo, reset } = useMembershipDateFilter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [membershipOperationalStatus, setMembershipOperationalStatus] = useState("");
  const { selectedMemberId, selectedMember, selectedMemberLoading, clearSelectedMember, selectMember } = useSelectedMemberStore();
  const {
    modalState,
    memberForm,
    setMemberForm,
    memberFormSubmitting,
    memberFormError,
    memberFormMessage,
    canManageMembers,
    closeMemberModal,
    startCreateMember,
    openMemberDetail,
    openMemberEdit,
    openMemberDeactivate,
    submitMemberForm,
    deactivateMember
  } = useMemberManagementState({
    selectedMemberId,
    selectMember
  });
  const { members, membersLoading, membersQueryError, loadMembers } = useMembersQuery({
    getDefaultFilters: () => ({
      name,
      phone,
      membershipOperationalStatus,
      dateFrom: dateFilter.dateFrom,
      dateTo: dateFilter.dateTo
    })
  });

  const pagination = usePagination(members, {
    initialPageSize: 20,
    resetDeps: [name, phone, membershipOperationalStatus, dateFilter.presetRange, dateFilter.dateFrom, dateFilter.dateTo, members.length]
  });

  useEffect(() => {
    void loadMembers();
  }, [loadMembers]);

  useEffect(() => {
    if (!selectedMemberId && !selectedMemberLoading && modalState.kind === "detail") {
      closeMemberModal();
    }
  }, [closeMemberModal, modalState.kind, selectedMemberId, selectedMemberLoading]);

  async function openSelectedMemberSummary(memberId: number) {
    const loaded = await selectMember(memberId);
    if (loaded) {
      openMemberDetail(memberId);
    }
  }

  async function goToMemberContext(path: "/memberships" | "/reservations", memberId: number) {
    const loaded = await selectMember(memberId);
    if (loaded) {
      navigate(path);
    }
  }

  function goToSelectedMemberContext(path: "/memberships" | "/reservations") {
    if (!selectedMemberId) {
      return;
    }
    closeMemberModal();
    navigate(path);
  }

  async function runMemberSubmit() {
    await submitMemberForm();
  }

  async function runDeactivateMember() {
    if (modalState.kind !== "deactivate") {
      return;
    }
    await deactivateMember(modalState.memberId);
  }

  const formTitle = modalState.kind === "create" ? "신규 회원 등록" : modalState.kind === "edit" ? `회원 #${modalState.memberId} 수정` : "회원 수정";

  return (
    <section className="ops-shell">
      <article className="panel-card">
        <div className="ops-hero">
          <div className="ops-hero__copy">
            <span className="ops-eyebrow">운영 디렉터리</span>
            <h1 className="ops-title">회원 디렉터리</h1>
            <p className="ops-subtitle">회원 상태를 빠르게 확인하고, 선택한 회원을 다른 업무 화면으로 자연스럽게 넘길 수 있습니다.</p>
            <div className="ops-meta">
              <span className="ops-meta__pill">목록 중심</span>
              <span className="ops-meta__pill">업무 간 컨텍스트 연동</span>
              <span className="ops-meta__pill">데스크 + 현장 대응</span>
            </div>
          </div>
          {canManageMembers ? (
            <button type="button" className="primary-button" onClick={startCreateMember}>
              회원 등록
            </button>
          ) : null}
        </div>

        <div className="ops-stat-strip">
          <div className="ops-stat-card">
            <span className="ops-stat-card__label">현재 조회 결과</span>
            <span className="ops-stat-card__value">{members.length}</span>
            <span className="ops-stat-card__hint">현재 필터 기준으로 불러온 회원 수입니다.</span>
          </div>
          <div className="ops-stat-card">
            <span className="ops-stat-card__label">선택된 컨텍스트</span>
            <span className="ops-stat-card__value">{selectedMemberId ?? "-"}</span>
            <span className="ops-stat-card__hint">{selectedMemberId ? "다음 업무 화면으로 이어집니다." : "선택된 회원이 없습니다."}</span>
          </div>
        </div>

        <div className={styles.selectedContextRow}>
          <SelectedMemberContextBadge />
          <div className={styles.selectedContextActions}>
            <span className={styles.selectedContextHint}>
              {selectedMemberId ? "선택된 회원 정보를 모달에서 확인할 수 있습니다." : "회원을 선택하면 상세 정보 모달이 열립니다."}
            </span>
            <button
              type="button"
              className="secondary-button"
              disabled={!selectedMemberId}
              onClick={() => {
                if (selectedMemberId) {
                  openMemberDetail(selectedMemberId);
                }
              }}
            >
              선택 정보 보기
            </button>
          </div>
        </div>

        <form
          className="members-filter-grid"
          onSubmit={(event) => {
            event.preventDefault();
            void loadMembers();
          }}
        >
          <label>
            <span className="text-sm">회원명</span>
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="이름 검색" />
          </label>
          <label>
            <span className="text-sm">연락처</span>
            <input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="010-..." />
          </label>
          <label>
            <span className="text-sm">회원권 상태</span>
            <select value={membershipOperationalStatus} onChange={(event) => setMembershipOperationalStatus(event.target.value)}>
              <option value="">전체 상태</option>
              <option value="정상">정상</option>
              <option value="홀딩중">홀딩중</option>
              <option value="만료임박">만료임박</option>
              <option value="만료">만료</option>
              <option value="없음">회원권 없음</option>
            </select>
          </label>
          <MembershipPeriodFilter
            value={dateFilter}
            onPresetChange={applyPreset}
            onDateFromChange={setDateFrom}
            onDateToChange={setDateTo}
          />
          <div className="toolbar-actions full-span mt-sm">
            <button type="submit" className="primary-button" disabled={membersLoading}>
              {membersLoading ? "불러오는 중..." : "조회"}
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                setName("");
                setPhone("");
                setMembershipOperationalStatus("");
                reset();
                void loadMembers({
                  name: "",
                  phone: "",
                  membershipOperationalStatus: "",
                  dateFrom: "",
                  dateTo: ""
                });
              }}
            >
              초기화
            </button>
          </div>
        </form>

        {membersQueryError ? <div className="pill danger mt-md">{membersQueryError}</div> : null}

        <section className="ops-section mt-lg">
          <div className="ops-section__header">
            <div>
              <h2 className="ops-section__title">회원 작업 화면</h2>
              <p className="ops-section__subtitle">회원을 선택하거나 바로 회원권/예약 업무로 이동할 수 있습니다.</p>
            </div>
          </div>
        <div className="table-shell">
          <table className="members-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>이름</th>
                <th>연락처</th>
                <th>상태</th>
                <th>운영 상태</th>
                <th>만료일</th>
                <th>PT 잔여</th>
                <th>가입일</th>
                <th className="ops-right">액션</th>
              </tr>
            </thead>
            <tbody>
              {pagination.pagedItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="empty-cell">
                    조건에 맞는 회원이 없습니다.
                  </td>
                </tr>
              ) : (
                pagination.pagedItems.map((member) => (
                  <tr key={member.memberId} className={member.memberId === selectedMemberId ? "is-selected-row" : undefined} onClick={() => void openSelectedMemberSummary(member.memberId)}>
                    <td><strong>{member.memberId}</strong></td>
                    <td>{member.memberName}</td>
                    <td className="text-muted">{member.phone}</td>
                    <td>
                      <span className={member.memberStatus === "ACTIVE" ? "pill ok" : "pill muted"}>
                        {member.memberStatus === "ACTIVE" ? "활성" : "비활성"}
                      </span>
                    </td>
                    <td>
                      <span className={operationalStatusClass(member.membershipOperationalStatus)}>
                        {member.membershipOperationalStatus}
                      </span>
                    </td>
                    <td>{formatDate(member.membershipExpiryDate)}</td>
                    <td><strong>{member.remainingPtCount != null && member.remainingPtCount > 0 ? member.remainingPtCount : "-"}</strong></td>
                    <td className="text-muted">{formatDate(member.joinDate)}</td>
                    <td>
                      <div className="ops-table-actions">
                        <button
                          type="button"
                          className="secondary-button ops-action-button"
                          onClick={(event) => {
                            event.stopPropagation();
                            void goToMemberContext("/memberships", member.memberId);
                          }}
                        >
                          회원권
                        </button>
                        <button
                          type="button"
                          className="secondary-button ops-action-button"
                          onClick={(event) => {
                            event.stopPropagation();
                            void goToMemberContext("/reservations", member.memberId);
                          }}
                        >
                          예약
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        </section>

        <div className="mt-lg">
          <PaginationControls
            page={pagination.page}
            totalPages={pagination.totalPages}
            pageSize={pagination.pageSize}
            pageSizeOptions={[20, 50, 100]}
            totalItems={pagination.totalItems}
            startItemIndex={pagination.startItemIndex}
            endItemIndex={pagination.endItemIndex}
            onPageChange={pagination.setPage}
            onPageSizeChange={pagination.setPageSize}
          />
        </div>
      </article>

      <Modal
        isOpen={modalState.kind === "detail"}
        onClose={closeMemberModal}
        title={selectedMember ? `${selectedMember.memberName} 회원 정보` : "선택 회원 정보"}
        size="lg"
        footer={(
          <>
            <button type="button" className="secondary-button" onClick={closeMemberModal}>
              닫기
            </button>
            {selectedMemberId ? (
              <>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    clearSelectedMember();
                    closeMemberModal();
                  }}
                >
                  선택 해제
                </button>
                {canManageMembers && selectedMember ? (
                  <>
                    <button type="button" className="secondary-button" onClick={() => openMemberEdit(selectedMember)}>
                      수정
                    </button>
                    <button
                      type="button"
                      className={`secondary-button ${styles.dangerAction}`}
                      onClick={() => openMemberDeactivate(selectedMemberId)}
                    >
                      비활성화
                    </button>
                  </>
                ) : null}
                <button type="button" className="secondary-button" onClick={() => goToSelectedMemberContext("/memberships")}>
                  회원권
                </button>
                <button type="button" className="primary-button" onClick={() => goToSelectedMemberContext("/reservations")}>
                  예약
                </button>
              </>
            ) : null}
          </>
        )}
      >
        <SelectedMemberSummaryCard surface="plain" />
      </Modal>

      <Modal
        isOpen={modalState.kind === "create" || modalState.kind === "edit"}
        onClose={closeMemberModal}
        title={formTitle}
        size="lg"
        footer={(
          <>
            <button type="button" className="secondary-button" onClick={closeMemberModal} disabled={memberFormSubmitting}>
              닫기
            </button>
            <button type="button" className="primary-button" onClick={() => void runMemberSubmit()} disabled={memberFormSubmitting}>
              {memberFormSubmitting ? "저장 중..." : "저장"}
            </button>
          </>
        )}
      >
        <div className={styles.modalFormGrid}>
          {(memberFormMessage || memberFormError) ? (
            <div className="ops-feedback-stack full-span">
              {memberFormMessage ? <div className="pill ok full-span">{memberFormMessage}</div> : null}
              {memberFormError ? <div className="pill danger full-span">{memberFormError}</div> : null}
            </div>
          ) : null}
          <label className={styles.modalField}>
            <span className="text-sm">회원명</span>
            <input
              autoFocus
              value={memberForm.memberName}
              onChange={(event) => setMemberForm((current) => ({ ...current, memberName: event.target.value }))}
              placeholder="회원 이름"
            />
          </label>
          <label className={styles.modalField}>
            <span className="text-sm">연락처</span>
            <input
              value={memberForm.phone}
              onChange={(event) => setMemberForm((current) => ({ ...current, phone: event.target.value }))}
              placeholder="010-1234-5678"
            />
          </label>
          <label className={styles.modalField}>
            <span className="text-sm">이메일</span>
            <input
              value={memberForm.email}
              onChange={(event) => setMemberForm((current) => ({ ...current, email: event.target.value }))}
              placeholder="선택 입력"
            />
          </label>
          <label className={styles.modalField}>
            <span className="text-sm">성별</span>
            <select
              value={memberForm.gender}
              onChange={(event) =>
                setMemberForm((current) => ({
                  ...current,
                  gender: event.target.value as typeof current.gender
                }))
              }
            >
              <option value="">선택 안 함</option>
              <option value="MALE">남성</option>
              <option value="FEMALE">여성</option>
              <option value="OTHER">기타</option>
            </select>
          </label>
          <label className={styles.modalField}>
            <span className="text-sm">생년월일</span>
            <input
              type="date"
              value={memberForm.birthDate}
              onChange={(event) => setMemberForm((current) => ({ ...current, birthDate: event.target.value }))}
            />
          </label>
          <label className={styles.modalField}>
            <span className="text-sm">가입일</span>
            <input
              type="date"
              value={memberForm.joinDate}
              onChange={(event) => setMemberForm((current) => ({ ...current, joinDate: event.target.value }))}
            />
          </label>
          <div className={`${styles.modalField} ${styles.modalFieldFull}`}>
            <span className="text-sm">수신 동의</span>
            <div className={styles.modalCheckboxRow}>
              <label className={styles.modalCheckbox}>
                <input
                  type="checkbox"
                  checked={memberForm.consentSms}
                  onChange={(event) => setMemberForm((current) => ({ ...current, consentSms: event.target.checked }))}
                />
                SMS 수신 동의
              </label>
              <label className={styles.modalCheckbox}>
                <input
                  type="checkbox"
                  checked={memberForm.consentMarketing}
                  onChange={(event) =>
                    setMemberForm((current) => ({
                      ...current,
                      consentMarketing: event.target.checked
                    }))
                  }
                />
                마케팅 수신 동의
              </label>
            </div>
          </div>
          <label className={`${styles.modalField} ${styles.modalFieldFull}`}>
            <span className="text-sm">메모</span>
            <textarea
              rows={4}
              value={memberForm.memo}
              onChange={(event) => setMemberForm((current) => ({ ...current, memo: event.target.value }))}
              placeholder="회원 메모를 남길 수 있습니다."
            />
          </label>
        </div>
      </Modal>

      <Modal
        isOpen={modalState.kind === "deactivate"}
        onClose={closeMemberModal}
        title={selectedMember ? `${selectedMember.memberName} 비활성화` : "회원 비활성화"}
        size="md"
        footer={(
          <>
            <button type="button" className="secondary-button" onClick={closeMemberModal} disabled={memberFormSubmitting}>
              취소
            </button>
            <button type="button" className="primary-button" onClick={() => void runDeactivateMember()} disabled={memberFormSubmitting}>
              {memberFormSubmitting ? "처리 중..." : "비활성화"}
            </button>
          </>
        )}
      >
        {(memberFormMessage || memberFormError) ? (
          <div className="ops-feedback-stack mb-md">
            {memberFormMessage ? <div className="pill ok full-span">{memberFormMessage}</div> : null}
            {memberFormError ? <div className="pill danger full-span">{memberFormError}</div> : null}
          </div>
        ) : null}
        <div className="stack-sm">
          <p className="brand-title text-sm">선택한 회원을 삭제하지 않고 비활성 상태로 전환합니다.</p>
          <p className="text-sm text-muted">
            비활성 회원은 목록에 계속 남고, 운영 상태는 유지되지만 신규 업무 진입 전 상태 확인이 필요합니다.
          </p>
          <div className="field-ops-note field-ops-note--restricted">
            <span className="field-ops-note__label">확인 필요</span>
            <div className="mt-xs text-sm">
              {selectedMember ? `${selectedMember.memberName} (#${selectedMember.memberId}) 회원을 비활성화합니다.` : "이 회원을 비활성화합니다."}
            </div>
          </div>
        </div>
      </Modal>
    </section>
  );
}
