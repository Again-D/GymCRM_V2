import type { Dispatch, FormEvent, SetStateAction } from "react";
import { EmptyTableRow } from "../../shared/ui/EmptyTableRow";
import { NoticeText } from "../../shared/ui/NoticeText";
import { PanelHeader } from "../../shared/ui/PanelHeader";
import { PlaceholderCard } from "../../shared/ui/PlaceholderCard";
import { formatDate } from "../../shared/utils/format";

type MemberSummaryRow = {
  memberId: number;
  memberName: string;
  phone: string;
  memberStatus: "ACTIVE" | "INACTIVE";
  joinDate: string | null;
};

type MemberDetailView = {
  memberId: number;
  centerId: number;
  memberName: string;
  phone: string;
  email: string | null;
  gender: "MALE" | "FEMALE" | "OTHER" | null;
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
  loadMemberDetail: (memberId: number, options?: { syncForm?: boolean }) => Promise<void>;
  memberFormMode: "create" | "edit";
  handleMemberSubmit: (event: FormEvent<HTMLFormElement>) => void;
  memberFormMessage: string | null;
  memberFormError: string | null;
  memberForm: MemberFormFields;
  setMemberForm: Dispatch<SetStateAction<MemberFormFields>>;
  memberFormSubmitting: boolean;
  memberDetailLoading: boolean;
  selectedMember: MemberDetailView | null;
  selectedMemberMembershipsCount: number;
  selectedMemberPaymentsCount: number;
  onOpenMembershipsTab: () => void;
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
  loadMemberDetail,
  memberFormMode,
  handleMemberSubmit,
  memberFormMessage,
  memberFormError,
  memberForm,
  setMemberForm,
  memberFormSubmitting,
  memberDetailLoading,
  selectedMember,
  selectedMemberMembershipsCount,
  selectedMemberPaymentsCount,
  onOpenMembershipsTab
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
              </tr>
            </thead>
            <tbody>
              {members.length === 0 ? (
                <EmptyTableRow colSpan={5} message="조회된 회원이 없습니다." />
              ) : (
                members.map((member) => (
                  <tr
                    key={member.memberId}
                    className={member.memberId === selectedMemberId ? "is-selected" : ""}
                    onClick={() => void loadMemberDetail(member.memberId)}
                  >
                    <td>{member.memberId}</td>
                    <td>{member.memberName}</td>
                    <td>{member.phone}</td>
                    <td>
                      <span className={member.memberStatus === "ACTIVE" ? "pill ok" : "pill muted"}>
                        {member.memberStatus}
                      </span>
                    </td>
                    <td>{formatDate(member.joinDate)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </article>

      <article className="panel">
        <PanelHeader
          title={memberFormMode === "create" ? "회원 등록" : `회원 수정 #${selectedMemberId ?? "-"}`}
          actions={
            memberFormMode === "edit" ? (
              <button type="button" className="secondary-button" onClick={startCreateMember}>
                등록 모드로 전환
              </button>
            ) : undefined
          }
        />

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
      </article>

      <article className="panel wide-panel">
        <PanelHeader
          title="회원 상세"
          suffix={memberDetailLoading ? <span className="muted-text">불러오는 중...</span> : undefined}
        />
        {!selectedMember ? (
          <PlaceholderCard>
            <p>회원 목록에서 항목을 선택하면 상세 정보를 표시합니다.</p>
          </PlaceholderCard>
        ) : (
          <div className="detail-stack">
            <dl className="detail-grid">
              <div>
                <dt>회원 ID</dt>
                <dd>{selectedMember.memberId}</dd>
              </div>
              <div>
                <dt>센터 ID</dt>
                <dd>{selectedMember.centerId}</dd>
              </div>
              <div>
                <dt>회원명</dt>
                <dd>{selectedMember.memberName}</dd>
              </div>
              <div>
                <dt>연락처</dt>
                <dd>{selectedMember.phone}</dd>
              </div>
              <div>
                <dt>상태</dt>
                <dd>{selectedMember.memberStatus}</dd>
              </div>
              <div>
                <dt>가입일</dt>
                <dd>{formatDate(selectedMember.joinDate)}</dd>
              </div>
              <div>
                <dt>이메일</dt>
                <dd>{selectedMember.email ?? "-"}</dd>
              </div>
              <div>
                <dt>성별</dt>
                <dd>{selectedMember.gender ?? "-"}</dd>
              </div>
            </dl>

            <PlaceholderCard as="section">
              <h4>회원권 업무는 별도 탭으로 이동</h4>
              <p>구매/홀딩/해제/환불/결제이력은 사이드바의 `회원권 업무` 탭에서 처리합니다.</p>
              <div className="detail-grid compact-detail-grid">
                <div>
                  <dt>세션 회원권 수</dt>
                  <dd>{selectedMemberMembershipsCount}</dd>
                </div>
                <div>
                  <dt>세션 결제 이력 수</dt>
                  <dd>{selectedMemberPaymentsCount}</dd>
                </div>
              </div>
              <div className="form-actions">
                <button type="button" className="primary-button" onClick={onOpenMembershipsTab}>
                  회원권 업무 탭 열기
                </button>
              </div>
            </PlaceholderCard>
          </div>
        )}
      </article>
    </>
  );
}
