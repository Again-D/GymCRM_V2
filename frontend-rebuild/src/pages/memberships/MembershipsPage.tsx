import { MemberContextFallback } from "../member-context/MemberContextFallback";
import { SelectedMemberContextBadge } from "../members/components/SelectedMemberContextBadge";
import { useSelectedMemberStore } from "../members/modules/SelectedMemberContext";

export default function MembershipsPage() {
  const { selectedMember } = useSelectedMemberStore();

  if (!selectedMember) {
    return (
      <MemberContextFallback
        title="회원권 업무 프로토타입"
        description="회원권 업무는 선택된 회원 기준으로 동작합니다. 이 화면에서 바로 회원을 선택해 다음 prototype slice를 이어갈 수 있습니다."
        submitLabel="이 회원으로 시작"
      />
    );
  }

  return (
    <section className="members-prototype-layout">
      <article className="panel-card">
        <div className="panel-card-header">
          <div>
            <h1>회원권 업무 프로토타입</h1>
            <p>selectedMember handoff는 members domain store를 통해 유지합니다.</p>
          </div>
        </div>

        <SelectedMemberContextBadge />

        <div className="placeholder-stack">
          <div className="placeholder-card">
            <h2>구매 / 홀딩 / 해제 / 환불</h2>
            <p>이 단계에서는 action surface 배치만 확인하고, 실제 mutation parity는 parity hardening에서 붙입니다.</p>
          </div>
          <div className="placeholder-card">
            <h2>다음 단계 목표</h2>
            <ul>
              <li>선택 회원 기준 memberships query 연결</li>
              <li>홀딩/해제/환불 상태 갱신 contract 복제</li>
              <li>invalid member-context fallback 유지</li>
            </ul>
          </div>
        </div>
      </article>
    </section>
  );
}
