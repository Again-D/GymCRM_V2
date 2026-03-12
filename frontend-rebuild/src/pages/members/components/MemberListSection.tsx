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
    <section className="members-page-grid">
      <article className="panel-card">
        <div className="panel-card-header">
          <div>
            <h1>회원 관리 프로토타입</h1>
            <p>page-first 구조에서 members 목록, 필터, selectedMember ownership을 먼저 검증합니다.</p>
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
            이름 검색
            <input value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <label>
            연락처 검색
            <input value={phone} onChange={(event) => setPhone(event.target.value)} />
          </label>
          <label>
            회원권 상태
            <select value={membershipOperationalStatus} onChange={(event) => setMembershipOperationalStatus(event.target.value)}>
              <option value="">전체</option>
              <option value="정상">정상</option>
              <option value="홀딩중">홀딩중</option>
              <option value="만료임박">만료임박</option>
              <option value="만료">만료</option>
              <option value="없음">없음</option>
            </select>
          </label>
          <MembershipPeriodFilter
            value={dateFilter}
            onPresetChange={applyPreset}
            onDateFromChange={setDateFrom}
            onDateToChange={setDateTo}
          />
          <div className="toolbar-actions">
            <button type="submit" className="primary-button" disabled={membersLoading}>
              {membersLoading ? "조회 중..." : "조회"}
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

        {membersQueryError ? <p className="error-text">{membersQueryError}</p> : null}

        <div className="table-shell">
          <table className="members-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>이름</th>
                <th>연락처</th>
                <th>회원 상태</th>
                <th>회원권 상태</th>
                <th>만료일</th>
                <th>남은 PT</th>
                <th>가입일</th>
                <th>액션</th>
              </tr>
            </thead>
            <tbody>
              {pagination.pagedItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="empty-cell">
                    조회된 회원이 없습니다.
                  </td>
                </tr>
              ) : (
                pagination.pagedItems.map((member) => (
                  <tr key={member.memberId} className={member.memberId === selectedMemberId ? "is-selected-row" : undefined}>
                    <td>{member.memberId}</td>
                    <td>{member.memberName}</td>
                    <td>{member.phone}</td>
                    <td>
                      <span className={member.memberStatus === "ACTIVE" ? "pill ok" : "pill muted"}>{member.memberStatus}</span>
                    </td>
                    <td>
                      <span className={operationalStatusClass(member.membershipOperationalStatus)}>{member.membershipOperationalStatus}</span>
                    </td>
                    <td>{formatDate(member.membershipExpiryDate)}</td>
                    <td>{member.remainingPtCount != null && member.remainingPtCount > 0 ? member.remainingPtCount : "-"}</td>
                    <td>{formatDate(member.joinDate)}</td>
                    <td>
                      <div className="row-actions">
                        <button type="button" className="secondary-button" onClick={() => void selectMember(member.memberId)}>
                          선택
                        </button>
                        <button type="button" className="secondary-button" onClick={() => void goToMemberContext("/memberships", member.memberId)}>
                          회원권 업무
                        </button>
                        <button type="button" className="secondary-button" onClick={() => void goToMemberContext("/reservations", member.memberId)}>
                          예약 관리
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

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
      </article>
    </section>
  );
}
