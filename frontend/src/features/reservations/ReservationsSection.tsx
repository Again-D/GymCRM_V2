import type { ReactNode } from "react";
import { NoticeText } from "../../shared/ui/NoticeText";
import { PanelHeader } from "../../shared/ui/PanelHeader";
import { PlaceholderCard } from "../../shared/ui/PlaceholderCard";

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
  onGoMembers: () => void;
  children: ReactNode;
};

export function ReservationsSection({
  selectedMember,
  selectedMemberReservationsCount,
  reservableMembershipsCount,
  reservationPanelMessage,
  reservationPanelError,
  onGoMembers,
  children
}: ReservationsSectionProps) {
  return (
    <section className="membership-ops-shell" aria-label="예약 관리 화면">
      {!selectedMember ? (
        <article className="panel">
          <PanelHeader title="회원 선택 필요" />
          <PlaceholderCard>
            <p>예약 관리는 선택된 회원 기준으로 동작합니다.</p>
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
              title="예약 대상 회원"
              actions={
                <button type="button" className="secondary-button" onClick={onGoMembers}>
                  회원 변경
                </button>
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
