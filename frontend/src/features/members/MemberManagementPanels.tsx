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
  openMemberEditor: (memberId: number) => Promise<void>;
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
  openMemberEditor,
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
      <article className="panel">
        <PanelHeader
          title="회원 목록"
          actions={
            <button type="button" className="secondary-button" onClick={startCreateMember}>
              신규 등록
            </button>
          }
        />
        <form
          className="toolbar-grid"
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
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>이름</th>
                <th>연락처</th>
                <th>상태</th>
                <th>가입일</th>
                <th>액션</th>
              </tr>
            </thead>
            <tbody>
              {members.length === 0 ? (
                <EmptyTableRow colSpan={6} message="조회된 회원이 없습니다." />
              ) : (
                members.map((member) => (
                  <tr key={member.memberId} className={member.memberId === selectedMemberId ? "is-selected" : ""}>
                    <td>{member.memberId}</td>
                    <td>{member.memberName}</td>
                    <td>{member.phone}</td>
                    <td>
                      <span className={member.memberStatus === "ACTIVE" ? "pill ok" : "pill muted"}>
                        {member.memberStatus}
                      </span>
                    </td>
                    <td>{formatDate(member.joinDate)}</td>
                    <td>
                      <button type="button" className="secondary-button" onClick={() => void openMemberEditor(member.memberId)}>
                        편집
                      </button>
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
