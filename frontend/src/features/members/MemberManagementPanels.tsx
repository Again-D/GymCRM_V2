import type { Dispatch, FormEvent, SetStateAction } from "react";
import { EmptyTableRow } from "../../shared/ui/EmptyTableRow";
import { NoticeText } from "../../shared/ui/NoticeText";
import { OverlayPanel } from "../../shared/ui/OverlayPanel";
import { PanelHeader } from "../../shared/ui/PanelHeader";
import { formatDate } from "../../shared/utils/format";

type MemberSummaryRow = {
  memberId: number;
  memberName: string;
  phone: string;
  memberStatus: "ACTIVE" | "INACTIVE";
  joinDate: string | null;
  membershipOperationalStatus: "정상" | "만료임박" | "만료" | "없음";
  membershipExpiryDate: string | null;
  remainingPtCount: number | null;
};

type MemberFormFields = {
  memberName: string;
  phone: string;
  email: string;
  gender: "" | "MALE" | "FEMALE" | "OTHER";
  birthDate: string;
  memberStatus: "ACTIVE" | "INACTIVE";
  joinDate: string;
  consentSms: boolean;
  consentMarketing: boolean;
  memo: string;
};

type MemberManagementPanelsProps = {
  startCreateMember: () => void;
  memberSearchName: string;
  setMemberSearchName: (value: string) => void;
  memberSearchPhone: string;
  setMemberSearchPhone: (value: string) => void;
  loadMembers: (filters?: { name?: string; phone?: string }) => Promise<void>;
  membersLoading: boolean;
  memberPanelMessage: string | null;
  memberPanelError: string | null;
  members: MemberSummaryRow[];
  selectedMemberId: number | null;
  selectMember: (memberId: number) => Promise<void>;
  openMemberEditor: (memberId: number) => Promise<void>;
  openMembershipOperationsForMember: (memberId: number) => Promise<void>;
  openReservationManagementForMember: (memberId: number) => Promise<void>;
  memberFormMode: "create" | "edit";
  memberFormOpen: boolean;
  closeMemberForm: () => void;
  handleMemberSubmit: (event: FormEvent<HTMLFormElement>) => void;
  memberFormMessage: string | null;
  memberFormError: string | null;
  memberForm: MemberFormFields;
  setMemberForm: Dispatch<SetStateAction<MemberFormFields>>;
  memberFormSubmitting: boolean;
};

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3.2" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="m4 20 3.7-.8L19.3 7.6 16.4 4.7 4.8 16.3 4 20Z" />
      <path d="m14.9 6.2 2.9 2.9" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect x="4" y="5.5" width="16" height="14.5" rx="2" />
      <path d="M8 3.8v3.4M16 3.8v3.4M4 10h16" />
    </svg>
  );
}

function operationalStatusPillClass(status: MemberSummaryRow["membershipOperationalStatus"]) {
  if (status === "정상") {
    return "pill ok";
  }
  if (status === "만료임박") {
    return "pill warn";
  }
  if (status === "만료") {
    return "pill danger";
  }
  return "pill muted";
}

export function MemberManagementPanels({
  startCreateMember,
  memberSearchName,
  setMemberSearchName,
  memberSearchPhone,
  setMemberSearchPhone,
  loadMembers,
  membersLoading,
  memberPanelMessage,
  memberPanelError,
  members,
  selectedMemberId,
  selectMember,
  openMemberEditor,
  openMembershipOperationsForMember,
  openReservationManagementForMember,
  memberFormMode,
  memberFormOpen,
  closeMemberForm,
  handleMemberSubmit,
  memberFormMessage,
  memberFormError,
  memberForm,
  setMemberForm,
  memberFormSubmitting
}: MemberManagementPanelsProps) {
  return (
    <>
      <article className="panel member-management-panel">
        <PanelHeader
          title="회원 목록"
          actions={
            <button type="button" className="secondary-button" onClick={startCreateMember}>
              신규 등록
            </button>
          }
        />
        <form
          className="toolbar-grid members-toolbar-grid"
          onSubmit={(event) => {
            event.preventDefault();
            void loadMembers();
          }}
        >
          <label>
            이름 검색
            <input value={memberSearchName} onChange={(e) => setMemberSearchName(e.target.value)} />
          </label>
          <label>
            연락처 검색
            <input value={memberSearchPhone} onChange={(e) => setMemberSearchPhone(e.target.value)} />
          </label>
          <div className="toolbar-actions">
            <button type="submit" className="primary-button" disabled={membersLoading}>
              {membersLoading ? "조회 중..." : "조회"}
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                setMemberSearchName("");
                setMemberSearchPhone("");
                void loadMembers({ name: "", phone: "" });
              }}
            >
              초기화
            </button>
          </div>
        </form>

        {memberPanelMessage ? <NoticeText tone="success">{memberPanelMessage}</NoticeText> : null}
        {memberPanelError ? <NoticeText tone="error">{memberPanelError}</NoticeText> : null}

        <div className="list-shell">
          <table className="members-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>이름</th>
                <th>연락처</th>
                <th>상태</th>
                <th>회원권 상태</th>
                <th>회원권 만료일</th>
                <th>남은 PT 횟수</th>
                <th>가입일</th>
                <th>액션</th>
              </tr>
            </thead>
            <tbody>
              {members.length === 0 ? (
                <EmptyTableRow colSpan={9} message="조회된 회원이 없습니다." />
              ) : (
                members.map((member) => (
                  <tr
                    key={member.memberId}
                    className={`is-clickable-row${member.memberId === selectedMemberId ? " is-selected" : ""}`}
                    onClick={() => void selectMember(member.memberId)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        void selectMember(member.memberId);
                      }
                    }}
                    tabIndex={0}
                  >
                    <td>{member.memberId}</td>
                    <td>{member.memberName}</td>
                    <td>{member.phone}</td>
                    <td>
                      <span className={member.memberStatus === "ACTIVE" ? "pill ok" : "pill muted"}>
                        {member.memberStatus}
                      </span>
                    </td>
                    <td>
                      <span className={operationalStatusPillClass(member.membershipOperationalStatus)}>
                        {member.membershipOperationalStatus}
                      </span>
                    </td>
                    <td>{formatDate(member.membershipExpiryDate)}</td>
                    <td>{member.remainingPtCount != null && member.remainingPtCount > 0 ? member.remainingPtCount : "-"}</td>
                    <td>{formatDate(member.joinDate)}</td>
                    <td>
                      <div className="member-row-actions member-row-actions-icons">
                        <button
                          type="button"
                          className={`icon-action-button${member.memberId === selectedMemberId ? " is-active" : ""}`}
                          aria-label={`회원 #${member.memberId} 선택`}
                          title="회원 선택"
                          onClick={(event) => {
                            event.stopPropagation();
                            void selectMember(member.memberId);
                          }}
                        >
                          <EyeIcon />
                        </button>
                        <button
                          type="button"
                          className="icon-action-button"
                          aria-label={`회원 #${member.memberId} 수정`}
                          title="회원 수정"
                          onClick={(event) => {
                            event.stopPropagation();
                            void openMemberEditor(member.memberId);
                          }}
                        >
                          <PencilIcon />
                        </button>
                        <button
                          type="button"
                          className="icon-action-button"
                          aria-label={`회원 #${member.memberId} 예약 관리`}
                          title="예약 관리"
                          onClick={(event) => {
                            event.stopPropagation();
                            void openReservationManagementForMember(member.memberId);
                          }}
                        >
                          <CalendarIcon />
                        </button>
                        <button
                          type="button"
                          className="icon-action-button"
                          aria-label={`회원 #${member.memberId} 회원권 업무`}
                          title="회원권 업무"
                          onClick={(event) => {
                            event.stopPropagation();
                            void openMembershipOperationsForMember(member.memberId);
                          }}
                        >
                          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                            <path d="M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7Z" />
                            <path d="M4 9h16M9 13h6M9 16h3" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </article>

      <OverlayPanel
        open={memberFormOpen}
        title={memberFormMode === "create" ? "회원 등록" : `회원 수정 #${selectedMemberId ?? "-"}`}
        onClose={closeMemberForm}
      >
        <form className="form-grid" onSubmit={handleMemberSubmit}>
          {memberFormMessage ? (
            <NoticeText tone="success" fullRow>
              {memberFormMessage}
            </NoticeText>
          ) : null}
          {memberFormError ? (
            <NoticeText tone="error" fullRow>
              {memberFormError}
            </NoticeText>
          ) : null}
          <label>
            회원명 *
            <input
              required
              value={memberForm.memberName}
              onChange={(e) => setMemberForm((prev) => ({ ...prev, memberName: e.target.value }))}
            />
          </label>
          <label>
            연락처 *
            <input
              required
              placeholder="010-1234-5678"
              value={memberForm.phone}
              onChange={(e) => setMemberForm((prev) => ({ ...prev, phone: e.target.value }))}
            />
          </label>
          <label>
            이메일
            <input
              type="email"
              value={memberForm.email}
              onChange={(e) => setMemberForm((prev) => ({ ...prev, email: e.target.value }))}
            />
          </label>
          <label>
            성별
            <select
              value={memberForm.gender}
              onChange={(e) => setMemberForm((prev) => ({ ...prev, gender: e.target.value as MemberFormFields["gender"] }))}
            >
              <option value="">선택 안함</option>
              <option value="MALE">MALE</option>
              <option value="FEMALE">FEMALE</option>
              <option value="OTHER">OTHER</option>
            </select>
          </label>
          <label>
            생년월일
            <input
              type="date"
              value={memberForm.birthDate}
              onChange={(e) => setMemberForm((prev) => ({ ...prev, birthDate: e.target.value }))}
            />
          </label>
          <label>
            가입일
            <input
              type="date"
              value={memberForm.joinDate}
              onChange={(e) => setMemberForm((prev) => ({ ...prev, joinDate: e.target.value }))}
            />
          </label>
          <label>
            상태 *
            <select
              value={memberForm.memberStatus}
              onChange={(e) =>
                setMemberForm((prev) => ({ ...prev, memberStatus: e.target.value as "ACTIVE" | "INACTIVE" }))
              }
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
            </select>
          </label>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={memberForm.consentSms}
              onChange={(e) => setMemberForm((prev) => ({ ...prev, consentSms: e.target.checked }))}
            />
            SMS 수신 동의
          </label>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={memberForm.consentMarketing}
              onChange={(e) => setMemberForm((prev) => ({ ...prev, consentMarketing: e.target.checked }))}
            />
            마케팅 수신 동의
          </label>
          <label className="full-row">
            메모
            <textarea
              rows={3}
              value={memberForm.memo}
              onChange={(e) => setMemberForm((prev) => ({ ...prev, memo: e.target.value }))}
            />
          </label>
          <div className="form-actions full-row">
            <button type="submit" className="primary-button" disabled={memberFormSubmitting}>
              {memberFormSubmitting ? "저장 중..." : memberFormMode === "create" ? "회원 등록" : "회원 수정 저장"}
            </button>
          </div>
        </form>
      </OverlayPanel>
    </>
  );
}
