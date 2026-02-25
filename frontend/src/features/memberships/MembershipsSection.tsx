import type { ReactNode } from "react";
import { NoticeText } from "../../shared/ui/NoticeText";
import { PanelHeader } from "../../shared/ui/PanelHeader";
import { PlaceholderCard } from "../../shared/ui/PlaceholderCard";

type SelectedMemberSummary = {
  memberId: number;
  memberName: string;
  phone: string;
  memberStatus: string;
};

type MembershipsSectionProps = {
  selectedMember: SelectedMemberSummary | null;
  onGoMembers: () => void;
  children: ReactNode;
};

export function MembershipsSection({ selectedMember, onGoMembers, children }: MembershipsSectionProps) {
  return (
    <section className="membership-ops-shell" aria-label="회원권 업무 화면">
      {!selectedMember ? (
        <article className="panel">
          <PanelHeader title="회원 선택 필요" />
          <PlaceholderCard>
            <p>회원권 업무는 선택된 회원 기준으로 동작합니다.</p>
            <p className="muted-text">먼저 회원 관리 탭에서 회원을 선택한 뒤 다시 돌아오세요.</p>
            <div className="form-actions">
              <button type="button" className="primary-button" onClick={onGoMembers}>
                회원 관리로 이동
              </button>
            </div>
          </PlaceholderCard>
        </article>
      ) : (
        <>
          <article className="panel">
            <PanelHeader
              title="선택 회원 요약"
              actions={
                <button type="button" className="secondary-button" onClick={onGoMembers}>
                  회원 정보 열기
                </button>
              }
            />
            <dl className="detail-grid">
              <div>
                <dt>회원 ID</dt>
                <dd>{selectedMember.memberId}</dd>
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
            </dl>
            <NoticeText compact>선택 회원 기준 회원권 업무를 아래 패널에서 처리할 수 있습니다.</NoticeText>
          </article>

          {children}
        </>
      )}
    </section>
  );
}
