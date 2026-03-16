import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { formatDate } from "../../../shared/format";
import { usePagination } from "../../../shared/hooks/usePagination";
import { PaginationControls } from "../../../shared/ui/PaginationControls";
import { MembershipPeriodFilter } from "./MembershipPeriodFilter";
import { useMembershipDateFilter } from "../modules/useMembershipDateFilter";
import { useMembersQuery } from "../modules/useMembersQuery";
import { useSelectedMemberStore } from "../modules/SelectedMemberContext";

function operationalStatusClass(status: "정상" | "홀딩중" | "만료임박" | "만료" | "없음") {
  if (status === "정상") return "pill ok";
  if (status === "홀딩중") return "pill hold";
  if (status === "만료임박") return "pill warn";
  if (status === "만료") return "pill danger";
  return "pill muted";
}

const statusMap: Record<string, string> = {
  "정상": "NORMAL",
  "홀딩중": "HOLDING",
  "만료임박": "EXPIRING",
  "만료": "EXPIRED",
  "없음": "NONE"
};

export function MemberListSection() {
  const navigate = useNavigate();
  const { dateFilter, applyPreset, setDateFrom, setDateTo, reset } = useMembershipDateFilter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [membershipOperationalStatus, setMembershipOperationalStatus] = useState("");
  const { selectedMemberId, selectMember } = useSelectedMemberStore();
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
  }, []);

  async function goToMemberContext(path: "/memberships" | "/reservations", memberId: number) {
    const loaded = await selectMember(memberId);
    if (loaded) {
      navigate(path);
    }
  }

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
                <th>Name</th>
                <th>Contact</th>
                <th>Status</th>
                <th>Operation</th>
                <th>Expiry</th>
                <th>PT Rem.</th>
                <th>Joined</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
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
                  <tr key={member.memberId} className={member.memberId === selectedMemberId ? "is-selected-row" : undefined}>
                    <td><strong>{member.memberId}</strong></td>
                    <td>{member.memberName}</td>
                    <td className="text-muted">{member.phone}</td>
                    <td>
                      <span className={member.memberStatus === "ACTIVE" ? "pill ok" : "pill muted"}>{member.memberStatus}</span>
                    </td>
                    <td>
                      <span className={operationalStatusClass(member.membershipOperationalStatus)}>
                        {statusMap[member.membershipOperationalStatus] || member.membershipOperationalStatus}
                      </span>
                    </td>
                    <td>{formatDate(member.membershipExpiryDate)}</td>
                    <td><strong>{member.remainingPtCount != null && member.remainingPtCount > 0 ? member.remainingPtCount : "-"}</strong></td>
                    <td className="text-muted">{formatDate(member.joinDate)}</td>
                    <td>
                      <div className="ops-table-actions">
                        <button type="button" className="secondary-button ops-action-button" onClick={() => void selectMember(member.memberId)}>
                          선택
                        </button>
                        <button type="button" className="secondary-button ops-action-button" onClick={() => void goToMemberContext("/memberships", member.memberId)}>
                          회원권
                        </button>
                        <button type="button" className="secondary-button ops-action-button" onClick={() => void goToMemberContext("/reservations", member.memberId)}>
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
    </section>
  );
}
