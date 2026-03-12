import { useEffect, useState } from "react";

import { useDebouncedValue } from "../../shared/hooks/useDebouncedValue";
import { usePagination } from "../../shared/hooks/usePagination";
import { PaginationControls } from "../../shared/ui/PaginationControls";
import { useMembersQuery } from "../members/modules/useMembersQuery";
import { useSelectedMemberStore } from "../members/modules/SelectedMemberContext";

type MemberContextFallbackProps = {
  title: string;
  description: string;
  submitLabel: string;
};

export function MemberContextFallback({ title, description, submitLabel }: MemberContextFallbackProps) {
  const [keyword, setKeyword] = useState("");
  const debouncedKeyword = useDebouncedValue(keyword, 250);
  const { selectMember, selectedMemberLoading } = useSelectedMemberStore();
  const { members, membersLoading, membersQueryError, loadMembers } = useMembersQuery({
    getDefaultFilters: () => ({
      name: keyword,
      phone: keyword,
      membershipOperationalStatus: "",
      dateFrom: "",
      dateTo: ""
    })
  });

  const pagination = usePagination(members, {
    initialPageSize: 10,
    resetDeps: [keyword, members.length]
  });

  useEffect(() => {
    void loadMembers({ name: debouncedKeyword, phone: debouncedKeyword });
  }, [debouncedKeyword]);

  return (
    <article className="panel-card">
      <div className="panel-card-header">
        <div>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
      </div>

      <form
        className="context-fallback-toolbar"
        onSubmit={(event) => {
          event.preventDefault();
          void loadMembers({ name: keyword, phone: keyword });
        }}
      >
        <label>
          회원 검색
          <input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="예: 김민수, 010-1234" />
        </label>
        <div className="toolbar-actions">
          <button type="submit" className="primary-button" disabled={membersLoading}>
            {membersLoading ? "조회 중..." : "조회"}
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
              <th>회원권 상태</th>
              <th>액션</th>
            </tr>
          </thead>
          <tbody>
            {pagination.pagedItems.length === 0 ? (
              <tr>
                <td colSpan={5} className="empty-cell">
                  선택 가능한 회원이 없습니다.
                </td>
              </tr>
            ) : (
              pagination.pagedItems.map((member) => (
                <tr key={member.memberId}>
                  <td>{member.memberId}</td>
                  <td>{member.memberName}</td>
                  <td>{member.phone}</td>
                  <td>{member.membershipOperationalStatus}</td>
                  <td>
                    <button
                      type="button"
                      className="secondary-button"
                      disabled={selectedMemberLoading}
                      onClick={() => void selectMember(member.memberId)}
                    >
                      {submitLabel}
                    </button>
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
        pageSizeOptions={[10, 20]}
        totalItems={pagination.totalItems}
        startItemIndex={pagination.startItemIndex}
        endItemIndex={pagination.endItemIndex}
        onPageChange={pagination.setPage}
        onPageSizeChange={pagination.setPageSize}
      />
    </article>
  );
}
