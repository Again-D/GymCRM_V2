import { useEffect } from "react";

import { MemberContextFallback } from "../member-context/MemberContextFallback";
import { useSelectedMemberMembershipsQuery } from "../member-context/modules/useSelectedMemberMembershipsQuery";
import { SelectedMemberContextBadge } from "../members/components/SelectedMemberContextBadge";
import { useSelectedMemberStore } from "../members/modules/SelectedMemberContext";

export default function MembershipsPage() {
  const { selectedMember, selectedMemberId } = useSelectedMemberStore();
  const {
    selectedMemberMemberships,
    selectedMemberMembershipsLoading,
    selectedMemberMembershipsError,
    loadSelectedMemberMemberships,
    resetSelectedMemberMembershipsQuery
  } = useSelectedMemberMembershipsQuery();

  useEffect(() => {
    if (selectedMemberId == null) {
      resetSelectedMemberMembershipsQuery();
      return;
    }
    void loadSelectedMemberMemberships(selectedMemberId);
  }, [selectedMemberId]);

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

        {selectedMemberMembershipsError ? <p className="error-text">{selectedMemberMembershipsError}</p> : null}

        <div className="placeholder-stack">
          <div className="placeholder-card">
            <h2>선택 회원 회원권 목록</h2>
            <p>members domain owner는 회원 컨텍스트만 소유하고, 회원권 목록은 query module이 별도로 로드합니다.</p>
            {selectedMemberMembershipsLoading ? (
              <p>회원권 목록을 불러오는 중...</p>
            ) : selectedMemberMemberships.length === 0 ? (
              <p>선택 회원의 회원권이 없습니다.</p>
            ) : (
              <ul>
                {selectedMemberMemberships.map((membership) => (
                  <li key={membership.membershipId}>
                    #{membership.membershipId} · {membership.productNameSnapshot} · {membership.membershipStatus}
                    {membership.productTypeSnapshot === "COUNT"
                      ? ` · 잔여 ${membership.remainingCount ?? 0}`
                      : membership.endDate
                        ? ` · 만료 ${membership.endDate}`
                        : ""}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="placeholder-card">
            <h2>다음 parity 대상</h2>
            <ul>
              <li>purchase / hold / resume / refund mutation</li>
              <li>summary refresh and stale-response guard around mutations</li>
              <li>invalid member-context fallback 유지</li>
            </ul>
          </div>
        </div>
      </article>
    </section>
  );
}
