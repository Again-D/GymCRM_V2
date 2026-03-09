import { useEffect, useState, type ReactNode } from "react";
import { NoticeText } from "../../shared/ui/NoticeText";
import { PanelHeader } from "../../shared/ui/PanelHeader";
import { WorkspaceMemberPicker, type WorkspaceMemberPickerRow } from "../../shared/ui/WorkspaceMemberPicker";

type SelectedMemberSummary = {
  memberId: number;
  memberName: string;
};

type ReservationsSectionProps = {
  selectedMember: SelectedMemberSummary | null;
  selectedMemberReservationsCount: number;
  reservableMembershipsCount: number;
  reservationPanelMessage: string | null;
  reservationPanelError: string | null;
  loadWorkspaceMembers: () => Promise<WorkspaceMemberPickerRow[]>;
  onSelectWorkspaceMember: (memberId: number) => Promise<boolean>;
  onGoMembers: () => void;
  children: ReactNode;
};

export function ReservationsSection({
  selectedMember,
  selectedMemberReservationsCount,
  reservableMembershipsCount,
  reservationPanelMessage,
  reservationPanelError,
  loadWorkspaceMembers,
  onSelectWorkspaceMember,
  onGoMembers,
  children
}: ReservationsSectionProps) {
  const [isPickerOpen, setIsPickerOpen] = useState(selectedMember == null);

  useEffect(() => {
    setIsPickerOpen(selectedMember == null);
  }, [selectedMember]);

  return (
    <section className="membership-ops-shell" aria-label="예약 관리 화면">
      {!selectedMember || isPickerOpen ? (
        <WorkspaceMemberPicker
          title={selectedMember ? "예약 대상 회원 변경" : "회원 선택 필요"}
          description={
            selectedMember
              ? "다른 회원으로 예약 대상을 바꿉니다. 선택을 완료하면 이 화면에서 바로 예약 업무를 이어갈 수 있습니다."
              : "예약 관리는 선택된 회원 기준으로 동작합니다. 이 화면에서 바로 회원을 검색하고 예약 업무를 시작할 수 있습니다."
          }
          queryPlaceholder="예: 김민수, 010-1234, 102"
          emptyMessage="검색 결과 회원이 없습니다."
          warningText={
            selectedMember
              ? "회원을 변경하면 입력 중인 예약 생성 폼과 관련 메시지가 초기화됩니다."
              : undefined
          }
          loadMembers={loadWorkspaceMembers}
          onSelectMember={onSelectWorkspaceMember}
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
              title="예약 대상 회원"
              actions={
                <div className="panel-header-actions">
                  <button type="button" className="secondary-button" onClick={() => setIsPickerOpen(true)}>
                    회원 변경
                  </button>
                  <button type="button" className="secondary-button" onClick={onGoMembers}>
                    회원 관리 열기
                  </button>
                </div>
              }
            />
            <dl className="detail-grid compact-detail-grid">
              <div>
                <dt>회원 ID</dt>
                <dd>{selectedMember.memberId}</dd>
              </div>
              <div>
                <dt>회원명</dt>
                <dd>{selectedMember.memberName}</dd>
              </div>
              <div>
                <dt>예약 수(세션)</dt>
                <dd>{selectedMemberReservationsCount}</dd>
              </div>
              <div>
                <dt>예약 가능 회원권</dt>
                <dd>{reservableMembershipsCount}</dd>
              </div>
            </dl>
            {reservationPanelMessage ? (
              <NoticeText tone="success" compact>
                {reservationPanelMessage}
              </NoticeText>
            ) : null}
            {reservationPanelError ? (
              <NoticeText tone="error" compact>
                {reservationPanelError}
              </NoticeText>
            ) : null}
          </article>

          {children}
        </>
      )}
    </section>
  );
}
