import { useEffect, useState, type ReactNode } from "react";
import { useSelectedMemberContext } from "../members/useSelectedMemberOwner";
import { NoticeText } from "../../shared/ui/NoticeText";
import { PanelHeader } from "../../shared/ui/PanelHeader";
import { WorkspaceMemberPicker, type WorkspaceMemberPickerRow } from "../../shared/ui/WorkspaceMemberPicker";

type MembershipsSectionProps = {
  loadWorkspaceMembers: () => Promise<WorkspaceMemberPickerRow[]>;
  onGoMembers: () => void;
  children: ReactNode;
};

export function MembershipsSection({
  loadWorkspaceMembers,
  onGoMembers,
  children
}: MembershipsSectionProps) {
  const { selectedMember, selectMember } = useSelectedMemberContext();
  const [isPickerOpen, setIsPickerOpen] = useState(selectedMember == null);

  useEffect(() => {
    setIsPickerOpen(selectedMember == null);
  }, [selectedMember]);

  return (
    <section className="membership-ops-shell" aria-label="회원권 업무 화면">
      {!selectedMember || isPickerOpen ? (
        <WorkspaceMemberPicker
          title={selectedMember ? "회원 변경" : "회원 선택 필요"}
          description={
            selectedMember
              ? "다른 회원으로 업무 대상을 바꿉니다. 선택을 완료하면 이 워크스페이스에서 바로 회원권 업무를 이어갈 수 있습니다."
              : "회원권 업무는 선택된 회원 기준으로 동작합니다. 이 화면에서 바로 회원을 찾아 시작할 수 있습니다."
          }
          queryPlaceholder="예: 김민수, 010-1234, 102"
          emptyMessage="검색 결과 회원이 없습니다."
          warningText={
            selectedMember
              ? "회원을 변경하면 입력 중인 회원권 구매 폼과 관련 미리보기/메시지가 초기화됩니다."
              : undefined
          }
          loadMembers={loadWorkspaceMembers}
          onSelectMember={async (memberId) => Boolean(await selectMember(memberId))}
          onSelected={() => setIsPickerOpen(false)}
          submitLabel={selectedMember ? "이 회원으로 변경" : "이 회원으로 시작"}
          actions={
            <button type="button" className="secondary-button" onClick={onGoMembers}>
              회원 관리 열기
            </button>
          }
        />
      ) : (
        <>
          <article className="panel">
            <PanelHeader
              title="선택 회원 요약"
              actions={
                <div className="panel-header-actions">
                  <button type="button" className="secondary-button" onClick={() => setIsPickerOpen(true)}>
                    회원 변경
                  </button>
                  <button type="button" className="secondary-button" onClick={onGoMembers}>
                    회원 정보 열기
                  </button>
                </div>
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
