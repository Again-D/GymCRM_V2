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
    <section className="members-page-grid">
      <article className="panel-card">
        <header className="panel-card-header mb-md">
          <div>
            <h1 className="brand-title" style={{ fontSize: '1.5rem' }}>Member Directory</h1>
            <p className="text-muted text-sm">Manage member records and operational statuses across the facility.</p>
          </div>
        </header>

        <form
          className="members-filter-grid"
          onSubmit={(event) => {
            event.preventDefault();
            void loadMembers();
          }}
        >
          <label>
            <span className="text-sm" style={{ fontWeight: 600 }}>Member Name</span>
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Search name..." />
          </label>
          <label>
            <span className="text-sm" style={{ fontWeight: 600 }}>Contact Number</span>
            <input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="010-..." />
          </label>
          <label>
            <span className="text-sm" style={{ fontWeight: 600 }}>Membership Status</span>
            <select value={membershipOperationalStatus} onChange={(event) => setMembershipOperationalStatus(event.target.value)}>
              <option value="">ALL STATUSES</option>
              <option value="정상">NORMAL</option>
              <option value="홀딩중">HOLDING</option>
              <option value="만료임박">EXPIRING</option>
              <option value="만료">EXPIRED</option>
              <option value="없음">NO MEMBERSHIP</option>
            </select>
          </label>
          <MembershipPeriodFilter
            value={dateFilter}
            onPresetChange={applyPreset}
            onDateFromChange={setDateFrom}
            onDateToChange={setDateTo}
          />
          <div className="toolbar-actions full-span mt-sm">
            <button type="submit" className="primary-button" disabled={membersLoading} style={{ minWidth: '100px' }}>
              {membersLoading ? "Loading..." : "Filter Results"}
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
              Reset Filters
            </button>
          </div>
        </form>

        {membersQueryError ? <div className="pill danger mt-md">{membersQueryError}</div> : null}

        <div className="table-shell mt-lg">
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
                  <td colSpan={9} className="empty-cell" style={{ padding: '40px' }}>
                    No members found matching the criteria.
                  </td>
                </tr>
              ) : (
                pagination.pagedItems.map((member) => (
                  <tr key={member.memberId} className={member.memberId === selectedMemberId ? "is-selected-row" : undefined}>
                    <td style={{ fontWeight: 600 }}>{member.memberId}</td>
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
                    <td style={{ fontWeight: 600 }}>{member.remainingPtCount != null && member.remainingPtCount > 0 ? member.remainingPtCount : "-"}</td>
                    <td className="text-muted">{formatDate(member.joinDate)}</td>
                    <td>
                      <div className="row-actions" style={{ justifyContent: 'flex-end' }}>
                        <button type="button" className="secondary-button" style={{ padding: '6px 10px', fontSize: '13px' }} onClick={() => void selectMember(member.memberId)}>
                          Select
                        </button>
                        <button type="button" className="secondary-button" style={{ padding: '6px 10px', fontSize: '13px' }} onClick={() => void goToMemberContext("/memberships", member.memberId)}>
                          Memberships
                        </button>
                        <button type="button" className="secondary-button" style={{ padding: '6px 10px', fontSize: '13px' }} onClick={() => void goToMemberContext("/reservations", member.memberId)}>
                          Reservations
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

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
